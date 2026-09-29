import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { getWatchedEntry, isInWatchLater, markWatched, sendToMovieJail, toggleWatchLater, unmarkWatched } from '../lib/storage';
import { Movie } from '../lib/tmdb';
import { InteractiveStarRating } from './InteractiveStarRating';
import { ParticleBurst } from './ParticleBurst';
import { STAR_BURST_DURATION_MS, STAR_BURST_STAGGER_MS, StarBurstSequence } from './StarBurstSequence';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEEN_BUTTON_REVEAL_MS = 350;
const AUTO_CLOSE_IDLE_MS = 1000;

type Props = { movie: Movie | null; visible: boolean; onClose: () => void; onJailed?: (() => void) | null };

export function MovieActionModal({ movie, visible, onClose, onJailed }: Props) {
  const [displayedMovie, setDisplayedMovie] = useState<Movie | null>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(0);

  const [seen, setSeen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [jailed, setJailed] = useState(false);
  const [starBurst, setStarBurst] = useState(0);
  const [burstStarCount, setBurstStarCount] = useState(0);
  const [seenBurst, setSeenBurst] = useState(0);
  const isInitialSeenRef = useRef(true);
  const seenScale = useRef(new Animated.Value(1)).current;

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCloseTimers = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (movie) setDisplayedMovie(movie);
  }, [movie]);

  useEffect(() => {
    if (!visible || !movie) return;
    isInitialSeenRef.current = true;
    clearAutoCloseTimers();
    getWatchedEntry(movie.id).then((entry) => {
      setSeen(!!entry);
      setRating(entry?.rating ?? null);
      isInitialSeenRef.current = false;
    });
    isInWatchLater(movie.id).then(setSaved);
    setJailed(false);
  }, [visible, movie?.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: visible ? 0 : SCREEN_HEIGHT, useNativeDriver: true, friction: 9, tension: 60 }),
      Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      if (!visible) setDisplayedMovie(null);
    });
    if (!visible) clearAutoCloseTimers();
  }, [visible]);

  useEffect(() => {
    return () => clearAutoCloseTimers();
  }, []);

  useEffect(() => {
    if (isInitialSeenRef.current) return;
    if (seen) {
      Animated.sequence([
        Animated.timing(seenScale, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.spring(seenScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 }),
      ]).start();
    }
  }, [seen]);

  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => clearAutoCloseTimers(),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (sheetHeightRef.current > 0 && g.dy > sheetHeightRef.current * 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
        }
      },
    })
  ).current;

  if (!displayedMovie) return null;
  const movieRef = displayedMovie;

  const handleRatingChange = (value: number) => {
    clearAutoCloseTimers();
    setRating(value);
  };

  const handleRatingCommit = async (value: number) => {
    clearAutoCloseTimers();
    setRating(value);
    await markWatched(movieRef, value);

    const starCount = value / 2;
    setBurstStarCount(starCount);
    setStarBurst((n) => n + 1);

    // 'seen' opdateres bevidst FØRST når stjerne-udbruddet er helt færdigt —
    // ikke med det samme, så knappen reelt "animerer ind i forlængelse af sidste stjerne".
    const totalBurstMs = Math.max(0, Math.ceil(starCount) - 1) * STAR_BURST_STAGGER_MS + STAR_BURST_DURATION_MS;

    revealTimeoutRef.current = setTimeout(() => {
      setSeen(true);
      autoCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, SEEN_BUTTON_REVEAL_MS + AUTO_CLOSE_IDLE_MS);
    }, totalBurstMs);
  };

  const handleToggleSeen = async () => {
    clearAutoCloseTimers();
    if (seen) {
      setSeen(false);
      setRating(null);
      await unmarkWatched(movieRef.id);
    } else {
      setSeen(true);
      await markWatched(movieRef, rating);
      setSeenBurst((n) => n + 1);
      autoCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, SEEN_BUTTON_REVEAL_MS + AUTO_CLOSE_IDLE_MS);
    }
  };

  const handleToggleSave = async () => {
    clearAutoCloseTimers();
    setSaved(await toggleWatchLater(movieRef));
  };

  const handleJail = async () => {
    clearAutoCloseTimers();
    await sendToMovieJail(movieRef);
    setJailed(true);
    onClose();
    if (onJailed) onJailed();
    else router.back();
  };

  const ratingLabel = rating != null ? `${(rating / 2).toFixed(1).replace('.0', '')}/5` : 'Not rated yet';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: overlayOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        onLayout={(e) => {
          sheetHeightRef.current = e.nativeEvent.layout.height;
        }}
      >
        <View {...dragPanResponder.panHandlers}>
          <View style={styles.handle} />
          <Text style={styles.title}>Rate this movie</Text>
          <Text style={styles.ratingLabel}>{ratingLabel}</Text>
        </View>

        <View style={styles.starWrapper}>
          <InteractiveStarRating rating={rating} onChange={handleRatingChange} onCommit={handleRatingCommit} />
          <StarBurstSequence filledStars={burstStarCount} trigger={starBurst} />
        </View>

        <View style={styles.seenWrapper}>
          <Animated.View style={{ transform: [{ scale: seenScale }] }}>
            <Pressable style={[styles.seenButton, seen && styles.seenButtonFilled]} onPress={handleToggleSeen}>
              <Text style={[styles.seenButtonText, seen && styles.seenButtonTextFilled]}>I've seen this</Text>
              <Ionicons name={seen ? 'checkbox' : 'checkbox-outline'} size={22} color={seen ? '#FFFFFF' : '#1A1A1A'} />
            </Pressable>
          </Animated.View>
          <ParticleBurst trigger={seenBurst} />
        </View>

        <View style={styles.squareRow}>
          <Pressable style={styles.squareButton} onPress={handleToggleSave}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={26} color="#1A1A1A" />
            <Text style={styles.squareButtonText}>{saved ? 'Saved' : 'Watch List'}</Text>
          </Pressable>
          <Pressable style={styles.squareButton} onPress={handleJail} disabled={jailed}>
            <Ionicons name="close-circle-outline" size={26} color="#1A1A1A" />
            <Text style={styles.squareButtonText}>{jailed ? 'Jailed' : 'Movie Jail'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'flex-end', zIndex: 40, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#E8B923', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)', marginBottom: 16, alignSelf: 'center' },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 18, textAlign: 'center' },
  ratingLabel: { fontSize: 14, color: '#1A1A1A', marginBottom: 4, marginTop: 4, textAlign: 'center' },
  starWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  seenWrapper: { position: 'relative', width: '100%', alignItems: 'center' },
  seenButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 20, width: 214, height: 100, marginBottom: 14,
    borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: 'transparent',
  },
  seenButtonFilled: { backgroundColor: '#1A1A1A' },
  seenButtonText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  seenButtonTextFilled: { color: '#FFFFFF' },
  squareRow: { flexDirection: 'row', gap: 14, width: '100%', justifyContent: 'center' },
  squareButton: { width: 100, aspectRatio: 1, borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', gap: 6 },
  squareButtonText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A', textAlign: 'center' },
});