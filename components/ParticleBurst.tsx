import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PARTICLE_COUNT = 14;
const BURST_RADIUS = 55;
const DURATION = 500;

type Particle = { angle: number; distance: number; anim: Animated.Value };

type Props = { trigger: number }; // inkrementér denne for at affyre en ny eksplosion

export function ParticleBurst({ trigger }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const next: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: BURST_RADIUS * (0.6 + Math.random() * 0.4),
      anim: new Animated.Value(0),
    }));
    setParticles(next);

    Animated.parallel(next.map((p) => Animated.timing(p.anim, { toValue: 1, duration: DURATION, useNativeDriver: true }))).start(
      () => setParticles([])
    );
  }, [trigger]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => {
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = p.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
        return (
          <Animated.View key={i} style={[styles.particle, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A1A1A', marginLeft: -3, marginTop: -3 },
});