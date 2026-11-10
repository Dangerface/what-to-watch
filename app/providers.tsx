import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../components/BackButton';
import { TAB_BAR_CLEARANCE } from '../components/GlobalTabBar';
import LoopLoader from '../components/LoopLoader';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { getTotalSteps } from '../lib/flow';
import { getSelectedProviderIds, saveSelectedProviderIds } from '../lib/storage';
import { colors, radius, spacing, typography } from '../lib/theme';
import { fetchWatchProviders, WatchProvider } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

export default function ProvidersScreen() {
  const { fromSettings } = useLocalSearchParams<{ fromSettings?: string }>();
  const isFromSettings = fromSettings === 'true';

  const { providerIds, toggleProvider, setProviderIds } = useSessionStore();
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const totalSteps = getTotalSteps(true); // skærmen vises kun når providers reelt skal vælges

  useEffect(() => {
    fetchWatchProviders('DK')
      .then(setProviders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    if (isFromSettings) {
      getSelectedProviderIds().then((saved) => {
        if (saved) setProviderIds(saved);
      });
    }
  }, []);

  const handleNext = async () => {
    await saveSelectedProviderIds(providerIds);
    if (isFromSettings) {
      router.back();
    } else {
      router.push('/runtime');
    }
  };

  if (loading) return <View style={styles.center}><LoopLoader /></View>;
  if (error) return <View style={styles.center}><Text>Kunne ikke hente streaming-tjenester.</Text></View>;

  return (
    <View style={styles.container}>
      {isFromSettings ? <BackButton /> : <ScreenHeader step={2} totalSteps={totalSteps} />}
      <Text style={styles.heading}>Hvilke tjenester har I?</Text>

      <FlatList
        data={providers}
        keyExtractor={(item) => String(item.provider_id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const isSelected = providerIds.includes(item.provider_id);
          return (
            <Pressable
              onPress={() => toggleProvider(item.provider_id)}
              style={[styles.providerTile, isSelected && styles.providerTileSelected]}
            >
              {item.logo_path && (
                <Image source={{ uri: `https://image.tmdb.org/t/p/w92${item.logo_path}` }} style={styles.logo} />
              )}
              <Text style={[styles.providerName, isSelected && styles.providerNameSelected]} numberOfLines={2}>
                {item.provider_name}
              </Text>
            </Pressable>
          );
        }}
      />

      <PrimaryButton
        label={isFromSettings ? 'Gem' : 'Next'}
        onPress={handleNext}
        disabled={providerIds.length === 0}
        style={styles.nextButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  heading: { ...typography.h2, textAlign: 'center', marginTop: 40, marginBottom: spacing.xl },
  grid: { paddingBottom: spacing.xl },
  providerTile: { flex: 1, margin: 6, borderWidth: 2, borderColor: colors.ink, borderRadius: 16, padding: 10, alignItems: 'center', maxWidth: '30%' },
  providerTileSelected: { backgroundColor: colors.ink },
  logo: { width: 40, height: 40, borderRadius: radius.sm, marginBottom: 6 },
  providerName: { fontSize: 11, textAlign: 'center', color: colors.textPrimary },
  providerNameSelected: { color: colors.background },
  nextButton: { marginTop: spacing.xl, marginBottom: TAB_BAR_CLEARANCE },
});