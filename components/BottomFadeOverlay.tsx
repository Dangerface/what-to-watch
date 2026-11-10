import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { colors, layout, zIndex } from '../lib/theme';

export function BottomFadeOverlay() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.backgroundFadeStart, colors.backgroundFadeEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    />
  );
}

const styles = StyleSheet.create({
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: layout.tabBarClearance, zIndex: zIndex.fadeOverlay },
});