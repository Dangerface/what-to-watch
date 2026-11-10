import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStepNumber, getTotalSteps } from '../lib/flow';
import { colors, spacing, typography } from '../lib/theme';
import { useSessionStore, Vibe } from '../store/session';

const VIBE_OPTIONS: { value: Vibe; label: string }[] = [
  { value: 'classics', label: 'Klassisk' },
  { value: 'cult', label: 'Cult' },
  { value: 'mustWatch', label: 'Must Watch' },
  { value: 'hiddenGem', label: 'Hidden gem' },
  { value: 'awardWinners', label: 'Award winners' },
  { value: 'trending', label: 'Trending' },
];

export default function VibeScreen() {
  const { showProvidersThisFlow, vibes, toggleVibe } = useSessionStore();
  const totalSteps = getTotalSteps(showProvidersThisFlow);
  const step = getStepNumber('vibe', showProvidersThisFlow);

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader step={step} totalSteps={totalSteps} />
      <Text style={styles.heading}>What kind of movie?</Text>

      <ScrollView contentContainerStyle={styles.chipWrap}>
        {VIBE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={vibes.includes(option.value)}
            onPress={() => toggleVibe(option.value)}
          />
        ))}
      </ScrollView>

      <PrimaryButton
        label="Find movie"
        onPress={() => router.push({ pathname: '/results', params: { searchId: Date.now().toString() } })}
        style={styles.nextButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  heading: { ...typography.h2, textAlign: 'center', marginBottom: spacing.xl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  nextButton: { marginTop: spacing.xl, marginBottom: TAB_BAR_CLEARANCE },
});