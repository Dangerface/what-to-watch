import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RankedMovie, rankMovies } from '../lib/scoring';
import { DiscoverFilters, Movie } from '../lib/tmdb';
import { getMoviesForNoVibe, getMoviesForVibe } from '../lib/vibes';
import { useSessionStore } from '../store/session';

const { width } = Dimensions.get('window');

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

export default function ResultsScreen() {
  const { genreIds, maxRuntimeMinutes, familyFriendly, providerIds, sourceType, vibes } = useSessionStore();
  const [ranked, setRanked] = useState<RankedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const filters: DiscoverFilters = { genreIds, maxRuntimeMinutes, familyFriendly, providerIds, sourceType };

    (async () => {
      try {
        let movies: Movie[];
        if (vibes.length === 0) {
          movies = await getMoviesForNoVibe(filters);
        } else {
          const perVibe = await Promise.all(vibes.map((v) => getMoviesForVibe(v, filters)));
          const seen = new Set<number>();
          movies = perVibe.flat().filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
        }
        setRanked(rankMovies(movies, genreIds));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <BackButton />
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.errorText}>Der gik noget galt undervejs. Prøv igen.</Text>
        <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
          <Text style={styles.restartButtonText}>Forfra</Text>
        </Pressable>
      </View>
    );
  }

  if (ranked.length === 0) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.errorText}>
          Der er ikke flere resultater på din søgning. Hvis du ønsker flere forslag, så prøv at gøre din søgning bredere.
        </Text>
        <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
          <Text style={styles.restartButtonText}>Forfra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BackButton />
      <FlatList
        data={ranked}
        keyExtractor={(item) => String(item.movie.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.card, { width }]}>
            {item.movie.poster_path && (
              <Image source={{ uri: `https://image.tmdb.org/t/p/w500${item.movie.poster_path}` }} style={styles.poster} />
            )}
            <Text style={styles.title}>{item.movie.title}</Text>
            <Text style={styles.meta}>{item.movie.release_date?.slice(0, 4)} · ⭐ {item.movie.vote_average.toFixed(1)}</Text>
            <Text style={styles.overview} numberOfLines={5}>{item.movie.overview}</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={[styles.card, { width, justifyContent: 'center' }]}>
            <Text style={styles.endOfListText}>
              Ikke flere film på denne søgning. Prøv en bredere søgning for flere forslag.
            </Text>
            <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
              <Text style={styles.restartButtonText}>Forfra</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  card: { alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#E8B923' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  endOfListText: { fontSize: 15, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20, color: '#1A1A1A' },
  poster: { width: 220, height: 330, borderRadius: 16, marginBottom: 20 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 8 },
  meta: { fontSize: 16, marginBottom: 16 },
  overview: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  restartButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 40 },
  restartButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});