import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { decadeOf, scoreMovie, tallyDecadeVotes, tallyGenreVotes } from '../lib/scoring';
import { discoverMovies, Movie } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

export default function ResultsScreen() {
  const { persons } = useSessionStore();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const genreVotes = tallyGenreVotes(persons);
    const decadeVotes = tallyDecadeVotes(persons);
    const genreIds = Object.keys(genreVotes).map(Number);
    const selectedDecades = Object.keys(decadeVotes);

    discoverMovies(genreIds)
      .then((movies) => {
        const candidates = movies.filter(
          (m) => m.release_date && selectedDecades.includes(decadeOf(m.release_date))
        );
        const pool = candidates.length > 0 ? candidates : movies;

        const ranked = pool
          .map((m) => ({ movie: m, score: scoreMovie(m, genreVotes, decadeVotes) }))
          .sort((a, b) => b.score - a.score || b.movie.vote_average - a.movie.vote_average);

        setMovie(ranked[0]?.movie ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1A1A1A" /></View>;

  if (error || !movie) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Kunne ikke finde en film der matcher. Prøv andre valg.</Text>
        <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
          <Text style={styles.restartButtonText}>Start forfra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {movie.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }} style={styles.poster} />
      )}
      <Text style={styles.title}>{movie.title}</Text>
      <Text style={styles.meta}>{movie.release_date?.slice(0, 4)} · ⭐ {movie.vote_average.toFixed(1)}</Text>
      <Text style={styles.overview}>{movie.overview}</Text>

      <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
        <Text style={styles.restartButtonText}>Find en anden gang</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#E8B923', alignItems: 'center', padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  poster: { width: 220, height: 330, borderRadius: 16, marginBottom: 20 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 8 },
  meta: { fontSize: 16, marginBottom: 16 },
  overview: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  restartButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 40 },
  restartButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});