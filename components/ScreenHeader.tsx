import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../lib/theme';

type Props = { step: number; totalSteps: number };

export function ScreenHeader({ step, totalSteps }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.stepLabel}>{step}/{totalSteps}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 60, paddingHorizontal: spacing.xxl, marginBottom: spacing.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  backButton: { padding: spacing.xs },
  backArrow: { fontSize: 26, fontWeight: 'bold', color: colors.textPrimary },
  stepLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  barTrack: { height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.ink, borderRadius: 3 },
});