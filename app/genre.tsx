import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStepNumber, getTotalSteps } from '../lib/flow';
import { fetchGenres, Genre } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

export default function GenreScreen() {
  const { sourceType, genreIds, toggleGenre } = useSessionStore();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const totalSteps = getTotalSteps(sourceType);
  const step = getStepNumber('genre', sourceType);

  useEffect(() => {
    fetchGenres()
      .then((data) => setGenres([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  if (error) return <View style={styles.center}><Text>Kunne ikke hente genrer.</Text></View>;

  return (
    <View style={styles.container}>
      <ScreenHeader step={step} totalSteps={totalSteps} />
      <Text style={styles.heading}>What genres do you like?</Text>

      <ScrollView contentContainerStyle={styles.chipWrap}>
        {genres.map((genre) => {
          const isSelected = genreIds.includes(genre.id);
          return (
            <Pressable key={genre.id} onPress={() => toggleGenre(genre.id)} style={[styles.chip, isSelected && styles.chipSelected]}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{genre.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable style={styles.nextButton} onPress={() => router.push('/vibe')}>
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923' },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginBottom: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 10 },
  chipSelected: { backgroundColor: '#1A1A1A' },
  chipText: { fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  chipTextSelected: { color: '#E8B923' },
  nextButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, alignItems: 'center', marginVertical: 20 },
  nextButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});