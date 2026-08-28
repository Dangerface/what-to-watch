import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { getTotalSteps } from '../lib/flow';
import { fetchWatchProviders, WatchProvider } from '../lib/tmdb';
import { useSessionStore } from '../store/session';

export default function ProvidersScreen() {
  const { sourceType, providerIds, toggleProvider } = useSessionStore();
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const totalSteps = getTotalSteps(sourceType);

  useEffect(() => {
    fetchWatchProviders('DK')
      .then(setProviders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  if (error) return <View style={styles.center}><Text>Kunne ikke hente streaming-tjenester.</Text></View>;

  return (
    <View style={styles.container}>
      <ScreenHeader step={2} totalSteps={totalSteps} />
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

      <Pressable
        style={[styles.nextButton, providerIds.length === 0 && styles.nextButtonDisabled]}
        disabled={providerIds.length === 0}
        onPress={() => router.push('/runtime')}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8B923' },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginBottom: 20 },
  grid: { paddingBottom: 20 },
  providerTile: { flex: 1, margin: 6, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 16, padding: 10, alignItems: 'center', maxWidth: '30%' },
  providerTileSelected: { backgroundColor: '#1A1A1A' },
  logo: { width: 40, height: 40, borderRadius: 8, marginBottom: 6 },
  providerName: { fontSize: 11, textAlign: 'center', color: '#1A1A1A' },
  providerNameSelected: { color: '#E8B923' },
  nextButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, alignItems: 'center', marginVertical: 20 },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});