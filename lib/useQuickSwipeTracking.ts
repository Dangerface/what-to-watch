import { useRef } from 'react';
import { ViewToken } from 'react-native';
import { addToSoftJail } from './storage';
import { Movie } from './tmdb';

const QUICK_SWIPE_THRESHOLD_MS = 1000;

export function useQuickSwipeTracking() {
  const activeRef = useRef<{ movie: Movie; startTime: number } | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const now = Date.now();

    if (activeRef.current) {
      const elapsed = now - activeRef.current.startTime;
      if (elapsed < QUICK_SWIPE_THRESHOLD_MS) {
        addToSoftJail(activeRef.current.movie);
      }
    }

    const current = viewableItems[0];
    activeRef.current = current?.item ? { movie: current.item as Movie, startTime: now } : null;
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 90 }).current;

  return { onViewableItemsChanged, viewabilityConfig };
}