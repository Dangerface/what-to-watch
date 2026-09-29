import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { TAB_BAR_CLEARANCE } from './GlobalTabBar';

export function BottomFadeOverlay() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(232,185,35,0)', 'rgba(232,185,35,0.8)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    />
  );
}

const styles = StyleSheet.create({
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: TAB_BAR_CLEARANCE, zIndex: 10 },
});