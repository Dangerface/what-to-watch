import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { LoopingLoader } from '../components/LoopingLoader';
import { MovieDetailCard } from '../components/MovieDetailCard';
import { ResultsFeed } from '../lib/resultsFeed';
import { getMovieJailIds, getSoftJailIds } from '../lib/storage';
import { DiscoverFilters, Movie } from '../lib/tmdb';
import { useQuickSwipeTracking } from '../lib/useQuickSwipeTracking';
import { useSessionStore } from '../store/session';

const { width } = Dimensions.get('window');
const BATCH_SIZE = 12;
const PREFETCH_LOOKAHEAD = 3;
const LOADER_MIN_DISPLAY_MS = 1000;

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

export default function ResultsScreen() {
  const { genreIds, maxRuntimeMinutes, familyFriendly, providerIds, sourceType, vibes } = useSessionStore();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const feedRef = useRef<ResultsFeed | null>(null);
  const moviesRef = useRef<Movie[]>([]);
  const exhaustedRef = useRef(false);
  const pendingFetchRef = useRef<Promise<void> | null>(null);

  const { onViewableItemsChanged: quickSwipeOnViewableItemsChanged, viewabilityConfig: quickSwipeViewabilityConfig } =
    useQuickSwipeTracking();

  useEffect(() => {
    moviesRef.current = movies;
  }, [movies]);

  // Én fælles hentnings-funktion — starter en ny hentning, eller "hopper med på" en der allerede
  // kører (fx startet af prefetch), så vi aldrig sender to samtidige forespørgsler af sted.
  function startOrJoinFetch(): Promise<void> {
    if (pendingFetchRef.current) return pendingFetchRef.current;
    if (exhaustedRef.current || !feedRef.current) return Promise.resolve();

    const promise = feedRef.current
      .getNextBatch(BATCH_SIZE)
      .then((batch) => {
        if (batch.length === 0) {
          exhaustedRef.current = true;
          setExhausted(true);
        } else {
          setMovies((prev) => [...prev, ...batch]);
        }
      })
      .catch(() => {})
      .finally(() => {
        pendingFetchRef.current = null;
      });

    pendingFetchRef.current = promise;
    return promise;
  }

  // Stille baggrunds-hentning — ingen loader, ingen ventetid for brugeren.
  const triggerPrefetch = () => {
    if (!exhaustedRef.current) startOrJoinFetch();
  };

  // Brugeren har rent faktisk nået enden — vis loaderen, garanter mindst én fuld cyklus.
  const handleReachedEnd = async () => {
    if (exhaustedRef.current) return;
    setLoadingMore(true);
    const startTime = Date.now();

    await startOrJoinFetch();

    const elapsed = Date.now() - startTime;
    if (elapsed < LOADER_MIN_DISPLAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, LOADER_MIN_DISPLAY_MS - elapsed));
    }
    setLoadingMore(false);
  };

  const prefetchOnViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const last = viewableItems[viewableItems.length - 1];
    if (!last || last.index == null) return;
    const remaining = moviesRef.current.length - 1 - last.index;
    if (remaining <= PREFETCH_LOOKAHEAD) triggerPrefetch();
  }).current;

  const prefetchViewabilityConfig = useRef({ itemVisiblePercentThreshold: 90 }).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig: quickSwipeViewabilityConfig, onViewableItemsChanged: quickSwipeOnViewableItemsChanged },
    { viewabilityConfig: prefetchViewabilityConfig, onViewableItemsChanged: prefetchOnViewableItemsChanged },
  ]).current;

  useEffect(() => {
    const filters: DiscoverFilters = { genreIds, maxRuntimeMinutes, familyFriendly, providerIds, sourceType };

    (async () => {
      try {
        const jailedIds = await getMovieJailIds();
        const softJailedIds = await getSoftJailIds();
        const excludedIds = new Set([...jailedIds, ...softJailedIds]);
        const feed = new ResultsFeed(vibes, filters, excludedIds);
        feedRef.current = feed;

        const batch = await feed.getNextBatch(BATCH_SIZE);
        setMovies(batch);
        if (batch.length === 0) {
          exhaustedRef.current = true;
          setExhausted(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <View style={styles.center}><BackButton /><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.errorText}>Der gik noget galt undervejs. Prøv igen.</Text>
        <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
          <Text style={styles.restartButtonText}>Forfra</Text>
        </Pressable>
      </View>
    );
  }

  if (movies.length === 0) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.errorText}>We can't find any more movies. Try another search</Text>
        <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
          <Text style={styles.restartButtonText}>Forfra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BackButton />
      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onEndReachedThreshold={0.1}
        onEndReached={handleReachedEnd}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        renderItem={({ item }) => (
          <MovieDetailCard movie={item} width={width} onJailed={() => setMovies((prev) => prev.filter((m) => m.id !== item.id))} />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={[styles.card, { width, justifyContent: 'center', alignItems: 'center' }]}>
              <LoopingLoader />
            </View>
          ) : exhausted ? (
            <View style={[styles.card, { width, justifyContent: 'center' }]}>
              <Text style={styles.endOfListText}>We can't find any more movies. Try another search</Text>
              <Pressable style={styles.restartButton} onPress={() => router.replace('/')}>
                <Text style={styles.restartButtonText}>Forfra</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  card: { alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#E8B923' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  endOfListText: { fontSize: 15, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20, color: '#1A1A1A' },
  restartButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 40 },
  restartButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});