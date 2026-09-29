import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { STAR_GAP, STAR_SIZE } from './InteractiveStarRating';

export const STAR_BURST_STAGGER_MS = 90;
const PARTICLES_PER_BURST = 10;
const BURST_RADIUS = 30;
export const STAR_BURST_DURATION_MS = 450;

type Particle = { angle: number; distance: number; anim: Animated.Value };
type Burst = { id: string; x: number; particles: Particle[] };

type Props = { filledStars: number; trigger: number };

export function StarBurstSequence({ filledStars, trigger }: Props) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const count = Math.ceil(filledStars);
    for (let i = 0; i < count; i++) {
      const t = setTimeout(() => {
        const centerX = i * (STAR_SIZE + STAR_GAP) + STAR_SIZE / 2;
        const particles: Particle[] = Array.from({ length: PARTICLES_PER_BURST }, () => ({
          angle: Math.random() * Math.PI * 2,
          distance: BURST_RADIUS * (0.6 + Math.random() * 0.4),
          anim: new Animated.Value(0),
        }));
        const burstId = `${trigger}-${i}`;
        setBursts((prev) => [...prev, { id: burstId, x: centerX, particles }]);
        Animated.parallel(
          particles.map((p) => Animated.timing(p.anim, { toValue: 1, duration: STAR_BURST_DURATION_MS, useNativeDriver: true }))
        ).start(() => setBursts((prev) => prev.filter((b) => b.id !== burstId)));
      }, i * STAR_BURST_STAGGER_MS);
      timeoutsRef.current.push(t);
    }
  }, [trigger]);

  return (
    <View style={styles.container} pointerEvents="none">
      {bursts.map((burst) => (
        <View key={burst.id} style={[styles.anchor, { left: burst.x }]}>
          {burst.particles.map((p, i) => {
            const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
            const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
            const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
            const scale = p.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
            return (
              <Animated.View key={i} style={[styles.particle, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]} />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  anchor: { position: 'absolute', top: '50%' },
  particle: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#1A1A1A', marginLeft: -2.5, marginTop: -2.5 },
});