import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, FlatList, Keyboard, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { processBatched } from '../lib/batch';
import { MoreLikeThisFeed } from '../lib/moreLikeThis';
import { getSelectedProviderIds } from '../lib/storage';
import { colors, radius, shadows, spacing, typography, zIndex } from '../lib/theme';
import { DiscoverFilters, fetchMovieAvailableOnProviders, Movie, searchMovies } from '../lib/tmdb';
import { useSessionStore } from '../store/session';
import { GlassSurface } from './GlassSurface';
import { InlineLoader } from './InlineLoader';
import LoopLoader from './LoopLoader';
import { MovieDetailCard } from './MovieDetailCard';
import { MovieListRow } from './MovieListRow';
import { Sheet, SheetHandle } from './Sheet';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 1500;
const VERIFY_BATCH_SIZE = 8;
const MLT_BATCH_SIZE = 12;
const SEARCH_BAR_KEYBOARD_GAP = 12;
const SEARCH_BAR_HIDE_DISTANCE = 120; // nok til at skubbe søgefeltet helt ud af arkets afklippede bund, skygge inkluderet
const SEARCH_BAR_REST_BOTTOM = 30;
const DISMISS_THRESHOLD_FRACTION = 0.3;
const PANEL_SLIDE_DURATION_MS = 300;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_TOP_GAP = 20; // afstand UNDER sikkerhedsområdet (notch / Dynamic Island), ikke fra skærmkanten
const DRAG_ZONE_HEIGHT = 70;
const ROW_HORIZONTAL_PADDING = 20;
const CLOSE_KEYBOARD_BUTTON_SIZE = 40;
const ROW_GAP = 10;
const FULL_INPUT_WIDTH = SCREEN_WIDTH - ROW_HORIZONTAL_PADDING * 2;
const SHRUNK_INPUT_WIDTH = FULL_INPUT_WIDTH - CLOSE_KEYBOARD_BUTTON_SIZE - ROW_GAP;

type Props = { visible: boolean; onClose: () => void };
type ViewMode = 'results' | 'detail' | 'mlt';

export function SearchModal({ visible, onClose }: Props) {
  const { familyFriendly, providerIds: sessionProviderIds, sourceType } = useSessionStore();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [onlyMyChannels, setOnlyMyChannels] = useState(false);
  const [rawResults, setRawResults] = useState<Movie[]>([]);
  const [displayedResults, setDisplayedResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [providerIds, setProviderIdsState] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchBarEnabled, setSearchBarEnabled] = useState(true);
  const searchBarHideY = useRef(new Animated.Value(0)).current;

  const [viewMode, setViewMode] = useState<ViewMode>('results');
  const [detailIndex, setDetailIndex] = useState(0);
  const [detailOpenToken, setDetailOpenToken] = useState(0);
  const panelTranslateX = useRef(new Animated.Value(0)).current;

  // "More like this" inde i modalet
  const [mltMovies, setMltMovies] = useState<Movie[]>([]);
  const [mltTitle, setMltTitle] = useState('');
  const [mltLoading, setMltLoading] = useState(false);
  const [mltLoadingMore, setMltLoadingMore] = useState(false);
  const [mltExhausted, setMltExhausted] = useState(false);
  const [mltToken, setMltToken] = useState(0);
  const mltFeedRef = useRef<MoreLikeThisFeed | null>(null);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBarTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getSelectedProviderIds().then((saved) => {
      if (saved) setProviderIdsState(saved);
    });
  }, []);

  // Selve åbne/lukke-animationen ligger nu i <Sheet>; her nulstiller vi kun modalens eget indhold.
  useEffect(() => {
    if (visible) {
      searchBarHideY.setValue(0);
      setSearchBarEnabled(true);
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setViewMode('results');
      panelTranslateX.setValue(0);
      mltFeedRef.current = null;
      setMltMovies([]);
    }
  }, [visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      const keyboardHeight = e.endCoordinates?.height ?? 300;
      const distance = keyboardHeight + SEARCH_BAR_KEYBOARD_GAP - SEARCH_BAR_REST_BOTTOM;

      Animated.spring(searchBarTranslateY, {
        toValue: -distance, useNativeDriver: true, mass: 3, stiffness: 1000, damping: 72, overshootClamping: true,
      }).start();
      Animated.spring(keyboardProgress, { toValue: 1, useNativeDriver: false, friction: 6, tension: 160 }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.spring(searchBarTranslateY, {
        toValue: 0, useNativeDriver: true, mass: 3, stiffness: 1000, damping: 500, overshootClamping: true,
      }).start();
      Animated.spring(keyboardProgress, { toValue: 0, useNativeDriver: false, friction: 8, tension: 160, overshootClamping: true }).start(
        () => setKeyboardVisible(false)
      );
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const searchInputWidth = keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [FULL_INPUT_WIDTH, SHRUNK_INPUT_WIDTH] });
  const closeKeyboardButtonScale = keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const closeKeyboardButtonOpacity = keyboardProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  const runSearch = async (text: string) => {
    setSearching(true);
    setCurrentPage(1);
    setTotalPages(1);
    try {
      const { movies, totalPages: pages } = await searchMovies(text.trim(), 1);
      setRawResults(movies.filter((m) => m.poster_path && m.vote_average > 0));
      setTotalPages(pages);
    } catch {
      setRawResults([]);
    } finally {
      setSearching(false);
    }
  };

  const loadMoreResults = async () => {
    if (loadingMore || currentPage >= totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const { movies } = await searchMovies(query.trim(), nextPage);
      const filtered = movies.filter((m) => m.poster_path && m.vote_average > 0);
      setRawResults((prev) => [...prev, ...filtered]);
      setCurrentPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < MIN_QUERY_LENGTH) {
      setRawResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS);
  };

  const handleClearQuery = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setRawResults([]);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!onlyMyChannels || providerIds.length === 0) {
      setDisplayedResults(rawResults);
      return;
    }
    let cancelled = false;
    setFiltering(true);
    processBatched(rawResults, VERIFY_BATCH_SIZE, async (movie) => {
      const available = await fetchMovieAvailableOnProviders(movie.id, providerIds, 'streamingOnly');
      return available ? movie : null;
    }).then((results) => {
      if (cancelled) return;
      setDisplayedResults(results.filter((m): m is Movie => m !== null));
      setFiltering(false);
    });
    return () => {
      cancelled = true;
    };
  }, [rawResults, onlyMyChannels, providerIds]);

  const isBusy = searching || filtering;
  const showEmptyState = !isBusy && displayedResults.length === 0;

  const handleCloseKeyboard = () => Keyboard.dismiss();
  const handleCloseModal = () => {
    Keyboard.dismiss();
    onClose();
  };

  const slideTo = (x: number, onDone?: () => void) => {
    Animated.timing(panelTranslateX, { toValue: x, duration: PANEL_SLIDE_DURATION_MS, useNativeDriver: true }).start(() => onDone?.());
  };

  const hideSearchBar = () => {
    setSearchBarEnabled(false);
    Animated.timing(searchBarHideY, { toValue: SEARCH_BAR_HIDE_DISTANCE, duration: 220, useNativeDriver: true }).start();
  };

  const showSearchBar = () => {
    setSearchBarEnabled(true);
    Animated.spring(searchBarHideY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
  };

  const openDetail = (index: number) => {
    Keyboard.dismiss();
    hideSearchBar();
    setDetailIndex(index);
    setDetailOpenToken((n) => n + 1);
    setViewMode('detail');
    slideTo(-SCREEN_WIDTH);
  };

  const backToResults = () => {
    slideTo(0, () => {
      setViewMode('results');
      showSearchBar(); // først når slidet tilbage er færdigt
    });
  };

  // Fra "more like this" går back til filmkortet, fra filmkortet til søgeresultaterne.
  const handleBack = () => {
    if (viewMode === 'mlt') {
      slideTo(-SCREEN_WIDTH, () => setViewMode('detail'));
    } else {
      backToResults();
    }
  };

  const openMoreLikeThis = async (movie: Movie) => {
    Keyboard.dismiss();
    hideSearchBar();

    // Samme filtre som den almindelige More like this-side (session-valg), med gemte tjenester som fallback.
    const filters: DiscoverFilters = {
      genreIds: [],
      maxRuntimeMinutes: null,
      familyFriendly,
      providerIds: sessionProviderIds.length > 0 ? sessionProviderIds : providerIds,
      sourceType,
    };
    const feed = new MoreLikeThisFeed(movie.id, filters);
    mltFeedRef.current = feed;

    setMltTitle(movie.title);
    setMltMovies([]);
    setMltExhausted(false);
    setMltLoading(true);
    setMltToken((n) => n + 1);
    setViewMode('mlt');
    slideTo(-2 * SCREEN_WIDTH);

    try {
      const batch = await feed.getNextBatch(MLT_BATCH_SIZE);
      if (mltFeedRef.current !== feed) return; // en nyere søgning har overtaget
      setMltMovies(batch);
      if (batch.length === 0) setMltExhausted(true);
    } catch {
      if (mltFeedRef.current === feed) setMltExhausted(true);
    } finally {
      if (mltFeedRef.current === feed) setMltLoading(false);
    }
  };

  const loadMoreMlt = async () => {
    const feed = mltFeedRef.current;
    if (!feed || mltLoading || mltLoadingMore || mltExhausted) return;
    setMltLoadingMore(true);
    try {
      const batch = await feed.getNextBatch(MLT_BATCH_SIZE);
      if (mltFeedRef.current !== feed) return;
      if (batch.length === 0) setMltExhausted(true);
      else setMltMovies((prev) => [...prev, ...batch]);
    } catch {
      // stille fejl — der er stadig film at swipe imellem
    } finally {
      setMltLoadingMore(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleCloseModal}
      zIndex={zIndex.searchModal}
      dismissFraction={DISMISS_THRESHOLD_FRACTION}
      sheetStyle={[styles.sheet, { top: insets.top + SHEET_TOP_GAP }]}
    >
      {(panHandlers) => (
        <>
          <View {...panHandlers}>
            <SheetHandle marginBottom={spacing.xs} />
          </View>

          {viewMode !== 'results' && (
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          )}
          <Pressable onPress={handleCloseModal} style={styles.doneButton} hitSlop={12}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>

          <View style={styles.dragZone} {...panHandlers} />

          <View style={styles.panelViewport}>
            <Animated.View style={[styles.panelRow, { transform: [{ translateX: panelTranslateX }] }]}>
              {/* Panel 1: søgeresultater */}
              <View style={styles.panel}>
                <View style={styles.resultsContent}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Only my streaming channels</Text>
                    <Switch value={onlyMyChannels} onValueChange={setOnlyMyChannels} />
                  </View>
                  <View style={styles.separator} />

                  {isBusy ? (
                    <InlineLoader style={styles.loading} />
                  ) : showEmptyState ? (
                    <Text style={styles.emptyText}>No results</Text>
                  ) : (
                    <FlatList
                      data={displayedResults}
                      keyExtractor={(item) => String(item.id)}
                      renderItem={({ item, index }) => <MovieListRow movie={item} onPress={() => openDetail(index)} />}
                      contentContainerStyle={styles.listContent}
                      keyboardShouldPersistTaps="handled"
                      onEndReachedThreshold={0.2}
                      onEndReached={loadMoreResults}
                      ListFooterComponent={loadingMore ? <InlineLoader style={{ marginVertical: 16 }} /> : null}
                    />
                  )}
                </View>
              </View>

              {/* Panel 2: filmkort, swipebart på tværs af søgeresultaterne */}
              <View style={styles.panel}>
                <FlatList
                  key={detailOpenToken}
                  data={displayedResults}
                  keyExtractor={(item) => String(item.id)}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={detailIndex}
                  getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                  renderItem={({ item }) => (
                    <MovieDetailCard
                      movie={item}
                      width={SCREEN_WIDTH}
                      topPadding={0}
                      onJailed={backToResults}
                      onMoreLikeThis={openMoreLikeThis}
                    />
                  )}
                />
              </View>

              {/* Panel 3: "more like this", swipebart */}
              <View style={styles.panel}>
                <Text style={styles.mltHeader} numberOfLines={1}>Ligner {mltTitle}</Text>
                {mltLoading ? (
                  <LoopLoader />
                ) : mltMovies.length === 0 ? (
                  <View style={styles.centerMessage}>
                    <Text style={styles.emptyText}>Fandt ingen lignende film der matcher jeres filtre.</Text>
                  </View>
                ) : (
                  <FlatList
                    key={mltToken}
                    data={mltMovies}
                    keyExtractor={(item) => String(item.id)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                    onEndReachedThreshold={0.5}
                    onEndReached={loadMoreMlt}
                    renderItem={({ item }) => (
                      <MovieDetailCard
                        movie={item}
                        width={SCREEN_WIDTH}
                        topPadding={0}
                        onJailed={() => setMltMovies((prev) => prev.filter((m) => m.id !== item.id))}
                        onMoreLikeThis={openMoreLikeThis}
                      />
                    )}
                    ListFooterComponent={
                      mltExhausted ? (
                        <View style={[styles.centerMessage, { width: SCREEN_WIDTH }]}>
                          <Text style={styles.emptyText}>Ikke flere lignende film at vise.</Text>
                        </View>
                      ) : null
                    }
                  />
                )}
              </View>
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.searchBarRow, { transform: [{ translateY: searchBarTranslateY }, { translateY: searchBarHideY }] }]}
            pointerEvents={searchBarEnabled ? 'auto' : 'none'}
          >
            <Animated.View style={[styles.searchInputOuter, { width: searchInputWidth }]}>
              <GlassSurface strength="strong" style={styles.searchInputWrapper}>
                {/* #4A4A4A og #6B6B6B er enkeltstående grå nuancer, ikke i theme endnu. */}
                <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={handleChangeText}
                  placeholder="Search movies"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  returnKeyType="search"
                  editable={searchBarEnabled}
                />
                {query.length > 0 && (
                  <Pressable onPress={handleClearQuery} style={styles.clearButton} hitSlop={10}>
                    <Ionicons name="close" size={14} color={colors.textOnDark} />
                  </Pressable>
                )}
              </GlassSurface>
            </Animated.View>

            <Animated.View
              style={[styles.closeKeyboardButtonOuter, { opacity: closeKeyboardButtonOpacity, transform: [{ scale: closeKeyboardButtonScale }] }]}
              pointerEvents={keyboardVisible ? 'auto' : 'none'}
            >
              <Pressable onPress={handleCloseKeyboard} style={{ flex: 1 }} hitSlop={10}>
                <GlassSurface strength="strong" style={styles.closeKeyboardButton}>
                  <Ionicons name="close" size={22} color={colors.ink} />
                </GlassSurface>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingTop: spacing.md, overflow: 'hidden' },
  backButton: { position: 'absolute', top: spacing.lg, left: spacing.xl, zIndex: zIndex.floatingControl, padding: spacing.xs },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: colors.textPrimary },
  doneButton: { position: 'absolute', top: spacing.lg, right: spacing.xl, zIndex: zIndex.floatingControl, padding: spacing.xs },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  dragZone: { height: DRAG_ZONE_HEIGHT },
  panelViewport: { flex: 1, overflow: 'hidden' },
  panelRow: { flexDirection: 'row', width: SCREEN_WIDTH * 3, flex: 1 },
  panel: { width: SCREEN_WIDTH },
  resultsContent: { flex: 1, paddingHorizontal: spacing.xl },
  mltHeader: { ...typography.h4, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xs },
  centerMessage: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  separator: { height: 1, backgroundColor: colors.divider, marginBottom: spacing.lg },
  loading: { marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  listContent: { paddingBottom: 100 },
  searchBarRow: {
    position: 'absolute', left: 0, right: 0, bottom: SEARCH_BAR_REST_BOTTOM,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: ROW_HORIZONTAL_PADDING, gap: ROW_GAP,
    ...shadows.floating,
  },
  searchInputOuter: { height: 46, borderRadius: radius.field, overflow: 'hidden' },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radius.field, paddingHorizontal: 14 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary },
  clearButton: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  closeKeyboardButtonOuter: { width: CLOSE_KEYBOARD_BUTTON_SIZE, height: CLOSE_KEYBOARD_BUTTON_SIZE },
  closeKeyboardButton: { flex: 1, borderRadius: CLOSE_KEYBOARD_BUTTON_SIZE / 2, justifyContent: 'center', alignItems: 'center' },
});