import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MovieCard } from '../components/MovieCard';
import { MoreLikeThisFeed } from '../lib/moreLikeThis';
import { DiscoverFilters, Movie } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

const { width } = Dimensions.get('window');
const BATCH_SIZE = 12;

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
      <Text style={styles.backArrow}>←</Text>
    </Pressable>
  );
}

export default function MoreLikeThisScreen() {
  const { movieId, title } = useLocalSearchParams<{ movieId: string; title?: string }>();
  const { familyFriendly, providerIds, sourceType } = useSessionStore();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const feedRef = useRef<MoreLikeThisFeed | null>(null);

  useEffect(() => {
    const filters: DiscoverFilters = { genreIds: [], maxRuntimeMinutes: null, familyFriendly, providerIds, sourceType };
    const feed = new MoreLikeThisFeed(Number(movieId), filters);
    feedRef.current = feed;

    feed
      .getNextBatch(BATCH_SIZE)
      .then((batch) => {
        setMovies(batch);
        if (batch.length === 0) setExhausted(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [movieId]);

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

  if (error || movies.length === 0) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.errorText}>Fandt ingen lignende film der matcher jeres filtre.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BackButton />
      <Text style={styles.header}>Ligner {title ?? 'denne film'}</Text>
      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={handleEndReached}
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
              <Text style={styles.errorText}>Ikke flere lignende film at vise.</Text>
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
  header: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center', marginTop: 60, marginBottom: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923', padding: 24 },
  card: { alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#E8B923' },
  errorText: { fontSize: 16, textAlign: 'center' },
});