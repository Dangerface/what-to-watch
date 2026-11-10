import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: 'md' | 'lg'; // lg: flow og forside, md: genstart-knap
  style?: StyleProp<ViewStyle>; // margener og bredde sættes af skærmen
};

export function PrimaryButton({ label, onPress, disabled, size = 'lg', style }: Props) {
  return (
    <Pressable
      style={[styles.button, size === 'md' ? styles.buttonMd : styles.buttonLg, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, size === 'md' ? styles.labelMd : styles.labelLg]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.ink, borderRadius: radius.pill, alignItems: 'center' },
  buttonLg: { paddingVertical: 18 },
  buttonMd: { paddingVertical: 16, paddingHorizontal: 40 },
  disabled: { opacity: 0.4 },
  label: { color: colors.textOnDark, fontWeight: '600' },
  labelLg: { fontSize: 20 },
  labelMd: { fontSize: 18 },
});