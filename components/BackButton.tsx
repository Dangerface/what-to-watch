import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, layout, zIndex } from '../lib/theme';

type Props = {
  onPress?: () => void; // standard: router.back()
  top?: number;
  left?: number;
};

export function BackButton({ onPress, top = layout.backButtonTop, left = layout.backButtonLeft }: Props) {
  return (
    <Pressable onPress={onPress ?? (() => router.back())} style={[styles.button, { top, left }]} hitSlop={12}>
      <Text style={styles.arrow}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', zIndex: zIndex.backButton, padding: 4 },
  arrow: { fontSize: 26, fontWeight: 'bold', color: colors.textPrimary },
});