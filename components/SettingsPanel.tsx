import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import TmdbLogo from '../assets/images/tmdblogo.png';
import {
  getExcludeWatchedMovies,
  getSoftJailDurationDays,
  getSoftJailThresholdMs,
  setExcludeWatchedMovies,
  setSoftJailDurationDays,
  setSoftJailThresholdMs,
} from '../lib/storage';

type Props = {
  onNavigate: (path: string) => void;
  onClose: () => void;
};

const DURATION_STEPS = [3, 7, 10, 14, 30, 60];
const THRESHOLD_STEPS = [300, 500, 700, 1000, 1300, 1500, 3000];

function indexForDuration(days: number | null): number {
  const found = days != null ? DURATION_STEPS.indexOf(days) : -1;
  return found === -1 ? 0 : found;
}

function indexForThreshold(ms: number | null): number {
  const found = ms != null ? THRESHOLD_STEPS.indexOf(ms) : -1;
  return found === -1 ? 6 : found;
}

export function SettingsPanel({ onNavigate, onClose }: Props) {
  const [durationDays, setDurationDaysState] = useState<number | null>(null);
  const [thresholdMs, setThresholdMsState] = useState<number | null>(null);
  const [excludeWatched, setExcludeWatchedState] = useState<boolean | null>(null);

  useEffect(() => {
    getSoftJailDurationDays().then(setDurationDaysState);
    getSoftJailThresholdMs().then(setThresholdMsState);
    getExcludeWatchedMovies().then(setExcludeWatchedState);
  }, []);

  const handleSelectDuration = async (days: number) => {
    setDurationDaysState(days);
    await setSoftJailDurationDays(days);
  };

  const handleSelectThreshold = async (ms: number) => {
    setThresholdMsState(ms);
    await setSoftJailThresholdMs(ms);
  };

  const handleToggleExcludeWatched = async (value: boolean) => {
    setExcludeWatchedState(value);
    await setExcludeWatchedMovies(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Settings</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <Pressable style={styles.optionButton} onPress={() => onNavigate('/providers?fromSettings=true')}>
        <Text style={styles.optionText}>Streaming-tjenester</Text>
      </Pressable>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Exclude watched movies from search</Text>
        <Switch value={excludeWatched ?? true} onValueChange={handleToggleExcludeWatched} />
      </View>

      <Text style={styles.sectionLabel}>Soft Jail — hvor længe en film bliver der</Text>
      <Text style={styles.sectionValue}>{durationDays ?? '...'} dage</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={DURATION_STEPS.length - 1}
        step={1}
        value={indexForDuration(durationDays)}
        onValueChange={(index) => {
          const days = DURATION_STEPS[Math.round(index)];
          if (days !== durationDays) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleSelectDuration(days);
          }
        }}
        minimumTrackTintColor="#1A1A1A"
        maximumTrackTintColor="#FFFFFF"
        thumbTintColor="#1A1A1A"
      />

      <Text style={styles.sectionLabel}>Soft Jail — hvor hurtigt et swipe tæller</Text>
      <Text style={styles.sectionValue}>{thresholdMs != null ? (thresholdMs / 1000).toFixed(1) : '...'} sek</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={THRESHOLD_STEPS.length - 1}
        step={1}
        value={indexForThreshold(thresholdMs)}
        onValueChange={(index) => {
          const ms = THRESHOLD_STEPS[Math.round(index)];
          if (ms !== thresholdMs) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleSelectThreshold(ms);
          }
        }}
        minimumTrackTintColor="#1A1A1A"
        maximumTrackTintColor="#FFFFFF"
        thumbTintColor="#1A1A1A"
      />

      <View style={styles.tmdbContainer}>
        <Image source={TmdbLogo} style={styles.logo} tintColor="#55565A" />
        <Text style={styles.tmdbText}>This product uses the TMDB API but is not endorsed or certified by TMDB.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 70 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  header: { fontFamily: 'Gabarito-Bold', fontSize: 24 },
  closeText: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  optionButton: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginBottom: 20 },
  optionText: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  sectionValue: { fontSize: 13, color: '#1A1A1A', marginBottom: 6 },
  slider: { width: '100%', marginBottom: 24 },
  tmdbContainer: { paddingHorizontal: 50, alignItems: 'center', justifyContent: 'center', marginVertical: 20, marginTop: 'auto' },
  tmdbText: { fontSize: 10, textAlign: 'center', color: '#333', marginBottom: 10, lineHeight: 14 },
  logo: { width: 100, height: 30, resizeMode: 'contain' },
});