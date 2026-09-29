import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Keyboard, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { processBatched } from '../lib/batch';
import { getSelectedProviderIds } from '../lib/storage';
import { fetchMovieAvailableOnProviders, Movie, searchMovies } from '../lib/tmdb';
import { MovieListRow } from './MovieListRow';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 1500;
const VERIFY_BATCH_SIZE = 8;
const SEARCH_BAR_KEYBOARD_GAP = 12;
const SEARCH_BAR_REST_BOTTOM = 30;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROW_HORIZONTAL_PADDING = 20;
const CLOSE_KEYBOARD_BUTTON_SIZE = 40;
const ROW_GAP = 10;
const FULL_INPUT_WIDTH = SCREEN_WIDTH - ROW_HORIZONTAL_PADDING * 2;
const SHRUNK_INPUT_WIDTH = FULL_INPUT_WIDTH - CLOSE_KEYBOARD_BUTTON_SIZE - ROW_GAP;

type Props = { visible: boolean; onClose: () => void };

export function SearchModal({ visible, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [onlyMyChannels, setOnlyMyChannels] = useState(false);
  const [rawResults, setRawResults] = useState<Movie[]>([]);
  const [displayedResults, setDisplayedResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [providerIds, setProviderIdsState] = useState<number[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBarTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getSelectedProviderIds().then((saved) => {
      if (saved) setProviderIdsState(saved);
    });
  }, []);

  useEffect(() => {
    Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
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
    try {
      const results = await searchMovies(text.trim());
      setRawResults(results.filter((m) => m.poster_path && m.vote_average > 0));
    } catch {
      setRawResults([]);
    } finally {
      setSearching(false);
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
  const showingResults = !isBusy && displayedResults.length > 0;

  const handleCloseKeyboard = () => Keyboard.dismiss();
  const handleBackWithinSearch = () => {
    setQuery('');
    setRawResults([]);
    Keyboard.dismiss();
  };
  const handleCloseModal = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Animated.View style={[styles.root, { opacity: overlayOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable onPress={handleCloseModal} style={styles.closeModalButton} hitSlop={12}>
        <Ionicons name="close" size={26} color="#1A1A1A" />
      </Pressable>

      <View style={styles.topSection}>
        {showingResults && (
          <Pressable onPress={handleBackWithinSearch} style={styles.backButton} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        )}

        <View style={[styles.toggleRow, showingResults && styles.toggleRowWithBack]}>
          <Text style={styles.toggleLabel}>Only my streaming channels</Text>
          <Switch value={onlyMyChannels} onValueChange={setOnlyMyChannels} />
        </View>
        <View style={styles.separator} />

        {isBusy ? (
          <ActivityIndicator style={styles.loading} color="#1A1A1A" />
        ) : showEmptyState ? (
          <Text style={styles.emptyText}>No results</Text>
        ) : (
          <FlatList
            data={displayedResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <MovieListRow movie={item} onBeforeNavigate={onClose} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      <Animated.View style={[styles.searchBarRow, { transform: [{ translateY: searchBarTranslateY }] }]}>
        <Animated.View style={[styles.searchInputOuter, { width: searchInputWidth }]}>
          <BlurView intensity={80} tint="light" style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#4A4A4A" style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={handleChangeText}
              placeholder="Search movies"
              placeholderTextColor="#6B6B6B"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </BlurView>
        </Animated.View>

        <Animated.View
          style={[styles.closeKeyboardButtonOuter, { opacity: closeKeyboardButtonOpacity, transform: [{ scale: closeKeyboardButtonScale }] }]}
          pointerEvents={keyboardVisible ? 'auto' : 'none'}
        >
          <Pressable onPress={handleCloseKeyboard} style={{ flex: 1 }} hitSlop={10}>
            <BlurView intensity={80} tint="light" style={styles.closeKeyboardButton}>
              <Ionicons name="close" size={22} color="#1A1A1A" />
            </BlurView>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8B923', zIndex: 50 },
  closeModalButton: { position: 'absolute', top: 60, right: 20, zIndex: 20, padding: 4 },
  topSection: { flex: 1, paddingHorizontal: 20, paddingTop: 125 },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  toggleRowWithBack: { marginTop: 4 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  separator: { height: 1, backgroundColor: 'rgba(26,26,26,0.15)', marginBottom: 16 },
  loading: { marginTop: 24 },
  emptyText: { fontSize: 15, color: '#5A5A5A' },
  listContent: { paddingBottom: 100 },
  searchBarRow: {
    position: 'absolute', left: 0, right: 0, bottom: SEARCH_BAR_REST_BOTTOM,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: ROW_HORIZONTAL_PADDING, gap: ROW_GAP,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  searchInputOuter: { height: 46, borderRadius: 24, overflow: 'hidden' },
  searchInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.3)',
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  closeKeyboardButtonOuter: { width: CLOSE_KEYBOARD_BUTTON_SIZE, height: CLOSE_KEYBOARD_BUTTON_SIZE },
  closeKeyboardButton: {
    flex: 1, borderRadius: CLOSE_KEYBOARD_BUTTON_SIZE / 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.3)',
  },
});