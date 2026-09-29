import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function LoopingLoader() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <View style={styles.container}>
      <View style={styles.blackBox} />
      <Animated.Image source={require('../assets/images/vhs-tape.png')} style={[styles.vhsImage, animatedStyle]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
  blackBox: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#000000', borderRadius: 28 },
  vhsImage: { width: 90, height: 90 },
});