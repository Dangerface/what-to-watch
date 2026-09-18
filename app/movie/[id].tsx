import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { MovieDetailCard } from '../../components/MovieDetailCard';
import { releaseFromSoftJail } from '../../lib/storage';
import { fetchMovieDetails, Movie } from '../../lib/tmdb';

const { width } = Dimensions.get('window');

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMovieDetails(Number(id))
      .then((m) => {
        setMovie(m);
        releaseFromSoftJail(m.id);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><BackButton /><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  if (error || !movie) return <View style={styles.center}><BackButton /><Text style={styles.errorText}>Kunne ikke hente film.</Text></View>;

  return (
    <View style={styles.root}>
      <BackButton />
      <MovieDetailCard movie={movie} width={width} onJailed={() => router.back()} />
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