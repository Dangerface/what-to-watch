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
import { colors, spacing, typography } from '../lib/theme';
import { OutlineButton } from './OutlineButton';

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

      <OutlineButton label="Streaming-tjenester" onPress={() => onNavigate('/providers?fromSettings=true')} style={{ marginBottom: spacing.xl }} />

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
        minimumTrackTintColor={colors.ink}
        maximumTrackTintColor={colors.surface}
        thumbTintColor={colors.ink}
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
        minimumTrackTintColor={colors.ink}
        maximumTrackTintColor={colors.surface}
        thumbTintColor={colors.ink}
      />

      <View style={styles.tmdbContainer}>
        {/* TMDB-logoets grå og teksten nedenfor er enkeltstående farver, ikke i theme endnu. */}
        <Image source={TmdbLogo} style={styles.logo} tintColor={colors.textMuted} />
        <Text style={styles.tmdbText}>This product uses the TMDB API but is not endorsed or certified by TMDB.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 70 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  header: { ...typography.h2 },
  closeText: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl },
  toggleLabel: { ...typography.body, fontWeight: '600', flex: 1, marginRight: spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  sectionValue: { ...typography.caption, marginBottom: 6 },
  slider: { width: '100%', marginBottom: spacing.xxl },
  tmdbContainer: { paddingHorizontal: 50, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl, marginTop: 'auto' },
  tmdbText: { fontSize: 10, textAlign: 'center', color: colors.textSecondary, marginBottom: 10, lineHeight: 14 },
  logo: { width: 100, height: 30, resizeMode: 'contain' },
});