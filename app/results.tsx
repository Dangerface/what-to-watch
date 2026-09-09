import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MovieCard } from '../components/MovieCard';
import { ResultsFeed } from '../lib/resultsFeed';
import { getMovieJailIds, getSoftJailIds } from '../lib/storage';
import { DiscoverFilters, Movie } from '../lib/tmdb';
import { useQuickSwipeTracking } from '../lib/useQuickSwipeTracking';
import { useSessionStore } from '../store/session';

const { width } = Dimensions.get('window');
const BATCH_SIZE = 12;
const { onViewableItemsChanged, viewabilityConfig } = useQuickSwipeTracking();

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

  useEffect(() => {
    const filters: DiscoverFilters = { genreIds, maxRuntimeMinutes, familyFriendly, providerIds, sourceType };

    (async () => {
      try {
        const [jailedIds, softJailedIds] = await Promise.all([getMovieJailIds(), getSoftJailIds()]);
        const excludedIds = new Set([...jailedIds, ...softJailedIds]);
        const feed = new ResultsFeed(vibes, filters, excludedIds);
        feedRef.current = feed;

        const batch = await feed.getNextBatch(BATCH_SIZE);
        setMovies(batch);
        if (batch.length === 0) setExhausted(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleEndReached = async () => {
    if (loadingMore || !feedRef.current || exhausted) return;
    setLoadingMore(true);
    try {
      const batch = await feedRef.current.getNextBatch(BATCH_SIZE);
      if (batch.length === 0) setExhausted(true);
      else setMovies((prev) => [...prev, ...batch]);
    } catch {
      // stille fejl — brugeren har stadig film at swipe imellem
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <BackButton />
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
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
        <Text style={styles.errorText}>
          Der er ikke flere resultater på din søgning. Hvis du ønsker flere forslag, så prøv at gøre din søgning bredere.
        </Text>
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
        onEndReachedThreshold={0.5}
        onEndReached={handleEndReached}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <MovieCard
            movie={item}
            width={width}
            sourceType={sourceType}
            onJailed={(id) => setMovies((prev) => prev.filter((m) => m.id !== id))}
          />
        )}
        ListFooterComponent={
          exhausted ? (
            <View style={[styles.card, { width, justifyContent: 'center' }]}>
              <Text style={styles.endOfListText}>
                Ikke flere film på denne søgning. Prøv en bredere søgning for flere forslag.
              </Text>
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
  poster: { width: 220, height: 330, borderRadius: 16, marginBottom: 20 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 8 },
  meta: { fontSize: 16, marginBottom: 16 },
  overview: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  restartButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 40 },
  restartButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});