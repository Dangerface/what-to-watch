import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What to Watch</Text>

      <Pressable style={styles.primaryButton} onPress={() => router.push('/source-type')}>
        <Text style={styles.primaryButtonText}>Find Movie</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.push('/watchlist')}>
        <Text style={styles.secondaryButtonText}>Watch List</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 36, textAlign: 'center', marginBottom: 60 },
  primaryButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, width: '100%', alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  secondaryButton: { borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 16, borderRadius: 40, width: '100%', alignItems: 'center' },
  secondaryButtonText: { color: '#1A1A1A', fontSize: 18, fontWeight: '600' },
});