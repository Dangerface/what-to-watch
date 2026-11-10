import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, glass, glassTint } from '../lib/theme';

type Props = {
  strength?: keyof typeof glass; // 'regular' (menu) eller 'strong' (søgefelt og knapper)
  style?: StyleProp<ViewStyle>; // radius, størrelse og layout sættes af den, der bruger den
  onLayout?: (e: LayoutChangeEvent) => void;
  children?: ReactNode;
};

export function GlassSurface({ strength = 'regular', style, onLayout, children }: Props) {
  const { intensity, fill } = glass[strength];
  return (
    <BlurView intensity={intensity} tint={glassTint} onLayout={onLayout} style={[styles.base, { backgroundColor: fill }, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder },
});
