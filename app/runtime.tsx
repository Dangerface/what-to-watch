import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStepNumber, getTotalSteps } from '../lib/flow';
import { useSessionStore } from '../store/session';

const RUNTIME_STEPS: { label: string; minutes: number | null }[] = [
  { label: '25 min', minutes: 25 },
  { label: '1t', minutes: 60 },
  { label: '1t30', minutes: 90 },
  { label: '2t', minutes: 120 },
  { label: '2t30', minutes: 150 },
  { label: '3t', minutes: 180 },
  { label: '+4t', minutes: null }, // null = ingen grænse
];

function indexForMinutes(minutes: number | null): number {
  const found = RUNTIME_STEPS.findIndex((s) => s.minutes === minutes);
  return found === -1 ? 3 : found; // fallback til 2t
}

export default function RuntimeScreen() {
  const { sourceType, maxRuntimeMinutes, setMaxRuntime, familyFriendly, setFamilyFriendly } = useSessionStore();
  const totalSteps = getTotalSteps(sourceType);
  const step = getStepNumber('runtime', sourceType);
  const currentIndex = indexForMinutes(maxRuntimeMinutes);

  const handleChange = (index: number) => {
    const rounded = Math.round(index);
    if (rounded !== currentIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMaxRuntime(RUNTIME_STEPS[rounded].minutes);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader step={step} totalSteps={totalSteps} />
      <Text style={styles.heading}>How long can the movie be?</Text>
      <Text style={styles.value}>{RUNTIME_STEPS[currentIndex].label}</Text>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={RUNTIME_STEPS.length - 1}
        step={1}
        value={currentIndex}
        onValueChange={handleChange}
        minimumTrackTintColor="#1A1A1A"
        maximumTrackTintColor="#FFFFFF"
        thumbTintColor="#1A1A1A"
      />

      <View style={styles.stepLabels}>
        <Text style={styles.stepLabelText}>25 min</Text>
        <Text style={styles.stepLabelText}>+4t</Text>
      </View>

      <Pressable style={styles.checkboxRow} onPress={() => setFamilyFriendly(!familyFriendly)}>
        <View style={[styles.checkbox, familyFriendly && styles.checkboxChecked]}>
          {familyFriendly && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>Family friendly</Text>
      </Pressable>

      <Pressable style={styles.nextButton} onPress={() => router.push('/genre')}>
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 20 },
  value: { fontFamily: 'Gabarito-Bold', fontSize: 40, textAlign: 'center', marginBottom: 20 },
  slider: { width: '100%', marginBottom: 4 },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 50 },
  stepLabelText: { fontSize: 13, color: '#1A1A1A' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 50 },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#1A1A1A' },
  checkmark: { color: '#E8B923', fontWeight: 'bold' },
  checkboxLabel: { fontSize: 18, fontWeight: '600' },
  nextButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});