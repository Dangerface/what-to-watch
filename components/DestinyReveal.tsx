import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
    DESTINY_HEADING_HEIGHT,
    DESTINY_HEADING_MARGIN,
    DESTINY_TOP_PADDING,
    SLOT_GAP,
    SLOT_HEIGHT,
    SLOT_WIDTH,
} from '../lib/destinyLayout';
import { Movie } from '../lib/tmdb';
import { TAB_BAR_CLEARANCE } from './GlobalTabBar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TITLE_BLOCK_HEIGHT = 100;
const REVEAL_DELAY_MS = 600;
const REVEAL_DURATION_MS = 900;

type Props = {
  chosenMovies: Movie[];
  winner: Movie;
  matchedPickIds: number[];
  onBack: () => void;
  gapBelowChosen: number;
};

export function DestinyReveal({ chosenMovies, winner, matchedPickIds, onBack, gapBelowChosen }: Props) {
  const matchedTitles = chosenMovies.filter((m) => matchedPickIds.includes(m.id)).map((m) => m.title);
  const winnerOpacity = useRef(new Animated.Value(0)).current;
  const winnerScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(REVEAL_DELAY_MS),
      Animated.parallel([
        Animated.timing(winnerOpacity, { toValue: 1, duration: REVEAL_DURATION_MS, useNativeDriver: true }),
        Animated.spring(winnerScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 40 }),
      ]),
    ]).start();
  }, []);

  const posterTop = DESTINY_TOP_PADDING + DESTINY_HEADING_HEIGHT + DESTINY_HEADING_MARGIN + SLOT_HEIGHT + gapBelowChosen;
  const availableHeight = SCREEN_HEIGHT - posterTop - TAB_BAR_CLEARANCE - TITLE_BLOCK_HEIGHT;
  const posterHeight = Math.max(150, Math.min(SCREEN_WIDTH * 0.6 * 1.5, availableHeight));
  const posterWidth = posterHeight / 1.5;

  const openMovie = (movieId: number) => {
    router.push({ pathname: '/movie/[id]', params: { id: String(movieId) } } as any);
  };

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
        <Text style={styles.backArrow}>←</Text>
      </Pressable>

      <View style={styles.topSection}>
        <Text style={styles.heading}>Tonight's movie</Text>
        <View style={styles.chosenRow}>
          {chosenMovies.map((m) => (
            <Pressable key={m.id} onPress={() => openMovie(m.id)}>
              {m.poster_path && (
                <Image source={{ uri: `https://image.tmdb.org/t/p/w185${m.poster_path}` }} style={styles.chosenPoster} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <Animated.View style={[styles.winnerBlock, { marginTop: gapBelowChosen, opacity: winnerOpacity, transform: [{ scale: winnerScale }] }]}>
        <Pressable onPress={() => openMovie(winner.id)} style={styles.winnerPress}>
          {winner.poster_path && (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w500${winner.poster_path}` }}
              style={{ width: posterWidth, height: posterHeight, borderRadius: 16, marginBottom: 12 }}
            />
          )}
          <Text style={styles.winnerTitle} numberOfLines={2}>{winner.title}</Text>
          <Text style={styles.winnerYear}>{winner.release_date?.slice(0, 4)}</Text>
          {matchedTitles.length > 0 && (
            <Text style={styles.matchedText}>Matched with {matchedTitles.join(' and ')}</Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923' },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  topSection: { paddingTop: DESTINY_TOP_PADDING, paddingHorizontal: 20 },
  heading: {
    fontFamily: 'Gabarito-Bold', fontSize: 18, lineHeight: 24, textAlign: 'center',
    height: DESTINY_HEADING_HEIGHT, marginBottom: DESTINY_HEADING_MARGIN,
  },
  chosenRow: { flexDirection: 'row', gap: SLOT_GAP, justifyContent: 'center' },
  chosenPoster: { width: SLOT_WIDTH, height: SLOT_HEIGHT, borderRadius: 10 },
  winnerBlock: { alignItems: 'center' },
  winnerPress: { alignItems: 'center' },
  winnerTitle: { fontFamily: 'Gabarito-Bold', fontSize: 22, lineHeight: 28, textAlign: 'center', paddingHorizontal: 20 },
  winnerYear: { fontSize: 15, textAlign: 'center', color: '#1A1A1A', marginTop: 4 },
    matchedText: { fontSize: 13, textAlign: 'center', color: '#1A1A1A', marginTop: 8, paddingHorizontal: 30 },
});