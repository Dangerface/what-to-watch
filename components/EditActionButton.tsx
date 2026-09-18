import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const BUTTON_WIDTH = 36;

type Props = { visible: boolean; children: React.ReactNode };

export function EditActionButton({ visible, children }: Props) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    // useNativeDriver: false er nødvendigt her — width kan ikke animeres på den native tråd.
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      useNativeDriver: false,
      friction: 5,
      tension: 200,
      // Bevidst INGEN overshootClamping — det er det, der giver det lille bounce.
    }).start();
  }, [visible]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BUTTON_WIDTH],
    extrapolate: 'clamp',
  });

  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ width, opacity, alignItems: 'center', overflow: 'hidden' }}>
      {children}
    </Animated.View>
  );
}