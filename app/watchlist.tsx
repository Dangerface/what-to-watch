import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { EditActionButton } from '../components/EditActionButton';
import { EditToggleButton } from '../components/EditToggleButton';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { MovieListRow } from '../components/MovieListRow';
import { ScreenBackground } from '../components/ScreenBackground';
import { getWatchLater, removeFromWatchLater, WatchLaterEntry } from '../lib/storage';
import { colors, spacing, typography } from '../lib/theme';
import { fetchMovieProviders, WatchProvider } from '../lib/tmdb';

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
          source="watchlist"
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
          <Feather name="x" size={28} color={colors.ink} />
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
        <ScreenBackground />
        <BackButton />
        <Text style={styles.emptyText}>Ingen film gemt endnu.</Text>
        <Text style={styles.emptySubtext}>Tryk "+ Se senere" på en film for at gemme den her.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground />
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
  root: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, textAlign: 'center', paddingTop: 110, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.xxl },
  emptyText: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm },
  emptySubtext: { ...typography.body, textAlign: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  rowOuter: { flexDirection: 'row', alignItems: 'center' },
  rowFlex: { flex: 1 },
  providerRow: { flexDirection: 'row', gap: 4 },
  providerIcon: { width: 18, height: 18, borderRadius: 4 },
  rowDate: { fontSize: 11, color: colors.textSecondary }, // enkeltstående farve, ikke i theme endnu
});