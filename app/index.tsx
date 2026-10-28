import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What to Watch</Text>
      <Pressable style={styles.primaryButton} onPress={() => router.push('/source-type')}>
        <Text style={styles.primaryButtonText}>Find Movie</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 36, textAlign: 'center', marginBottom: 60 },
  primaryButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, paddingHorizontal: 60, borderRadius: 40, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});