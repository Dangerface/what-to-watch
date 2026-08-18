import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { step: 1 | 2 | 3; personName?: string };

export function ScreenHeader({ step, personName }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.stepLabel}>{step}/3</Text>
      </View>
      {personName ? <Text style={styles.personName}>{personName}</Text> : null}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${(step / 3) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backButton: { padding: 4 },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  stepLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  barTrack: { height: 6, backgroundColor: '#FFFFFF', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#1A1A1A', borderRadius: 3 },
  personName: { fontFamily: 'Gabarito-Bold', fontSize: 20, textAlign: 'center', marginBottom: 12 },
});