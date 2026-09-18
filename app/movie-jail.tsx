import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EditActionButton } from '../components/EditActionButton';
import { EditToggleButton } from '../components/EditToggleButton';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { MovieListRow } from '../components/MovieListRow';
import {
  getMovieJail,
  getSoftJail,
  getSoftJailDurationDays,
  getSoftJailRemainingMs,
  releaseFromMovieJail,
  releaseFromSoftJail,
  SoftJailEntry,
} from '../lib/storage';
import { Movie } from '../lib/tmdb';

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

function formatRemaining(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} ${days === 1 ? 'dag' : 'dage'} tilbage`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} ${hours === 1 ? 'time' : 'timer'} tilbage`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${minutes} min tilbage`;
}

function JailRow({ movie, editMode, onRelease }: { movie: Movie; editMode: boolean; onRelease: (id: number) => void }) {
  return (
    <View style={styles.rowOuter}>
      <View style={styles.rowFlex}>
        <MovieListRow movie={movie} source="jail" />
      </View>
      <EditActionButton visible={editMode}>
        <Pressable onPress={() => onRelease(movie.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={28} color="#1A1A1A" />
        </Pressable>
      </EditActionButton>
    </View>
  );
}

function SoftJailRow({
  entry,
  durationDays,
  editMode,
  onRelease,
}: {
  entry: SoftJailEntry;
  durationDays: number;
  editMode: boolean;
  onRelease: (id: number) => void;
}) {
  const remaining = getSoftJailRemainingMs(entry.addedAt, durationDays);
  return (
    <View style={styles.rowOuter}>
      <View style={styles.rowFlex}>
        <MovieListRow movie={entry.movie} extra={<Text style={styles.remainingText}>{formatRemaining(remaining)}</Text>} />
      </View>
      <EditActionButton visible={editMode}>
        <Pressable onPress={() => onRelease(entry.movie.id)} hitSlop={8}>
          <Feather name="x" size={28} color="#1A1A1A" />
        </Pressable>
      </EditActionButton>
    </View>
  );
}

export default function MovieJailScreen() {
  const [tab, setTab] = useState<'jail' | 'soft'>('jail');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [softEntries, setSoftEntries] = useState<SoftJailEntry[]>([]);
  const [durationDays, setDurationDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(() => {
    Promise.all([getMovieJail(), getSoftJail(), getSoftJailDurationDays()]).then(([jail, soft, duration]) => {
      setMovies([...jail].reverse());
      setSoftEntries([...soft].reverse());
      setDurationDays(duration);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleReleaseJail = async (movieId: number) => {
    await releaseFromMovieJail(movieId);
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
  };

  const handleReleaseSoft = async (movieId: number) => {
    await releaseFromSoftJail(movieId);
    setSoftEntries((prev) => prev.filter((e) => e.movie.id !== movieId));
  };

  const activeList = tab === 'jail' ? movies : softEntries;
  const isEmpty = !loading && activeList.length === 0;

  return (
    <View style={styles.root}>
      <BackButton />
      <EditToggleButton editMode={editMode} onPress={() => setEditMode((prev) => !prev)} />
      <Text style={styles.title}>Movie Jail</Text>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tabButton, tab === 'jail' && styles.tabButtonActive]} onPress={() => setTab('jail')}>
          <Text style={[styles.tabText, tab === 'jail' && styles.tabTextActive]}>Movie Jail</Text>
        </Pressable>
        <Pressable style={[styles.tabButton, tab === 'soft' && styles.tabButtonActive]} onPress={() => setTab('soft')}>
          <Text style={[styles.tabText, tab === 'soft' && styles.tabTextActive]}>Soft Jail</Text>
        </Pressable>
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{tab === 'jail' ? 'Ingen film i Movie Jail.' : 'Ingen film i Soft Jail.'}</Text>
        </View>
      ) : tab === 'jail' ? (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <JailRow movie={item} editMode={editMode} onRelease={handleReleaseJail} />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={softEntries}
          keyExtractor={(item) => String(item.movie.id)}
          renderItem={({ item }) => (
            <SoftJailRow entry={item} durationDays={durationDays} editMode={editMode} onRelease={handleReleaseSoft} />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', paddingTop: 110, marginBottom: 16, paddingHorizontal: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  tabButton: { flex: 1, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 18, paddingVertical: 10, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#1A1A1A' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  tabTextActive: { color: '#E8B923' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 15, textAlign: 'center', color: '#1A1A1A' },
  listContent: { paddingHorizontal: 16, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  rowOuter: { flexDirection: 'row', alignItems: 'center' },
  rowFlex: { flex: 1 },
  remainingText: { fontSize: 12, color: '#7A5C00', fontWeight: '600' },
});