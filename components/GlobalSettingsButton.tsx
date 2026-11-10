import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, layout, zIndex } from '../lib/theme';

type Props = { onPress: () => void };

export function GlobalSettingsButton({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper} hitSlop={10}>
      <Ionicons name="settings" size={22} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: layout.topControlTop,
    right: layout.topControlRight,
    zIndex: zIndex.floatingControl,
    width: layout.topControlSize,
    height: layout.topControlSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
});