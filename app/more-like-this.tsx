import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import LoopLoader from '../components/LoopLoader';
import { MovieDetailCard } from '../components/MovieDetailCard';
import { ScreenBackground } from '../components/ScreenBackground';
import { MoreLikeThisFeed } from '../lib/moreLikeThis';
import { colors, spacing, typography } from '../lib/theme';
import { DiscoverFilters, Movie } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

const { width } = Dimensions.get('window');
const BATCH_SIZE = 12;

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
        <ScreenBackground />
        <BackButton />
        <LoopLoader />
      </View>
    );
  }

  if (error || movies.length === 0) {
    return (
      <View style={styles.center}>
        <ScreenBackground />
        <BackButton />
        <Text style={styles.errorText}>Fandt ingen lignende film der matcher jeres filtre.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <BackButton />
      <Text style={styles.header}>Ligner {title ?? 'denne film'}</Text>
      <FlatList
        style={styles.content}
        data={movies}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={handleEndReached}
        renderItem={({ item }) => (
          <MovieDetailCard movie={item} width={width} onJailed={() => setMovies((prev) => prev.filter((m) => m.id !== item.id))} />
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
  content: { top: 50 },
  root: { flex: 1, backgroundColor: colors.background },
  header: { position: 'absolute', top: 66, left: 60, right: 60, ...typography.h4, textAlign: 'center', zIndex: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.xxl },
  card: { alignItems: 'center', padding: spacing.xxl, paddingTop: 60, backgroundColor: colors.background },
  errorText: { fontSize: 16, textAlign: 'center' },
});