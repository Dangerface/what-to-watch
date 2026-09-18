import { useEffect, useRef } from 'react';
import { ViewToken } from 'react-native';
import { addToSoftJail, getSoftJailThresholdMs, releaseFromSoftJail } from './storage';
import { Movie } from './tmdb';

export function useQuickSwipeTracking() {
  const activeRef = useRef<{ movie: Movie; startTime: number } | null>(null);
  const thresholdRef = useRef(1000);

  useEffect(() => {
    getSoftJailThresholdMs().then((ms) => {
      thresholdRef.current = ms;
    });
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const now = Date.now();

    if (activeRef.current) {
      const elapsed = now - activeRef.current.startTime;
      if (elapsed < thresholdRef.current) {
        addToSoftJail(activeRef.current.movie);
      } else {
        // Blev set ordentligt denne gang — frigiv den, hvis den sad i Soft Jail fra en tidligere, hurtig visning.
        releaseFromSoftJail(activeRef.current.movie.id);
      }
    }

    const current = viewableItems[0];
    activeRef.current = current?.item ? { movie: current.item as Movie, startTime: now } : null;
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 90 }).current;

  return { onViewableItemsChanged, viewabilityConfig };
}