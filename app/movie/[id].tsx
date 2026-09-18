import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MovieDetailCard } from '../../components/MovieDetailCard';
import { getMovieJail, getWatched, getWatchLater, releaseFromSoftJail } from '../../lib/storage';
import { fetchMovieDetails, Movie } from '../../lib/tmdb';

const { width } = Dimensions.get('window');

type Source = 'watchlist' | 'jail' | 'watched' | undefined;

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

async function loadSourceList(source: Source): Promise<Movie[]> {
  if (source === 'watchlist') return (await getWatchLater()).reverse().map((e) => e.movie);
  if (source === 'jail') return (await getMovieJail()).reverse();
  if (source === 'watched') return (await getWatched()).reverse().map((e) => e.movie);
  return [];
}

export default function MovieDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: Source }>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (source) {
          const list = await loadSourceList(source);
          const index = list.findIndex((m) => m.id === Number(id));
          if (index === -1) {
            const single = await fetchMovieDetails(Number(id));
            setMovies([single]);
            setStartIndex(0);
          } else {
            setMovies(list);
            setStartIndex(index);
          }
        } else {
          const single = await fetchMovieDetails(Number(id));
          setMovies([single]);
          setStartIndex(0);
        }
        releaseFromSoftJail(Number(id));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, source]);

  if (loading) return <View style={styles.center}><BackButton /><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  if (error || movies.length === 0) return <View style={styles.center}><BackButton /><Text style={styles.errorText}>Kunne ikke hente film.</Text></View>;

  return (
    <View style={styles.root}>
      <BackButton />
      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => <MovieDetailCard movie={item} width={width} onJailed={() => router.back()} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center' },
});