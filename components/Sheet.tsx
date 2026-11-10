import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef } from 'react';
import {
  Animated, Dimensions, GestureResponderHandlers, LayoutChangeEvent, PanResponder, Pressable, StyleProp, StyleSheet, View, ViewStyle,
} from 'react-native';
import { colors, gradients, radius, shadows } from '../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  zIndex: number;
  dismissFraction: number; // hvor stor en del af arkets højde man skal trække, før det lukker
  fadeSheet?: boolean; // true: hele arket fader ind/ud (My Verdict). false: kun baggrunden (søgning)
  sheetStyle?: StyleProp<ViewStyle>; // padding, top-afstand m.m.
  onDragStart?: () => void;
  onClosed?: () => void; // kaldes når luk-animationen er færdig
  children: (panHandlers: GestureResponderHandlers) => ReactNode;
};

export function Sheet({
  visible, onClose, zIndex, dismissFraction, fadeSheet = false, sheetStyle, onDragStart, onClosed, children,
}: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(0);

  // Callbacks via refs, så PanResponderen (som oprettes én gang) altid bruger de nyeste.
  const onCloseRef = useRef(onClose);
  const onDragStartRef = useRef(onDragStart);
  const onClosedRef = useRef(onClosed);
  const dismissFractionRef = useRef(dismissFraction);
  onCloseRef.current = onClose;
  onDragStartRef.current = onDragStart;
  onClosedRef.current = onClosed;
  dismissFractionRef.current = dismissFraction;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: visible ? 0 : SCREEN_HEIGHT, useNativeDriver: true, friction: 9, tension: 60 }),
      Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      if (!visible) onClosedRef.current?.();
    });
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => onDragStartRef.current?.(),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (sheetHeightRef.current > 0 && g.dy > sheetHeightRef.current * dismissFractionRef.current) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.root, { zIndex }, fadeSheet && { opacity: overlayOpacity }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={[styles.backdrop, !fadeSheet && { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, sheetStyle, { transform: [{ translateY }] }]}
        onLayout={(e: LayoutChangeEvent) => {
          sheetHeightRef.current = e.nativeEvent.layout.height;
        }}
      >
        {/* Gradienten ligger i et eget lag, fordi selve arket ikke må klippe indhold (skyggen skal kunne ses). */}
        <LinearGradient
          pointerEvents="none"
          colors={gradients.sheet.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        />
        <View pointerEvents="none" style={styles.highlight} />
        {children(panResponder.panHandlers)}
      </Animated.View>
    </Animated.View>
  );
}

export function SheetHandle({ marginBottom = 0 }: { marginBottom?: number }) {
  return <View style={[styles.handle, { marginBottom }]} />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.modalBackdrop },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.modalBackground,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    ...shadows.sheet,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: radius.sheet - 1,
    borderTopRightRadius: radius.sheet - 1,
  },
  highlight: { position: 'absolute', top: 0, left: radius.sheet, right: radius.sheet, height: 1, backgroundColor: colors.sheetBorderTop },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: 'center' },
});
