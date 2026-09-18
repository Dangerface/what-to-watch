import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

type Props = { onPress: () => void };

export function GlobalSettingsButton({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper} hitSlop={10}>
      <Ionicons name="settings" size={22} color="#1A1A1A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 60, right: 20, zIndex: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});