import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { decadeOf, scoreMovie, tallyDecadeVotes, tallyGenreVotes } from '../lib/scoring';
import { discoverMovies, Movie } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

const { width } = Dimensions.get('window');

type ScoredMovie = { movie: Movie; score: number };

function rankMovies(items: ScoredMovie[]) {
  return [...items].sort((a, b) => b.score - a.score || b.movie.vote_average - a.movie.vote_average);
}

export default function ResultsScreen() {
  const { persons } = useSessionStore();
  const [ranked, setRanked] = useState<ScoredMovie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const genreVotes = useRef(tallyGenreVotes(persons)).current;
  const decadeVotes = useRef(tallyDecadeVotes(persons)).current;
  const selectedDecades = useRef(Object.keys(decadeVotes)).current;
  const genreIds = useRef(Object.keys(genreVotes).map(Number)).current;

  const fetchAndScore = async (pageToLoad: number) => {
    const movies = await discoverMovies(genreIds, pageToLoad);
    const filtered = movies.filter((m) => m.release_date && selectedDecades.includes(decadeOf(m.release_date)));
    const pool = filtered.length > 0 ? filtered : movies;
    return pool.map((m) => ({ movie: m, score: scoreMovie(m, genreVotes, decadeVotes) }));
  };

  useEffect(() => {
    fetchAndScore(1)
      .then((scored) => setRanked(rankMovies(scored)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleEndReached = async () => {
    if (loadingMore || page >= 500) return; // TMDb's hårde grænse, rammes reelt aldrig
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const scored = await fetchAndScore(nextPage);
      setRanked((prev) => rankMovies([...prev, ...scored]));
      setPage(nextPage);
    } catch {
      // stille fejl — brugeren har stadig film at swipe imellem
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1A1A1A" /></View>;

  if (error || ranked.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Kunne ikke finde film der matcher. Prøv andre valg.</Text>
        <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
          <Text style={styles.restartButtonText}>Forfra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={ranked}
      keyExtractor={(item) => String(item.movie.id)}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onEndReachedThreshold={0.5}
      onEndReached={handleEndReached}
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
          <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
            <Text style={styles.restartButtonText}>Forfra</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#E8B923' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  poster: { width: 220, height: 330, borderRadius: 16, marginBottom: 20 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 8 },
  meta: { fontSize: 16, marginBottom: 16 },
  overview: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  restartButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 40 },
  restartButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});