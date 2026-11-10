import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { checkStartupConnectivity, StartupCheckResult } from '../lib/startup';
import { colors, spacing, typography, zIndex } from '../lib/theme';
import { useUIStore } from '../store/ui';
import { OutlineButton } from './OutlineButton';
import StartupLoader from './SplashScreen';

type Phase = 'cold-animating' | 'checking' | 'ok' | StartupCheckResult;

export function SplashOverlay() {
  const hasStarted = useUIStore((s) => s.hasStarted);
  const setHasStarted = useUIStore((s) => s.setHasStarted);
  const pendingSilentCheck = useUIStore((s) => s.pendingSilentCheck);
  const setPendingSilentCheck = useUIStore((s) => s.setPendingSilentCheck);
  const setTabBarHidden = useUIStore((s) => s.setTabBarHidden);

  const [phase, setPhase] = useState<Phase>(hasStarted ? 'ok' : 'cold-animating');
  const [assetsReady, setAssetsReady] = useState(false);
  const handledSilentRef = useRef(false);

  useEffect(() => {
    if (hasStarted) return;
    (async () => {
      try {
        await Asset.loadAsync(require('../assets/images/vhs-tape.png'));
      } catch {
        // If preloading fails for some reason, proceed anyway rather than block the app entirely.
      }
      // A small buffer so the audio subsystem has had a moment to initialize on a true cold
      // launch, before StartupLoader mounts and immediately tries to play its sound.
      await new Promise((r) => setTimeout(r, 150));
      setAssetsReady(true);
    })();
  }, []);

  const runColdChecks = async () => {
    setPhase('checking');
    const result = await checkStartupConnectivity();
    if (result === 'ok') {
      setHasStarted(true);
      setPhase('ok');
    } else {
      setPhase(result);
    }
  };

  const retryFromError = () => {
    if (hasStarted) {
      setPendingSilentCheck(true);
    } else {
      runColdChecks();
    }
  };

  // Resume from background: no animation, no visible UI at all unless something's wrong.
  useEffect(() => {
    if (!pendingSilentCheck || handledSilentRef.current) return;
    handledSilentRef.current = true;

    checkStartupConnectivity().then((result) => {
      setPendingSilentCheck(false);
      handledSilentRef.current = false;
      if (result !== 'ok') setPhase(result);
    });
  }, [pendingSilentCheck]);

  const showingBlockingUI = phase !== 'ok';

  useEffect(() => {
    setTabBarHidden(showingBlockingUI);
  }, [showingBlockingUI]);

  if (phase === 'ok') return null;
  if (phase === 'checking') return <View style={styles.root} />;

  if (phase === 'cold-animating') {
    if (!assetsReady) return <View style={styles.root} />;
    return (
      <View style={styles.root}>
        <StartupLoader onFinish={runColdChecks} />
      </View>
    );
  }

  if (phase === 'no-internet') {
    return (
      <View style={styles.root}>
        <View style={styles.container}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.ink} style={styles.icon} />
          <Text style={styles.errorText}>It looks like you're out of WhyPhy</Text>
          <OutlineButton label="Prøv igen" onPress={retryFromError} size="sm" style={{ marginBottom: 0 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <Ionicons name="planet-outline" size={64} color={colors.ink} style={styles.icon} />
        <Text style={styles.errorText}>Unable to reach the mothership TMDB.com</Text>
        <OutlineButton label="Prøv igen" onPress={retryFromError} size="sm" style={{ marginBottom: 0 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, zIndex: zIndex.splash },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  icon: { marginBottom: spacing.xl },
  errorText: { ...typography.h3, textAlign: 'center', marginBottom: 30 },
});