import { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '../lib/theme';

const SCALE = 0.3; // andel af den oprindelige størrelse (150 pt)
const BOX = 150 * SCALE;
const BOX_RADIUS = 28 * SCALE;
const TAPE = 90 * SCALE;
const HOP = 14 * SCALE;

type Props = { style?: StyleProp<ViewStyle> };

export function InlineLoader({ style }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-HOP, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.box} />
      <Animated.Image source={require('../assets/images/vhs-tape.png')} style={[styles.tape, animatedStyle]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: BOX, height: BOX, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  box: { ...StyleSheet.absoluteFill, backgroundColor: colors.logoBox, borderRadius: BOX_RADIUS },
  tape: { width: TAPE, height: TAPE },
});