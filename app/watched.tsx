import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EditActionButton } from '../components/EditActionButton';
import { EditToggleButton } from '../components/EditToggleButton';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { MovieListRow } from '../components/MovieListRow';
import { getWatched, unmarkWatched, WatchedEntry } from '../lib/storage';

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

function WatchedRow({ entry, editMode, onRemove }: { entry: WatchedEntry; editMode: boolean; onRemove: (id: number) => void }) {
  return (
    <View style={styles.rowOuter}>
      <View style={styles.rowFlex}>
        <MovieListRow
          movie={entry.movie}
          extra={<Text style={styles.ratingText}>{entry.rating != null ? `${(entry.rating / 2).toFixed(1).replace('.0', '')}/5 ⭐` : 'Ikke bedømt'}</Text>}
        />
      </View>
      <EditActionButton visible={editMode}>
        <Pressable onPress={() => onRemove(entry.movie.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={28} color="#1A1A1A" />
        </Pressable>
      </EditActionButton>
    </View>
  );
}

export default function WatchedScreen() {
  const [entries, setEntries] = useState<WatchedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(() => {
    getWatched().then((list) => setEntries([...list].reverse())).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = async (movieId: number) => {
    await unmarkWatched(movieId);
    setEntries((prev) => prev.filter((e) => e.movie.id !== movieId));
  };

  if (!loading && entries.length === 0) {
    return <View style={styles.center}><BackButton /><Text style={styles.emptyText}>Ingen sete film endnu.</Text></View>;
  }

  return (
    <View style={styles.root}>
      <BackButton />
      <EditToggleButton editMode={editMode} onPress={() => setEditMode((prev) => !prev)} />
      <Text style={styles.title}>Watched</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.movie.id)}
        renderItem={({ item }) => <WatchedRow entry={item} editMode={editMode} onRemove={handleRemove} />}
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
  emptyText: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  rowOuter: { flexDirection: 'row', alignItems: 'center' },
  rowFlex: { flex: 1 },
  ratingText: { fontSize: 12, color: '#1A1A1A', fontWeight: '600' },
});