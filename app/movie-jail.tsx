import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { getMovieJail, releaseFromMovieJail } from '../lib/storage';
import { Movie } from '../lib/tmdb';

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

function JailRow({ movie, onRelease }: { movie: Movie; onRelease: (id: number) => void }) {
  return (
    <View style={styles.row}>
      {movie.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w154${movie.poster_path}` }} style={styles.poster} />
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={2}>{movie.title}</Text>
        <Text style={styles.rowRating}>⭐ {movie.vote_average.toFixed(1)}</Text>
      </View>
      <Pressable style={styles.releaseButton} onPress={() => onRelease(movie.id)}>
        <Text style={styles.releaseButtonText}>Frigiv</Text>
      </Pressable>
    </View>
  );
}

export default function MovieJailScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getMovieJail()
      .then((list) => setMovies([...list].reverse())) // senest fængslede øverst
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRelease = async (movieId: number) => {
    await releaseFromMovieJail(movieId);
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
  };

  if (!loading && movies.length === 0) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.emptyText}>Ingen film i Movie Jail.</Text>
        <Text style={styles.emptySubtext}>Tryk "🚫 Aldrig igen" på en film for at udelukke den fra fremtidige søgninger.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BackButton />
      <Text style={styles.header}>Movie Jail</Text>
      <Text style={styles.subheader}>Disse film vises aldrig i søgeresultater</Text>
      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <JailRow movie={item} onRelease={handleRelease} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  header: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginTop: 60, marginBottom: 4 },
  subheader: { fontSize: 13, textAlign: 'center', color: '#1A1A1A', marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  emptyText: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 15, textAlign: 'center', color: '#1A1A1A' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  poster: { width: 58, height: 80, borderRadius: 8, marginRight: 12 },
  rowInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rowRating: { fontSize: 13, color: '#1A1A1A' },
  releaseButton: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  releaseButtonText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
});