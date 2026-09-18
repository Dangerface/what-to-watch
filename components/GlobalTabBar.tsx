import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUIStore } from '../store/ui';

export const TAB_BAR_CLEARANCE = 110;

type TabKey = 'index' | 'destiny' | 'lists' | 'search';

const TABS: { key: TabKey; path: string; label: string; icon: keyof typeof Ionicons.glyphMap; capsuleOffsetX?: number }[] = [
  { key: 'index', path: '/', label: 'Find Movie', icon: 'home' },
  { key: 'destiny', path: '/destiny', label: 'Skæbne', icon: 'planet' },
  { key: 'lists', path: '/lists', label: 'Lister', icon: 'list' },
  { key: 'search', path: '/search', label: 'Søg', icon: 'search' },
];

const ROUTE_TO_TAB: Record<string, TabKey> = {
  '/': 'index',
  '/destiny': 'destiny',
  '/lists': 'lists',
  '/watchlist': 'lists',
  '/movie-jail': 'lists',
  '/watched': 'lists',
  '/search': 'search',
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

  useEffect(() => {
    if (mappedTab) setLastActiveTab(mappedTab);
  }, [mappedTab]);

  const activeKey = mappedTab ?? lastActiveTab;
  const activeIndex = TABS.findIndex((t) => t.key === activeKey);

  const [barWidth, setBarWidth] = useState(0);
  const capsuleX = useRef(new Animated.Value(0)).current;
  const hasPositionedRef = useRef(false);
  const segmentWidth = barWidth / TABS.length;

  useEffect(() => {
    if (barWidth === 0) return;
    const offset = TABS[activeIndex].capsuleOffsetX ?? 0;
    const capsuleWidth = segmentWidth - CAPSULE_INSET * 2;
    const rawTarget = activeIndex * segmentWidth + CAPSULE_INSET + offset;
    const target = Math.min(Math.max(rawTarget, CAPSULE_INSET), barWidth - capsuleWidth - CAPSULE_INSET);

    if (!hasPositionedRef.current) {
      capsuleX.setValue(target);
      hasPositionedRef.current = true;
      return;
    }

    Animated.spring(capsuleX, { toValue: target, useNativeDriver: true, friction: 8, tension: 80 }).start();
  }, [activeIndex, barWidth]);

  const handleLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

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
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView intensity={70} tint="light" style={styles.bar} onLayout={handleLayout}>
        {barWidth > 0 && (
          <Animated.View style={[styles.capsule, { width: segmentWidth - CAPSULE_INSET * 2, transform: [{ translateX: capsuleX }] }]}>
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}

        {TABS.map((tab) => (
          <Pressable key={tab.key} onPress={() => handlePress(tab.key, tab.path)} style={styles.tabItem}>
            <Ionicons name={tab.icon} size={22} color="#1A1A1A" />
            <Text style={styles.label}>{tab.label}</Text>
          </Pressable>
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 30, left: 20, right: 20, alignItems: 'center', zIndex: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  bar: {
    flexDirection: 'row', borderRadius: 28, overflow: 'hidden', paddingVertical: 10, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.12)',
  },
  capsule: { position: 'absolute', left: 0, top: 6, bottom: 6, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.06)' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1, gap: 3 },
  label: { fontSize: 11, fontWeight: '600', color: '#1A1A1A' },
});