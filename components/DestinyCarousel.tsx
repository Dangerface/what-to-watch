import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Movie } from '../lib/tmdb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = 130;
const POSTER_HEIGHT = 195;
const ITEM_SPACING = 24;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;
const SIDE_INSET = (SCREEN_WIDTH - ITEM_WIDTH) / 2;
const FOCUS_SCALE = 1.25;
const UNFOCUS_SCALE = 0.75;
const TITLE_MARGIN_TOP = 8;
const TITLE_HEIGHT = 40;
const GROUP_HEIGHT = POSTER_HEIGHT + TITLE_MARGIN_TOP + TITLE_HEIGHT;

export const CAROUSEL_HEIGHT = Math.ceil(GROUP_HEIGHT * FOCUS_SCALE) + 16;
export const CAROUSEL_SNAP_INTERVAL = SNAP_INTERVAL;
export const FOCUS_POSTER_WIDTH = ITEM_WIDTH * FOCUS_SCALE;
export const FOCUS_POSTER_HEIGHT = POSTER_HEIGHT * FOCUS_SCALE;
export const UNFOCUS_POSTER_WIDTH = ITEM_WIDTH * UNFOCUS_SCALE;
export const UNFOCUS_POSTER_HEIGHT = POSTER_HEIGHT * UNFOCUS_SCALE;
export const FOCUS_POSTER_CENTER_OFFSET_Y = -((TITLE_MARGIN_TOP + TITLE_HEIGHT) / 2) * FOCUS_SCALE;
export const UNFOCUS_POSTER_CENTER_OFFSET_Y = -((TITLE_MARGIN_TOP + TITLE_HEIGHT) / 2) * UNFOCUS_SCALE;
// Distance from the top of the carousel box to the top of the focused poster.
export const FOCUS_POSTER_TOP_INSET = (CAROUSEL_HEIGHT - GROUP_HEIGHT * FOCUS_SCALE) / 2;

type Props = {
  movies: Movie[];
  onCenteredChange: (movie: Movie | null) => void;
  onSelect: (movie: Movie) => void;
  entranceFrom?: 'right' | 'none';
  locked?: boolean;
};

export function DestinyCarousel({ movies, onCenteredChange, onSelect, entranceFrom = 'right', locked = false }: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const entranceX = useRef(new Animated.Value(entranceFrom === 'right' ? SCREEN_WIDTH : 0)).current;
  const listRef = useRef<any>(null);

  const moviesRef = useRef(movies);
  const onCenteredRef = useRef(onCenteredChange);
  const onSelectRef = useRef(onSelect);
  const lockedRef = useRef(locked);
  const offsetXRef = useRef(0);
  const lastIdRef = useRef<number | null>(null);
  moviesRef.current = movies;
  onCenteredRef.current = onCenteredChange;
  onSelectRef.current = onSelect;
  lockedRef.current = locked;

  const reportCentered = () => {
    const list = moviesRef.current;
    const index = Math.max(0, Math.min(Math.round(offsetXRef.current / SNAP_INTERVAL), list.length - 1));
    const movie = list[index] ?? null;
    const id = movie?.id ?? null;
    if (id !== lastIdRef.current) {
      lastIdRef.current = id;
      onCenteredRef.current(movie);
    }
  };

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: true,
      listener: (e: any) => {
        offsetXRef.current = e.nativeEvent.contentOffset.x;
        reportCentered();
      },
    })
  ).current;

  useEffect(() => {
    Animated.spring(entranceX, { toValue: 0, useNativeDriver: true, friction: 9, tension: 50 }).start();
  }, []);

  useEffect(() => {
    reportCentered();
  }, [movies]);

  const handlePosterPress = (movie: Movie, index: number) => {
    if (lockedRef.current) return;
    if (lastIdRef.current === movie.id) {
      onSelectRef.current(movie);
      return;
    }
    // A poster that isn't focused is brought to the center first.
    const list = listRef.current;
    const node = list?.scrollToOffset ? list : list?.getNode?.();
    node?.scrollToOffset?.({ offset: index * SNAP_INTERVAL, animated: true });
  };

  return (
    <Animated.View style={{ transform: [{ translateX: entranceX }] }}>
      <Animated.FlatList
        ref={listRef}
        data={movies}
        keyExtractor={(item: Movie) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        scrollEnabled={!locked}
        style={{ height: CAROUSEL_HEIGHT }}
        contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }: { item: Movie; index: number }) => {
          const inputRange = [(index - 1) * SNAP_INTERVAL, index * SNAP_INTERVAL, (index + 1) * SNAP_INTERVAL];
          const scale = scrollX.interpolate({ inputRange, outputRange: [UNFOCUS_SCALE, FOCUS_SCALE, UNFOCUS_SCALE], extrapolate: 'clamp' });
          const titleOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

          return (
            <View style={styles.itemWrapper}>
              <Animated.View style={[styles.scaleGroup, { transform: [{ scale }] }]}>
                <Pressable onPress={() => handlePosterPress(item, index)} style={styles.pressArea}>
                  {item.poster_path && (
                    <Animated.Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.poster_path}` }} style={styles.poster} />
                  )}
                  <View style={styles.titleBox}>
                    <Animated.Text style={[styles.title, { opacity: titleOpacity }]} numberOfLines={2}>
                      {item.title} ({item.release_date?.slice(0, 4)})
                    </Animated.Text>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          );
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  itemWrapper: { width: ITEM_WIDTH, marginRight: ITEM_SPACING, height: CAROUSEL_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  scaleGroup: { alignItems: 'center' },
  pressArea: { alignItems: 'center' },
  poster: { width: ITEM_WIDTH, height: POSTER_HEIGHT, borderRadius: 12 },
  titleBox: { height: TITLE_HEIGHT, width: ITEM_WIDTH, marginTop: TITLE_MARGIN_TOP },
  title: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
});