import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Movie } from '../lib/tmdb';

type Props = {
  movie: Movie;
  extra?: ReactNode; // ekstra indhold under rating, fx udbyder-ikoner/dato
  action?: ReactNode; // en selvstændig tryk-knap, fx fjern/frigiv — egen tryk-zone, adskilt fra selve rækken
};

export function MovieListRow({ movie, extra, action }: Props) {
  const handlePress = () => {
    router.push({ pathname: '/movie/[id]', params: { id: String(movie.id) } } as any);
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
      <Ionicons name="chevron-forward" size={20} color="#8A8A8A" style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 8, marginBottom: 8, alignItems: 'center' },
  poster: { width: 58, height: 80, borderRadius: 8, marginRight: 12 },
  info: { flex: 1, justifyContent: 'center', gap: 4 },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rating: { fontSize: 13, color: '#1A1A1A' },
  chevron: { marginLeft: 6 },
});