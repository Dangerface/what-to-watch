import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { EditActionButton } from '../components/EditActionButton';
import { EditToggleButton } from '../components/EditToggleButton';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { MovieListRow } from '../components/MovieListRow';
import { ScreenBackground } from '../components/ScreenBackground';
import { getWatched, unmarkWatched, WatchedEntry } from '../lib/storage';
import { colors, spacing, typography } from '../lib/theme';

function WatchedRow({ entry, editMode, onRemove }: { entry: WatchedEntry; editMode: boolean; onRemove: (id: number) => void }) {
  return (
    <View style={styles.rowOuter}>
      <View style={styles.rowFlex}>
        <MovieListRow
          movie={entry.movie}
          source="watched"
          extra={<Text style={styles.ratingText}>{entry.rating != null ? `${(entry.rating / 2).toFixed(1).replace('.0', '')}/5 ⭐` : 'Ikke bedømt'}</Text>}
        />
      </View>
      <EditActionButton visible={editMode}>
        <Pressable onPress={() => onRemove(entry.movie.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={28} color={colors.ink} />
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
      <ScreenBackground />
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
  root: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, textAlign: 'center', paddingTop: 110, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.xxl },
  emptyText: { ...typography.h3, textAlign: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  rowOuter: { flexDirection: 'row', alignItems: 'center' },
  rowFlex: { flex: 1 },
  ratingText: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
});