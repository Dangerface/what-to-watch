import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { SettingsPanel } from './SettingsPanel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.8;
const OVERSHOOT_BUFFER = 100; // Extra width on the right to absorb the bounce
const CLOSE_PULL_DISTANCE = 8;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsOverlay({ visible, onClose }: Props) {
  // Start fully off-screen including the buffer
  const translateX = useRef(new Animated.Value(PANEL_WIDTH + OVERSHOOT_BUFFER)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 5,
          tension: 40,
        }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        // Slide out sequence
        Animated.sequence([
          Animated.timing(translateX, { toValue: -CLOSE_PULL_DISTANCE, duration: 90, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: PANEL_WIDTH + OVERSHOOT_BUFFER, duration: 220, useNativeDriver: true }),
        ]),
        // Delayed fade out sequence
        Animated.sequence([
          Animated.delay(50), // Wait 100ms before the backdrop starts fading
          Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  const handleNavigate = (path: string) => {
    onClose();
    router.push(path as any);
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: overlayOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <Animated.View 
        style={[
          styles.panel, 
          { 
            width: PANEL_WIDTH + OVERSHOOT_BUFFER, 
            right: -OVERSHOOT_BUFFER, // Push the extra buffer off-screen to the right
            transform: [{ translateX }] 
          }
        ]}
      >
        {/* Inner container keeps your actual content constrained to the exact 80% width */}
        <View style={[styles.contentContainer, { width: PANEL_WIDTH }]}>
          <SettingsPanel onNavigate={handleNavigate} onClose={onClose} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 30 },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#E8B923',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
    flexDirection: 'row', // Ensures content aligns correctly inside the buffer
  },
  contentContainer: {
    height: '100%',
  },
});