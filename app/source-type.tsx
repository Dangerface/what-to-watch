import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { getTotalSteps } from '../lib/flow';
import { useSessionStore } from '../store/session';

export default function SourceTypeScreen() {
  const { sourceType, setSourceType } = useSessionStore();
  const totalSteps = getTotalSteps(sourceType);

  const choose = (type: 'streamingOnly' | 'includeRental') => {
    setSourceType(type);
    router.push(type === 'streamingOnly' ? '/providers' : '/runtime');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader step={1} totalSteps={totalSteps} />
      <Text style={styles.heading}>Hvor skal filmene findes?</Text>

      <Pressable style={styles.optionButton} onPress={() => choose('streamingOnly')}>
        <Text style={styles.optionText}>Kun streaming</Text>
      </Pressable>

      <Pressable style={styles.optionButton} onPress={() => choose('includeRental')}>
        <Text style={styles.optionText}>Også lejefilm</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 26, textAlign: 'center', marginBottom: 40 },
  optionButton: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 24, alignItems: 'center', marginBottom: 16 },
  optionText: { fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
});