import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Movie } from '../lib/tmdb';

type Props = {
  movie: Movie;
  extra?: ReactNode;
  action?: ReactNode;
  source?: 'watchlist' | 'jail' | 'watched';
  onBeforeNavigate?: () => void;
  onPress?: () => void; // when set, completely replaces the default router navigation
};

export function MovieListRow({ movie, extra, action, source, onBeforeNavigate, onPress }: Props) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    onBeforeNavigate?.();
    router.push({
      pathname: '/movie/[id]',
      params: { id: String(movie.id), ...(source ? { source } : {}) },
    } as any);
  };

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      {movie.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w154${movie.poster_path}` }} style={styles.poster} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)}</Text>
        {extra}
      </View>
      {action}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' },
  poster: { width: 58, height: 80, borderRadius: radius.sm, marginRight: spacing.md },
  info: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  title: { ...typography.body, fontWeight: '700' },
  rating: { ...typography.caption },
  chevron: { marginLeft: 6 },
});