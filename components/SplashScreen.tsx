import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface StartupLoaderProps {
  onFinish?: () => void;
}

export default function StartupLoader({ onFinish }: StartupLoaderProps) {
  const audioPlayer = useAudioPlayer(require('../assets/audio/logo.m4a'));

  const boxOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const vhsOpacity = useSharedValue(0);
  const vhsTranslateY = useSharedValue(-120); 
  
  const textTranslateY = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const globalScaleX = useSharedValue(1);
  const globalScaleY = useSharedValue(1);

  // Isolated audio trigger function that runs safely on the JS thread
  const playSound = () => {
    try {
      audioPlayer.seekTo(0);
      audioPlayer.play();
    } catch (error) {
      console.log('Error playing audio:', error);
    }
  };

  const startAnimation = () => {
    cancelAnimation(boxOpacity);
    cancelAnimation(overlayOpacity);
    cancelAnimation(vhsOpacity);
    cancelAnimation(vhsTranslateY);
    cancelAnimation(textTranslateY);
    cancelAnimation(textOpacity);
    cancelAnimation(globalScaleX);
    cancelAnimation(globalScaleY);

    boxOpacity.value = 0;
    overlayOpacity.value = 0;
    vhsOpacity.value = 0;
    vhsTranslateY.value = -120;
    textTranslateY.value = 0;
    textOpacity.value = 0;
    globalScaleX.value = 1;
    globalScaleY.value = 1;

    // Step 1: Base black box fades in first
    boxOpacity.value = withTiming(1, { duration: 300 }, (boxFinished) => {
      if (boxFinished) {
        
        // Step 2: Smoothly fade in overlay
        overlayOpacity.value = withTiming(1, { duration: 150 }, (overlayFinished) => {
          if (overlayFinished) {
            
            // Step 3: Fade in VHS tape AND wind it up slightly (amp up)
            vhsOpacity.value = withTiming(1, { duration: 250 });
            vhsTranslateY.value = withTiming(-145, { duration: 250 }, (windUpFinished) => {
              if (windUpFinished) {
                
                // Play sound precisely at impact via runOnJS
                runOnJS(playSound)();

                // Step 4: Drop VHS tape down into the box (350ms duration)
                vhsTranslateY.value = withTiming(0, { duration: 350 });

                // Step 5: Trigger the rubber squish & text drop slightly *before* the drop finishes (at 100ms)
                setTimeout(() => {
                  textOpacity.value = 1;
                  textTranslateY.value = withSequence(
                    withTiming(55, { duration: 280 }), 
                    withTiming(20, { duration: 180 })  
                  );

                  // Squeeze animation & full wobble finish
                  globalScaleX.value = withSequence(
                    withTiming(1.15, { duration: 300 }), 
                    withTiming(0.92, { duration: 180 }), 
                    withSpring(1, { damping: 20, stiffness: 600 }, (finished) => { 
                      if (finished && onFinish) {
                        runOnJS(onFinish)();
                      }
                    })
                  );

                  globalScaleY.value = withSequence(
                    withTiming(0.85, { duration: 300 }), 
                    withTiming(1.08, { duration: 180 }), 
                    withSpring(1, { damping: 20, stiffness: 600 })
                  );
                }, 100);
              }
            });
          }
        });
      }
    });
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
    transform: [{ translateY: vhsTranslateY.value }],
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

      <Pressable style={styles.replayButton} onPress={startAnimation}>
        <Text style={styles.replayButtonText}>Replay Animation</Text>
      </Pressable>

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
  replayButton: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  replayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});