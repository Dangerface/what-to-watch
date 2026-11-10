import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LoopLoader from '../components/LoopLoader';
import { OutlineButton } from '../components/OutlineButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { getTotalSteps } from '../lib/flow';
import { getSelectedProviderIds } from '../lib/storage';
import { colors, spacing, typography } from '../lib/theme';
import { useSessionStore } from '../store/session';

export default function SourceTypeScreen() {
  const { setSourceType, showProvidersThisFlow, setShowProvidersThisFlow, setProviderIds } = useSessionStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSelectedProviderIds().then((saved) => {
      if (saved === null) {
        setShowProvidersThisFlow(true); // aldrig valgt før — vis skærmen denne gang
      } else {
        setShowProvidersThisFlow(false);
        setProviderIds(saved); // genbrug det gemte valg
      }
      setReady(true);
    });
  }, []);

  const totalSteps = getTotalSteps(showProvidersThisFlow);

  const choose = (type: 'streamingOnly' | 'includeRental') => {
    setSourceType(type);
    router.push(showProvidersThisFlow ? '/providers' : '/runtime');
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ScreenBackground />
        <LoopLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader step={1} totalSteps={totalSteps} />
      <Text style={styles.heading}>Hvor skal filmene findes?</Text>

      <OutlineButton label="Kun streaming" onPress={() => choose('streamingOnly')} size="lg" />
      <OutlineButton label="Også lejefilm" onPress={() => choose('includeRental')} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  // 26 ligger mellem h2 (24) og h1 (28) — samles i Trin 4.
  heading: { ...typography.h2, textAlign: 'center', marginBottom: 40 },
});