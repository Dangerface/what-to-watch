import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import StartupLoader from '../components/SplashScreen';
import { checkStartupConnectivity, StartupCheckResult } from '../lib/startup';
import { useUIStore } from '../store/ui';

type ScreenState = 'loading' | 'success' | StartupCheckResult;

export default function IndexScreen() {
  const hasStarted = useUIStore((s) => s.hasStarted);
  const setHasStarted = useUIStore((s) => s.setHasStarted);
  
  // If already started, default directly to success/ready, otherwise 'loading'
  const [state, setState] = useState<ScreenState>(hasStarted ? 'success' : 'loading');
  const setTabBarHidden = useUIStore((s) => s.setTabBarHidden);

  useEffect(() => {
    setTabBarHidden(state === 'loading');
  }, [state]);

  const runChecks = async () => {
    const result = await checkStartupConnectivity();
    setState(result);
    setHasStarted(true); // Mark startup as done so it never triggers again this session
  };

  const handleLoaderFinish = () => {
    runChecks();
  };

  if (state === 'loading') {
    return <StartupLoader onFinish={handleLoaderFinish} />;
  }

  if (state === 'no-internet') {
    return (
      <View style={styles.container}>
        <Ionicons name="cloud-offline-outline" size={64} color="#1A1A1A" style={styles.icon} />
        <Text style={styles.errorText}>It looks like you're out of WhyPhy</Text>
        <Pressable style={styles.retryButton} onPress={runChecks}>
          <Text style={styles.retryButtonText}>Prøv igen</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'no-tmdb') {
    return (
      <View style={styles.container}>
        <Ionicons name="planet-outline" size={64} color="#1A1A1A" style={styles.icon} />
        <Text style={styles.errorText}>Unable to reach the mothership TMDB.com</Text>
        <Pressable style={styles.retryButton} onPress={runChecks}>
          <Text style={styles.retryButtonText}>Prøv igen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What to Watch</Text>
      <Pressable style={styles.primaryButton} onPress={() => router.push('/source-type')}>
        <Text style={styles.primaryButtonText}>Find Movie</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 36, textAlign: 'center', marginBottom: 60 },
  primaryButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, paddingHorizontal: 60, borderRadius: 40, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  icon: { marginBottom: 20 },
  errorText: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center', marginBottom: 30 },
  retryButton: { borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 40 },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
});