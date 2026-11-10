import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, radius, shadows, zIndex } from '../lib/theme';
import { useUIStore } from '../store/ui';
import { GlassSurface } from './GlassSurface';

export const TAB_BAR_CLEARANCE = layout.tabBarClearance;

type TabKey = 'index' | 'destiny' | 'lists';

const TABS: { key: TabKey; path: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'index', path: '/', label: 'Find Movie', icon: 'film' },
  { key: 'destiny', path: '/destiny', label: 'Destiny', icon: 'planet' },
  { key: 'lists', path: '/lists', label: 'Lists', icon: 'list' },
];

const ROUTE_TO_TAB: Record<string, TabKey> = {
  '/': 'index',
  '/destiny': 'destiny',
  '/lists': 'lists',
  '/watchlist': 'lists',
  '/movie-jail': 'lists',
  '/watched': 'lists',
  '/source-type': 'index',
  '/providers': 'index',
  '/runtime': 'index',
  '/genre': 'index',
  '/vibe': 'index',
  '/results': 'index',
  '/more-like-this': 'index',
};

const CAPSULE_INSET = 6;

export function GlobalTabBar() {
  const pathname = usePathname();
  const mappedTab = ROUTE_TO_TAB[pathname];
  const lastActiveTab = useUIStore((state) => state.lastActiveTab) as TabKey;
  const setLastActiveTab = useUIStore((state) => state.setLastActiveTab);
  const openSearchModal = useUIStore((state) => state.openSearchModal);

  useEffect(() => {
    if (mappedTab) setLastActiveTab(mappedTab);
  }, [mappedTab]);

  const activeKey = mappedTab ?? lastActiveTab;
  const activeIndex = TABS.findIndex((t) => t.key === activeKey);

  const [pillWidth, setPillWidth] = useState(0);
  const capsuleX = useRef(new Animated.Value(0)).current;
  const hasPositionedRef = useRef(false);
  const segmentWidth = pillWidth / TABS.length;

  useEffect(() => {
    if (pillWidth === 0 || activeIndex === -1) return;
    const capsuleWidth = segmentWidth - CAPSULE_INSET * 2;
    const rawTarget = activeIndex * segmentWidth + CAPSULE_INSET;
    const target = Math.min(Math.max(rawTarget, CAPSULE_INSET), pillWidth - capsuleWidth - CAPSULE_INSET);

    if (!hasPositionedRef.current) {
      capsuleX.setValue(target);
      hasPositionedRef.current = true;
      return;
    }
    Animated.spring(capsuleX, { toValue: target, useNativeDriver: true, friction: 8, tension: 80 }).start();
  }, [activeIndex, pillWidth]);

  const handlePillLayout = (e: LayoutChangeEvent) => setPillWidth(e.nativeEvent.layout.width);

  const handlePress = (targetKey: TabKey, path: string) => {
    if (targetKey === activeKey) {
      if (targetKey === 'index') router.push(path as any);
      return;
    }
    const targetIndex = TABS.findIndex((t) => t.key === targetKey);
    const direction = targetIndex > activeIndex ? 'right' : 'left';
    router.push({ pathname: path, params: { direction } } as any);
  };

  return (
    <View style={styles.outerRow} pointerEvents="box-none">
      <View style={styles.pillShadowWrapper}>
        <GlassSurface style={styles.pill} onLayout={handlePillLayout}>
          {pillWidth > 0 && activeIndex !== -1 && (
            <Animated.View style={[styles.capsule, { width: segmentWidth - CAPSULE_INSET * 2, transform: [{ translateX: capsuleX }] }]}>
              {/* Mørkt glas til fremhævelsen — bruges kun her, så den bliver stående som ren BlurView. */}
              <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
          {TABS.map((tab) => (
            <Pressable key={tab.key} onPress={() => handlePress(tab.key, tab.path)} style={styles.tabItem}>
              <Ionicons name={tab.icon} size={22} color={colors.ink} />
              <Text style={styles.label}>{tab.label}</Text>
            </Pressable>
          ))}
        </GlassSurface>
      </View>

      <View style={styles.circleShadowWrapper}>
        <Pressable onPress={openSearchModal} style={{ flex: 1 }}>
          <GlassSurface style={styles.circle}>
            <Ionicons name="search" size={22} color={colors.ink} />
          </GlassSurface>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRow: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: zIndex.tabBar, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pillShadowWrapper: { flex: 1, ...shadows.floating },
  pill: { flexDirection: 'row', borderRadius: radius.sheet, paddingVertical: 10, width: '100%' },
  capsule: { position: 'absolute', left: 0, top: 6, bottom: 6, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.glassCapsule },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1, gap: 3 },
  label: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  circleShadowWrapper: { width: 58, height: 58, ...shadows.floating },
  circle: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
});