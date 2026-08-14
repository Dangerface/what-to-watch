import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

const MIN = 1;
const MAX = 10;

export default function HowManyScreen() {
  const [count, setCount] = useState(3);

  const updateCount = (value: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, Math.round(value)));
    if (clamped !== count) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCount(clamped);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How many are watching?</Text>

      <Text style={styles.number}>{count}</Text>

      <View style={styles.sliderRow}>
        <Pressable style={styles.roundButton} onPress={() => updateCount(count - 1)}>
          <Text style={styles.roundButtonText}>–</Text>
        </Pressable>

        <Slider
          style={styles.slider}
          minimumValue={MIN}
          maximumValue={MAX}
          step={1}
          value={count}
          onValueChange={updateCount}
          minimumTrackTintColor="#1A1A1A"
          maximumTrackTintColor="#FFFFFF"
          thumbTintColor="#1A1A1A"
        />

        <Pressable style={styles.roundButton} onPress={() => updateCount(count + 1)}>
          <Text style={styles.roundButtonText}>+</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.nextButton}
        onPress={() => {
          // Skærm 3 bygger vi næste gang — for nu bekræfter vi bare valget
          console.log('Antal personer:', count);
        }}
      >
        <Text style={styles.nextButtonText}>Next</Text>
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
    paddingHorizontal: 24,
  },
  heading: {
    fontFamily: 'Gabarito-Bold',
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 40,
  },
  number: {
    fontFamily: 'Gabarito-Bold',
    fontSize: 64,
    marginBottom: 40,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 60,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
  },
  nextButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 40,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});