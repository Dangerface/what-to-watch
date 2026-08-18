import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSessionStore } from '../store/session';

const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

export default function DecadeScreen() {
  const { persons, currentPersonIndex, toggleDecade, goToNextPerson } = useSessionStore();
  const selectedDecades = persons[currentPersonIndex]?.decades ?? [];
  const isLastPerson = currentPersonIndex === persons.length - 1;

  const handleNext = () => {
    if (isLastPerson) {
      router.push('/results');
    } else {
      goToNextPerson();
      router.push('/name');
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader step={3} personName={persons[currentPersonIndex]?.name} />
      <Text style={styles.heading}>Which decades?</Text>

      <ScrollView contentContainerStyle={styles.chipWrap}>
        {DECADES.map((decade) => {
          const isSelected = selectedDecades.includes(decade);
          return (
            <Pressable key={decade} onPress={() => toggleDecade(decade)} style={[styles.chip, isSelected && styles.chipSelected]}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{decade}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>{isLastPerson ? 'Find movie' : 'Next person'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginBottom: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 10 },
  chipSelected: { backgroundColor: '#1A1A1A' },
  chipText: { fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  chipTextSelected: { color: '#E8B923' },
  nextButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, alignItems: 'center', marginVertical: 20 },
  nextButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});