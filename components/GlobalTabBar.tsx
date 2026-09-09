import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

export const TAB_BAR_CLEARANCE = 110;

type TabKey = 'index' | 'lists' | 'search' | 'settings';

const TABS: { key: TabKey; path: string; label: string; icon: keyof typeof Ionicons.glyphMap; contentOffsetX?: number }[] = [
  { key: 'index', path: '/', label: 'Hjem', icon: 'home' },
  { key: 'lists', path: '/lists', label: 'Lister', icon: 'list' },
  { key: 'search', path: '/search', label: 'Søg', icon: 'search' },
  { key: 'settings', path: '/settings', label: 'Settings', icon: 'settings', contentOffsetX: 3 },
];

const ROUTE_TO_TAB: Record<string, TabKey> = {
  '/': 'index',
  '/lists': 'lists',
  '/watchlist': 'lists',
  '/movie-jail': 'lists',
  '/search': 'search',
  '/settings': 'settings',
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
  const activeKey = ROUTE_TO_TAB[pathname] ?? 'index';
  const activeIndex = TABS.findIndex((t) => t.key === activeKey);

  const [barWidth, setBarWidth] = useState(0);
  const capsuleX = useRef(new Animated.Value(0)).current;
  const segmentWidth = barWidth / TABS.length;

  useEffect(() => {
    if (barWidth === 0) return;
    Animated.spring(capsuleX, {
      toValue: activeIndex * segmentWidth + CAPSULE_INSET,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [activeIndex, barWidth]);

  const handleLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

  const handlePress = (targetKey: TabKey, path: string) => {
    if (targetKey === activeKey) return;
    const targetIndex = TABS.findIndex((t) => t.key === targetKey);
    const direction = targetIndex > activeIndex ? 'right' : 'left';
    router.push({ pathname: path, params: { direction } } as any);
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView intensity={70} tint="light" style={styles.bar} onLayout={handleLayout}>
        {barWidth > 0 && (
          <Animated.View
            style={[
              styles.capsule,
              {
                width: segmentWidth - CAPSULE_INSET * 2,
                transform: [{ translateX: capsuleX }],
              },
            ]}
          >
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}

        {TABS.map((tab) => (
          <Pressable key={tab.key} onPress={() => handlePress(tab.key, tab.path)} style={styles.tabItem}>
            <View style={[styles.tabContent, tab.contentOffsetX ? { transform: [{ translateX: tab.contentOffsetX }] } : undefined]}>
              <Ionicons name={tab.icon} size={22} color="#1A1A1A" />
              <Text style={styles.label}>{tab.label}</Text>
            </View>
          </Pressable>
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10, // Android's modstykke til shadow-egenskaberne ovenfor
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    overflow: 'hidden',
    paddingVertical: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.12)', // giver baren en smule egen "krop", ikke 100% gennemsigtig
  },
  capsule: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabContent: { alignItems: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600', color: '#1A1A1A' },
});