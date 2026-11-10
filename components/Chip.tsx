import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../lib/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md'; // sm: genrer, md: vibes
};

export function Chip({ label, selected, onPress, size = 'sm' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, size === 'md' ? styles.chipMd : styles.chipSm, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, size === 'md' ? styles.labelMd : styles.labelSm, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 2, borderColor: colors.ink, borderRadius: radius.lg, marginBottom: 10 },
  chipSm: { paddingVertical: 8, paddingHorizontal: 16 },
  chipMd: { paddingVertical: 10, paddingHorizontal: 18 },
  chipSelected: { backgroundColor: colors.ink },
  label: { fontWeight: '600', color: colors.textPrimary },
  labelSm: { fontSize: 15 },
  labelMd: { fontSize: 16 },
  labelSelected: { color: colors.background },
});