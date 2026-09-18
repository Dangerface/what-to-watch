import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { getWatchedEntry, isInWatchLater, markWatched, sendToMovieJail, toggleWatchLater, unmarkWatched } from '../lib/storage';
import { Movie } from '../lib/tmdb';
import { StarRating } from './StarRating';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = { movie: Movie; visible: boolean; onClose: () => void; onJailed?: (() => void) | null };

export function MovieActionModal({ movie, visible, onClose, onJailed }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [seen, setSeen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [jailed, setJailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    getWatchedEntry(movie.id).then((entry) => {
      setSeen(!!entry);
      setRating(entry?.rating ?? null);
    });
    isInWatchLater(movie.id).then(setSaved);
    setJailed(false);
  }, [visible, movie.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: visible ? 0 : SCREEN_HEIGHT, useNativeDriver: true, friction: 9, tension: 60 }),
      Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const handleRatingChange = async (value: number) => {
    const rounded = Math.round(value);
    if (rounded !== rating) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRating(rounded);
      setSeen(true);
      await markWatched(movie, rounded);
    }
  };

  const handleToggleSeen = async () => {
    if (seen) {
      setSeen(false);
      setRating(null);
      await unmarkWatched(movie.id);
    } else {
      setSeen(true);
      await markWatched(movie, rating);
    }
  };

  const handleToggleSave = async () => {
    setSaved(await toggleWatchLater(movie));
  };

  const handleJail = async () => {
    await sendToMovieJail(movie);
    setJailed(true);
    onClose();
    if (onJailed) {
      onJailed();
    } else {
      router.back();
    }
  };

  const ratingLabel = rating != null ? `${(rating / 2).toFixed(1).replace('.0', '')}/5 ⭐` : 'Not rated yet';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: overlayOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Rate this movie</Text>
        <Text style={styles.ratingLabel}>{ratingLabel}</Text>

        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={rating ?? 5}
          onValueChange={handleRatingChange}
          minimumTrackTintColor="#1A1A1A"
          maximumTrackTintColor="#FFFFFF"
          thumbTintColor="#1A1A1A"
        />
        <StarRating ratingOutOfTen={rating} />

        <Pressable style={styles.seenButton} onPress={handleToggleSeen}>
          <Ionicons name={seen ? 'checkbox' : 'checkbox-outline'} size={20} color="#FFFFFF" />
          <Text style={styles.seenButtonText}>I've seen this</Text>
        </Pressable>

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
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)', marginBottom: 16 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 18, textAlign: 'center' },
  ratingLabel: { fontSize: 14, color: '#1A1A1A', marginBottom: 8, marginTop: 4 },
  slider: { width: '100%', marginBottom: 4 },
  seenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 12, width: '100%', marginTop: 20, marginBottom: 14 },
  seenButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  squareRow: { flexDirection: 'row', gap: 14, width: '100%', justifyContent: 'center' },
  squareButton: { width: 100, aspectRatio: 1, borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', gap: 6 },
  squareButtonText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A', textAlign: 'center' },
});