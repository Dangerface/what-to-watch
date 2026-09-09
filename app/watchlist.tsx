import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { getWatchLater, removeFromWatchLater, WatchLaterEntry } from '../lib/storage';
import { fetchMovieProviders, WatchProvider } from '../lib/tmdb';

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function WatchLaterRow({ entry, onRemove }: { entry: WatchLaterEntry; onRemove: (id: number) => void }) {
  const [providers, setProviders] = useState<WatchProvider[]>([]);

  useEffect(() => {
    // sourceType: null → viser alle tilgængelige tjenester (flatrate + leje + køb), uafhængigt af aktuel søgning
    fetchMovieProviders(entry.movie.id, null).then(setProviders);
  }, [entry.movie.id]);

  return (
    <View style={styles.row}>
      {entry.movie.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w154${entry.movie.poster_path}` }} style={styles.poster} />
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={2}>{entry.movie.title}</Text>
        <Text style={styles.rowRating}>⭐ {entry.movie.vote_average.toFixed(1)}</Text>
        <View style={styles.providerRow}>
          {providers.slice(0, 5).map(
            (p) =>
              p.logo_path && (
                <Image key={p.provider_id} source={{ uri: `https://image.tmdb.org/t/p/w45${p.logo_path}` }} style={styles.providerIcon} />
              )
          )}
        </View>
        <Text style={styles.rowDate}>Tilføjet {formatDate(entry.addedAt)}</Text>
      </View>
      <Pressable style={styles.removeButton} onPress={() => onRemove(entry.movie.id)} hitSlop={10}>
        <Text style={styles.removeButtonText}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function WatchlistScreen() {
  const [entries, setEntries] = useState<WatchLaterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getWatchLater()
      .then((list) => setEntries([...list].reverse())) // nyeste tilføjet øverst
      .finally(() => setLoading(false));
  }, []);

  // Genindlæser hver gang skærmen får fokus, ikke kun ved første besøg —
  // vigtigt fordi film typisk gemmes fra en anden skærm (resultat/more-like-this).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRemove = async (movieId: number) => {
    await removeFromWatchLater(movieId);
    setEntries((prev) => prev.filter((e) => e.movie.id !== movieId));
  };

  if (!loading && entries.length === 0) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.emptyText}>Ingen film gemt endnu.</Text>
        <Text style={styles.emptySubtext}>Tryk "+ Se senere" på en film for at gemme den her.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BackButton />
      <Text style={styles.header}>Watch List</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.movie.id)}
        renderItem={({ item }) => <WatchLaterRow entry={item} onRemove={handleRemove} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  header: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginTop: 60, marginBottom: 16 },
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
  providerRow: { flexDirection: 'row', gap: 4 },
  providerIcon: { width: 18, height: 18, borderRadius: 4 },
  rowDate: { fontSize: 11, color: '#666' },
  removeButton: { padding: 8, marginLeft: 6 },
  removeButtonText: { fontSize: 16, color: '#1A1A1A', fontWeight: 'bold' },
});