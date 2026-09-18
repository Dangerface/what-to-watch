import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { EditActionButton } from '../components/EditActionButton';
import { EditToggleButton } from '../components/EditToggleButton';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { MovieListRow } from '../components/MovieListRow';
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

function WatchLaterRow({
  entry,
  editMode,
  onRemove,
}: {
  entry: WatchLaterEntry;
  editMode: boolean;
  onRemove: (id: number) => void;
}) {
  const [providers, setProviders] = useState<WatchProvider[]>([]);

  useEffect(() => {
    fetchMovieProviders(entry.movie.id, null).then(setProviders);
  }, [entry.movie.id]);

  return (
    <View style={styles.rowOuter}>
      <View style={styles.rowFlex}>
        <MovieListRow
          movie={entry.movie}
          extra={
            <>
              <View style={styles.providerRow}>
                {providers.slice(0, 5).map(
                  (p) =>
                    p.logo_path && (
                      <Image key={p.provider_id} source={{ uri: `https://image.tmdb.org/t/p/w45${p.logo_path}` }} style={styles.providerIcon} />
                    )
                )}
              </View>
              <Text style={styles.rowDate}>Tilføjet {formatDate(entry.addedAt)}</Text>
            </>
          }
        />
      </View>
      <EditActionButton visible={editMode}>
        <Pressable onPress={() => onRemove(entry.movie.id)} hitSlop={8}>
          <Feather name="x" size={28} color="#1A1A1A" />
        </Pressable>
      </EditActionButton>
    </View>
  );
}

export default function WatchlistScreen() {
  const [entries, setEntries] = useState<WatchLaterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(() => {
    getWatchLater()
      .then((list) => setEntries([...list].reverse()))
      .finally(() => setLoading(false));
  }, []);

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
      <EditToggleButton editMode={editMode} onPress={() => setEditMode((prev) => !prev)} />
      <Text style={styles.title}>Watch List</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.movie.id)}
        renderItem={({ item }) => <WatchLaterRow entry={item} editMode={editMode} onRemove={handleRemove} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', paddingTop: 110, marginBottom: 16, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  emptyText: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 15, textAlign: 'center', color: '#1A1A1A' },
  listContent: { paddingHorizontal: 16, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  rowOuter: { flexDirection: 'row', alignItems: 'center' },
  rowFlex: { flex: 1 },
  providerRow: { flexDirection: 'row', gap: 4 },
  providerIcon: { width: 18, height: 18, borderRadius: 4 },
  rowDate: { fontSize: 11, color: '#666' },
});