import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function WatchlistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Watch List</Text>
      <Text style={styles.subtext}>Kommer snart</Text>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Tilbage</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 28, marginBottom: 12 },
  subtext: { fontSize: 16, marginBottom: 40 },
  backButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 40 },
  backButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});