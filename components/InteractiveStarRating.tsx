import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, View } from 'react-native';

export const STAR_SIZE = 34;
export const STAR_GAP = 8;
const STAR_COUNT = 5;

type Props = {
  rating: number | null;
  onChange: (rating: number) => void;
  onCommit: (rating: number) => void;
};

export function InteractiveStarRating({ rating, onChange, onCommit }: Props) {
  const containerPageX = useRef(0);
  const lastRatingRef = useRef<number | null>(null);

  const computeRating = (pageX: number): number => {
    const relativeX = pageX - containerPageX.current;
    const unit = STAR_SIZE + STAR_GAP;
    const clampedX = Math.max(0, Math.min(relativeX, STAR_COUNT * unit - STAR_GAP));
    const starIndex = Math.min(STAR_COUNT - 1, Math.floor(clampedX / unit));
    const withinStar = clampedX - starIndex * unit;
    const isHalf = withinStar < STAR_SIZE / 2;
    return Math.max(1, Math.min(10, starIndex * 2 + (isHalf ? 1 : 2)));
  };

  const maybeHaptic = (newRating: number) => {
    if (newRating !== lastRatingRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastRatingRef.current = newRating;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const r = computeRating(evt.nativeEvent.pageX);
        maybeHaptic(r);
        onChange(r);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const r = computeRating(evt.nativeEvent.pageX);
        maybeHaptic(r);
        onChange(r);
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => onCommit(computeRating(evt.nativeEvent.pageX)),
    })
  ).current;

  const ratingOutOfFive = (rating ?? 0) / 2;

  return (
    <View
      style={styles.row}
      onLayout={(e) => {
        // @ts-ignore — measure findes på selve native-noden, ikke i typerne for onLayout-eventet
        e.target?.measure?.((_x: number, _y: number, _w: number, _h: number, pageX: number) => {
          containerPageX.current = pageX;
        });
      }}
      {...panResponder.panHandlers}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        let icon: keyof typeof Ionicons.glyphMap = 'star-outline';
        if (ratingOutOfFive >= star) icon = 'star';
        else if (ratingOutOfFive >= star - 0.5) icon = 'star-half';
        return <Ionicons key={star} name={icon} size={STAR_SIZE} color="#1A1A1A" />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: STAR_GAP, paddingVertical: 8 } });