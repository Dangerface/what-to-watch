import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import LoopLoader from '../components/LoopLoader';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStepNumber, getTotalSteps } from '../lib/flow';
import { colors, spacing, typography } from '../lib/theme';
import { fetchGenres, Genre } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

export default function GenreScreen() {
  const { showProvidersThisFlow, genreIds, toggleGenre } = useSessionStore();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const totalSteps = getTotalSteps(showProvidersThisFlow);
  const step = getStepNumber('genre', showProvidersThisFlow);

  useEffect(() => {
    fetchGenres()
      .then((data) => setGenres([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><LoopLoader /></View>;
  if (error) return <View style={styles.center}><Text>Kunne ikke hente genrer.</Text></View>;

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader step={step} totalSteps={totalSteps} />
      <Text style={styles.heading}>What genres do you like?</Text>

      <ScrollView contentContainerStyle={styles.chipWrap}>
        {genres.map((genre) => (
          <Chip key={genre.id} label={genre.name} selected={genreIds.includes(genre.id)} onPress={() => toggleGenre(genre.id)} />
        ))}
      </ScrollView>

      <PrimaryButton label="Next" onPress={() => router.push('/vibe')} style={styles.nextButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  heading: { ...typography.h2, textAlign: 'center', marginBottom: spacing.xl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  nextButton: { marginTop: spacing.xl, marginBottom: TAB_BAR_CLEARANCE },
});