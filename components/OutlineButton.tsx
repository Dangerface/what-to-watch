import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg'; // sm: "prøv igen"-piller, md: lister og indstillinger, lg: valg af kilde
  style?: StyleProp<ViewStyle>;
};

const BUTTON = { sm: 'buttonSm', md: 'buttonMd', lg: 'buttonLg' } as const;
const LABEL = { sm: 'labelSm', md: 'labelMd', lg: 'labelLg' } as const;

export function OutlineButton({ label, onPress, size = 'md', style }: Props) {
  return (
    <Pressable style={[styles.button, styles[BUTTON[size]], style]} onPress={onPress}>
      <Text style={[styles.label, styles[LABEL[size]]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 2, borderColor: colors.ink, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.lg },
  buttonSm: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: radius.pill },
  buttonMd: { paddingVertical: 20 },
  buttonLg: { paddingVertical: 24 },
  label: { fontWeight: '600', color: colors.textPrimary },
  labelSm: { fontSize: 16 },
  labelMd: { fontSize: 18 },
  labelLg: { fontSize: 20 },
});