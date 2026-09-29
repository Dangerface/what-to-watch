import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CAROUSEL_HEIGHT,
  CAROUSEL_SNAP_INTERVAL,
  DestinyCarousel,
  FOCUS_POSTER_CENTER_OFFSET_Y,
  FOCUS_POSTER_HEIGHT,
  FOCUS_POSTER_TOP_INSET,
  FOCUS_POSTER_WIDTH,
  UNFOCUS_POSTER_CENTER_OFFSET_Y,
  UNFOCUS_POSTER_HEIGHT,
  UNFOCUS_POSTER_WIDTH,
} from '../components/DestinyCarousel';
import { DestinyReveal } from '../components/DestinyReveal';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { getDestinyCandidates, markDestinyShown } from '../lib/destiny';
import {
  DESTINY_HEADING_HEIGHT,
  DESTINY_HEADING_MARGIN,
  DESTINY_TOP_PADDING,
  SLOT_COUNT,
  SLOT_GAP,
  SLOT_HEIGHT,
  SLOT_WIDTH,
} from '../lib/destinyLayout';
import { buildRevealPool, scoreRevealPool } from '../lib/destinyReveal';
import { getMovieJailIds, getWatched, releaseFromSoftJail } from '../lib/storage';
import { getTasteProfile } from '../lib/tasteProfile';
import { Movie } from '../lib/tmdb';

const REQUIRED_RATED_COUNT = 20;
const FLY_DURATION_MS = 450;
const ROUND_POOL_SIZE = 20;
const MIN_FRESH_CANDIDATES = 5;
const CAROUSEL_TOP_PAD_FRACTION = 0.3125;

type ScreenState = 'checking' | 'disabled' | 'loading-pool' | 'selecting' | 'transitioning' | 'revealing' | 'result' | 'empty-pool';
type Box = { x: number; y: number; width: number; height: number };
type Rect = { left: number; top: number; width: number; height: number };

function measureNode(node: View | null): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

function SelectionSlot({ movie, onPress }: { movie: Movie | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!movie} style={[styles.slot, movie ? styles.slotFilled : styles.slotEmpty]}>
      {movie?.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w185${movie.poster_path}` }} style={styles.slotImage} />
      )}
    </Pressable>
  );
}

export default function DestinyScreen() {
  const [state, setState] = useState<ScreenState>('checking');
  const [roundPool, setRoundPool] = useState<Movie[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<Movie[]>([]);
  const [result, setResult] = useState<Movie | null>(null);
  const [matchedPickIds, setMatchedPickIds] = useState<number[]>([]);
  const [flyingMovie, setFlyingMovie] = useState<Movie | null>(null);
  const [busy, setBusy] = useState(false);
  const [carouselTopPad, setCarouselTopPad] = useState(0);

  const busyRef = useRef(false);
  const centeredRef = useRef<Movie | null>(null);
  const sessionShownIds = useRef<Set<number>>(new Set());
  const rootRef = useRef<View>(null);
  const carouselInnerRef = useRef<View>(null);
  const slotRefs = useRef<(View | null)[]>([null, null, null]);

  const flyLeft = useRef(new Animated.Value(0)).current;
  const flyTop = useRef(new Animated.Value(0)).current;
  const flyWidth = useRef(new Animated.Value(FOCUS_POSTER_WIDTH)).current;
  const flyHeight = useRef(new Animated.Value(FOCUS_POSTER_HEIGHT)).current;

  const handleCenteredChange = useCallback((movie: Movie | null) => {
    centeredRef.current = movie;
  }, []);

  const finishBusy = () => {
    busyRef.current = false;
    setBusy(false);
  };

  const loadInitialPool = useCallback(async () => {
    setState('loading-pool');
    setSelected([]);
    setResult(null);
    setMatchedPickIds([]);
    sessionShownIds.current = new Set();
    busyRef.current = false;
    setBusy(false);

    const candidates = await getDestinyCandidates();
    if (candidates.status === 'insufficient-seeds' || candidates.topCandidates.length === 0) {
      setState('empty-pool');
      return;
    }

    candidates.topCandidates.forEach((m) => sessionShownIds.current.add(m.id));
    setRoundPool(candidates.topCandidates);
    setRoundIndex(0);
    setState('selecting');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const watched = await getWatched();
      const ratedCount = watched.filter((e) => e.rating != null).length;
      if (cancelled) return;

      if (ratedCount < REQUIRED_RATED_COUNT) {
        setState('disabled');
        return;
      }
      await loadInitialPool();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flyPoster = (movie: Movie, from: Rect, to: Rect) =>
    new Promise<void>((resolve) => {
      flyLeft.setValue(from.left);
      flyTop.setValue(from.top);
      flyWidth.setValue(from.width);
      flyHeight.setValue(from.height);
      setFlyingMovie(movie);

      const config = { duration: FLY_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false };
      Animated.parallel([
        Animated.timing(flyLeft, { ...config, toValue: to.left }),
        Animated.timing(flyTop, { ...config, toValue: to.top }),
        Animated.timing(flyWidth, { ...config, toValue: to.width }),
        Animated.timing(flyHeight, { ...config, toValue: to.height }),
      ]).start(() => resolve());
    });

  const clearFlying = () => requestAnimationFrame(() => setFlyingMovie(null));

  const measureBoxes = async (slotIndex: number) => {
    const [root, carousel, slot] = await Promise.all([
      measureNode(rootRef.current),
      measureNode(carouselInnerRef.current),
      measureNode(slotRefs.current[slotIndex]),
    ]);
    if (!root || !carousel || !slot) return null;
    return { root, carousel, slot };
  };

  const handleSelect = async (picked: Movie) => {
    if (busyRef.current || state !== 'selecting') return;
    if (selected.some((m) => m.id === picked.id)) return;

    busyRef.current = true;
    setBusy(true);

    const slotIndex = selected.length;
    const nextSelected = [...selected, picked];

    const boxes = await measureBoxes(slotIndex);
    if (boxes) {
      const { root, carousel, slot } = boxes;
      const cx = carousel.x + carousel.width / 2 - root.x;
      const cy = carousel.y + carousel.height / 2 + FOCUS_POSTER_CENTER_OFFSET_Y - root.y;
      await flyPoster(
        picked,
        { left: cx - FOCUS_POSTER_WIDTH / 2, top: cy - FOCUS_POSTER_HEIGHT / 2, width: FOCUS_POSTER_WIDTH, height: FOCUS_POSTER_HEIGHT },
        { left: slot.x - root.x, top: slot.y - root.y, width: slot.width, height: slot.height }
      );
    }

    setSelected(nextSelected);
    clearFlying();

    if (nextSelected.length === SLOT_COUNT) {
      await handleReveal(nextSelected);
      finishBusy();
      return;
    }

    setState('transitioning');

    const [watched, jailedIds] = await Promise.all([getWatched(), getMovieJailIds()]);
    const excluded = new Set([...watched.map((e) => e.movie.id), ...jailedIds, ...sessionShownIds.current]);

    const raw = await buildRevealPool(nextSelected, excluded);
    const nextPool = raw.map((e) => e.movie).slice(0, ROUND_POOL_SIZE);

    if (nextPool.length > 0) {
      nextPool.forEach((m) => sessionShownIds.current.add(m.id));
      setRoundPool(nextPool);
      setRoundIndex((n) => n + 1);
    } else {
      const remaining = roundPool.filter((m) => !nextSelected.some((s) => s.id === m.id));
      if (remaining.length === 0) {
        await handleReveal(nextSelected);
        finishBusy();
        return;
      }
      setRoundPool(remaining);
      setRoundIndex((n) => n + 1);
    }

    setState('selecting');
    finishBusy();
  };

  const handleDeselect = async (index: number) => {
    if (busyRef.current || state !== 'selecting') return;
    const deselected = selected[index];
    if (!deselected) return;

    busyRef.current = true;
    setBusy(true);

    const boxes = await measureBoxes(index);
    setSelected((prev) => prev.filter((_, i) => i !== index));

    if (boxes) {
      const { root, carousel, slot } = boxes;
      const cx = carousel.x + carousel.width / 2 + CAROUSEL_SNAP_INTERVAL - root.x;
      const cy = carousel.y + carousel.height / 2 + UNFOCUS_POSTER_CENTER_OFFSET_Y - root.y;
      await flyPoster(
        deselected,
        { left: slot.x - root.x, top: slot.y - root.y, width: slot.width, height: slot.height },
        { left: cx - UNFOCUS_POSTER_WIDTH / 2, top: cy - UNFOCUS_POSTER_HEIGHT / 2, width: UNFOCUS_POSTER_WIDTH, height: UNFOCUS_POSTER_HEIGHT }
      );
    }

    setRoundPool((prev) => {
      if (prev.some((m) => m.id === deselected.id)) return prev;
      const centeredId = centeredRef.current?.id;
      const centeredIndex = centeredId != null ? prev.findIndex((m) => m.id === centeredId) : -1;
      const insertAt = centeredIndex === -1 ? prev.length : centeredIndex + 1;
      const next = [...prev];
      next.splice(insertAt, 0, deselected);
      return next;
    });

    clearFlying();
    finishBusy();
  };

  const handleReveal = async (chosen: Movie[]) => {
    setState('revealing');
    try {
      const [watched, jailedIds, taste] = await Promise.all([getWatched(), getMovieJailIds(), getTasteProfile()]);
      const baseExcluded = new Set([...watched.map((e) => e.movie.id), ...jailedIds]);
      const freshExcluded = new Set([...baseExcluded, ...sessionShownIds.current]);

      let rawPool = await buildRevealPool(chosen, freshExcluded);
      if (rawPool.length < MIN_FRESH_CANDIDATES) {
        rawPool = await buildRevealPool(chosen, baseExcluded);
      }

      const scored = await scoreRevealPool(rawPool, taste, chosen);
      const chosenIds = new Set(chosen.map((m) => m.id));
      const winnerEntry = scored.find((s) => !chosenIds.has(s.movie.id));

      if (!winnerEntry) {
        setState('empty-pool');
        return;
      }

      setResult(winnerEntry.movie);
      setMatchedPickIds(winnerEntry.matchedPickIds);
      releaseFromSoftJail(winnerEntry.movie.id);
      markDestinyShown(winnerEntry.movie.id);
      setState('result');
    } catch {
      setState('empty-pool');
    }
  };

  if (state === 'checking' || state === 'loading-pool' || state === 'revealing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  if (state === 'disabled') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Destiny</Text>
        <Text style={styles.subMessage}>Rate more of the movies you've watched to use this feature.</Text>
      </View>
    );
  }

  if (state === 'empty-pool') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Couldn't find a match right now.</Text>
        <Pressable style={styles.backButton} onPress={loadInitialPool}>
          <Text style={styles.backButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'result' && result) {
    return (
      <DestinyReveal
        chosenMovies={selected}
        winner={result}
        matchedPickIds={matchedPickIds}
        onBack={loadInitialPool}
        gapBelowChosen={carouselTopPad + FOCUS_POSTER_TOP_INSET}
      />
    );
  }

  const remaining = Math.max(1, SLOT_COUNT - selected.length);

  return (
    <View ref={rootRef} collapsable={false} style={styles.root}>
      <View style={styles.topSection}>
        <Text style={styles.heading}>Tell me which movie I'm destined to watch tonight</Text>

        <View style={styles.slotRow}>
          {Array.from({ length: SLOT_COUNT }).map((_, i) => (
            <View
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              collapsable={false}
            >
              <SelectionSlot movie={selected[i] ?? null} onPress={() => handleDeselect(i)} />
            </View>
          ))}
        </View>
      </View>

      <View
        style={[styles.carouselSection, { paddingTop: carouselTopPad }]}
        onLayout={(e) =>
          setCarouselTopPad(Math.max(0, (e.nativeEvent.layout.height - CAROUSEL_HEIGHT) * CAROUSEL_TOP_PAD_FRACTION))
        }
      >
        <View ref={carouselInnerRef} collapsable={false} style={{ height: CAROUSEL_HEIGHT }}>
          {state === 'selecting' && (
            <DestinyCarousel
              key={roundIndex}
              movies={roundPool}
              onCenteredChange={handleCenteredChange}
              onSelect={handleSelect}
              entranceFrom="right"
              locked={busy}
            />
          )}
        </View>
      </View>

      <View style={styles.hintWrapper} pointerEvents="none">
        <Text style={styles.hintTitle}>Select {remaining} {remaining === 1 ? 'movie' : 'movies'}</Text>
        <Text style={styles.hintSubtitle}>to find the movie for you</Text>
      </View>

      {flyingMovie?.poster_path && (
        <Animated.Image
          source={{ uri: `https://image.tmdb.org/t/p/w342${flyingMovie.poster_path}` }}
          style={[styles.flyingPoster, { left: flyLeft, top: flyTop, width: flyWidth, height: flyHeight }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  root: { flex: 1, backgroundColor: '#E8B923' },
  topSection: { paddingTop: DESTINY_TOP_PADDING, paddingHorizontal: 20, zIndex: 5 },
  heading: {
    fontFamily: 'Gabarito-Bold', fontSize: 18, lineHeight: 24, textAlign: 'center',
    height: DESTINY_HEADING_HEIGHT, marginBottom: DESTINY_HEADING_MARGIN,
  },
  slotRow: { flexDirection: 'row', gap: SLOT_GAP, justifyContent: 'center', zIndex: 5 },
  slot: { width: SLOT_WIDTH, height: SLOT_HEIGHT, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  slotEmpty: { borderWidth: 2, borderColor: '#1A1A1A', borderStyle: 'dashed', backgroundColor: 'transparent' },
  slotFilled: { borderWidth: 0 },
  slotImage: { width: '100%', height: '100%' },
  carouselSection: { flex: 1 },
  hintWrapper: { alignItems: 'center', marginBottom: TAB_BAR_CLEARANCE + 10 },
  hintTitle: { fontFamily: 'Gabarito-Bold', fontSize: 18, textAlign: 'center', color: '#1A1A1A' },
  hintSubtitle: { fontSize: 14, textAlign: 'center', color: '#1A1A1A', marginTop: 2 },
  message: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center', marginBottom: 12 },
  subMessage: { fontSize: 14, textAlign: 'center', color: '#1A1A1A' },
  backButton: { borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 40, marginTop: 20 },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  flyingPoster: { position: 'absolute', borderRadius: 14, zIndex: 60 },
});