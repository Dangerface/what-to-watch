import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStepNumber, getTotalSteps } from '../lib/flow';
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
  const { sourceType, vibes, toggleVibe } = useSessionStore();
  const totalSteps = getTotalSteps(sourceType);
  const step = getStepNumber('vibe', sourceType);

  return (
    <View style={styles.container}>
      <ScreenHeader step={step} totalSteps={totalSteps} />
      <Text style={styles.heading}>What kind of movie?</Text>

      <ScrollView contentContainerStyle={styles.chipWrap}>
        {VIBE_OPTIONS.map((option) => {
          const isSelected = vibes.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggleVibe(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable style={styles.nextButton} onPress={() => router.push('/results')}>
        <Text style={styles.nextButtonText}>Find movie</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginBottom: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 10 },
  chipSelected: { backgroundColor: '#1A1A1A' },
  chipText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600' },
  chipTextSelected: { color: '#E8B923' },
  nextButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, alignItems: 'center', marginVertical: 20 },
  nextButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});