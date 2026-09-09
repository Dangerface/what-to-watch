import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { isInWatchLater, sendToMovieJail, toggleWatchLater } from '../lib/storage';
import { fetchMovieProviders, Movie, WatchProvider } from '../lib/tmdb';
import { SourceType } from '../store/session';

type Props = {
  movie: Movie;
  width: number;
  sourceType: SourceType | null;
  onJailed?: (movieId: number) => void;
};

export function MovieCard({ movie, width, sourceType, onJailed }: Props) {
  const [saved, setSaved] = useState(false);
  const [providers, setProviders] = useState<WatchProvider[]>([]);

  useEffect(() => {
    isInWatchLater(movie.id).then(setSaved);
    fetchMovieProviders(movie.id, sourceType).then(setProviders);
  }, [movie.id]);

  const handleToggleSave = async () => {
    const newState = await toggleWatchLater(movie);
    setSaved(newState);
  };

  const handleJail = async () => {
    await sendToMovieJail(movie);
    onJailed?.(movie.id);
  };

  const handleMoreLikeThis = () => {
    router.push({ pathname: '/more-like-this', params: { movieId: String(movie.id), title: movie.title } });
  };

  return (
    <View style={[styles.card, { width }]}>
      {movie.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }} style={styles.poster} />
      )}
      <Text style={styles.title}>{movie.title}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{movie.release_date?.slice(0, 4)} · ⭐ {movie.vote_average.toFixed(1)}</Text>
        {providers.slice(0, 4).map(
          (p) =>
            p.logo_path && (
              <Image key={p.provider_id} source={{ uri: `https://image.tmdb.org/t/p/w45${p.logo_path}` }} style={styles.providerIcon} />
            )
        )}
      </View>

      <Text style={styles.overview} numberOfLines={4}>{movie.overview}</Text>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.iconButton, saved && styles.iconButtonActive]} onPress={handleToggleSave}>
          <Text style={[styles.iconButtonText, saved && styles.iconButtonTextActive]}>{saved ? '✓ Gemt' : '+ Se senere'}</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={handleMoreLikeThis}>
          <Text style={styles.iconButtonText}>Flere som denne</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={handleJail}>
          <Text style={styles.iconButtonText}>🚫 Aldrig igen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#E8B923' },
  poster: { width: 220, height: 330, borderRadius: 16, marginBottom: 20 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  meta: { fontSize: 16 },
  providerIcon: { width: 22, height: 22, borderRadius: 5 },
  overview: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12, marginBottom: 20 },
  buttonRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  iconButton: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  iconButtonActive: { backgroundColor: '#1A1A1A' },
  iconButtonText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  iconButtonTextActive: { color: '#E8B923' },
});