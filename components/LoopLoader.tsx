import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

export default function LoopLoader() {
  const boxOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(1);
  const vhsOpacity = useSharedValue(1);
  const vhsTranslateY = useSharedValue(0);
  const vhsRotate = useSharedValue(0);

  const textTranslateY = useSharedValue(20);
  const textOpacity = useSharedValue(1);

  const globalScaleX = useSharedValue(1);
  const globalScaleY = useSharedValue(1);

  const startAnimation = () => {
    cancelAnimation(boxOpacity);
    cancelAnimation(overlayOpacity);
    cancelAnimation(vhsOpacity);
    cancelAnimation(vhsTranslateY);
    cancelAnimation(vhsRotate);
    cancelAnimation(textTranslateY);
    cancelAnimation(textOpacity);
    cancelAnimation(globalScaleX);
    cancelAnimation(globalScaleY);

    boxOpacity.value = 1;
    overlayOpacity.value = 1;
    vhsOpacity.value = 1;
    vhsTranslateY.value = 0;
    vhsRotate.value = 0;
    textTranslateY.value = 20;
    textOpacity.value = 1;
    globalScaleX.value = 1;
    globalScaleY.value = 1;

    // 1. Squish & flatten effect on the box
    globalScaleX.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 120 }),
        withSpring(1, { damping: 12, stiffness: 500 }),
        withTiming(1, { duration: 900 }) // pause matching air time
      ),
      -1,
      false
    );

    globalScaleY.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 120 }),
        withSpring(1, { damping: 12, stiffness: 500 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );

    // 2. Tape movement: Launch, mid-air pause, snap down, bounce & tilt
    vhsTranslateY.value = withRepeat(
      withSequence(
        withTiming(-145, { duration: 200 }), // Shoot up
        withTiming(-145, { duration: 300 }), // Pause in mid-air
        withTiming(0, { duration: 180 }),   // Descend back into box
        withTiming(-45, { duration: 150 }),  // Bounce up inside box
        withTiming(0, { duration: 150 })     // Settle
      ),
      -1,
      false
    );

    // 3. Rotation matching the physics
    vhsRotate.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 200 }), // Rotate CCW on way up
        withTiming(-20, { duration: 300 }), // Hold rotation in air
        withTiming(15, { duration: 180 }),  // Snap clockwise on impact
        withTiming(15, { duration: 150 }),  // Hold during bounce
        withTiming(0, { duration: 150 })    // Reset
      ),
      -1,
      false
    );
  };

  useEffect(() => {
    startAnimation();
  }, []);

  const boxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: boxOpacity.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const vhsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: vhsOpacity.value,
    transform: [
      { translateY: vhsTranslateY.value },
      { rotate: `${vhsRotate.value}deg` },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const translateYOffset = 75 * (1 - globalScaleY.value);

    return {
      transform: [
        { scaleX: globalScaleX.value },
        { scaleY: globalScaleY.value },
        { translateY: translateYOffset },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.movieBoxText, textAnimatedStyle]}>
        MovieBox
      </Animated.Text>

      <Animated.View style={[styles.animationWrapper, containerAnimatedStyle]}>
        <Animated.View style={[styles.blackBox, boxAnimatedStyle]} />

        <Animated.Image
          source={require('../assets/images/vhs-tape.png')}
          style={[styles.vhsImage, vhsAnimatedStyle]}
          resizeMode="contain"
        />

        <Animated.View style={[styles.overlayBox, overlayAnimatedStyle]} pointerEvents="none" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8B923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationWrapper: {
    width: 150,
    height: 150,
    position: 'absolute',
    bottom: '50%',
    marginBottom: -75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieBoxText: {
    position: 'absolute',
    bottom: '50%',
    marginBottom: -90,
    width: 300,
    textAlign: 'center',
    color: '#1A1A1A',
    fontSize: 30,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
    fontWeight: 'bold',
    letterSpacing: -0.5,
    zIndex: 10,
  },
  blackBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 28,
    zIndex: 1,
  },
  vhsImage: {
    position: 'absolute',
    width: 120,
    height: 120,
    zIndex: 2,
  },
  overlayBox: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '50%',
    backgroundColor: '#000000',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    zIndex: 3,
  },
});