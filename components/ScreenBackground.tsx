import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { gradients, rim } from '../lib/theme';

// Styrken ved afstand p (0 = kanten, 1 = rimmens indre grænse) ud fra rim.falloff.
function falloffAt(p: number): number {
  const f = rim.falloff;
  for (let i = 1; i < f.length; i++) {
    if (p <= f[i].at) {
      const a = f[i - 1];
      const b = f[i];
      return a.mul + (b.mul - a.mul) * ((p - a.at) / (b.at - a.at));
    }
  }
  return 0;
}

// Ét 1 px tykt afrundet lag pr. pixel ind fra kanten. Sammen danner de en blød, afrundet glød.
const RIM_LAYERS = Array.from({ length: rim.size }, (_, i) => ({
  inset: i,
  radius: Math.max(rim.radius - i, 0),
  color: `rgba(${rim.rgb},${(rim.strength * falloffAt((i + 0.5) / rim.size)).toFixed(3)})`,
}));

// Skærmens baggrund: lodret gradient + violet lys i yderkanten.
// Læg den som FØRSTE barn i skærmens rod-View, så alt andet tegnes oven på.
export function ScreenBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradients.screen.colors}
        locations={gradients.screen.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {RIM_LAYERS.map((l) => (
        <View
          key={l.inset}
          style={{
            position: 'absolute',
            top: l.inset,
            left: l.inset,
            right: l.inset,
            bottom: l.inset,
            borderWidth: 1,
            borderRadius: l.radius,
            borderColor: l.color,
          }}
        />
      ))}
    </View>
  );
}