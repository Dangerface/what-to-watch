import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lister</Text>

      <Pressable style={styles.optionButton} onPress={() => router.push('/watchlist')}>
        <Text style={styles.optionText}>Watch List</Text>
      </Pressable>

      <Pressable style={styles.optionButton} onPress={() => router.push('/movie-jail')}>
        <Text style={styles.optionText}>Movie Jail</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24, paddingTop: 80 },
  header: { fontFamily: 'Gabarito-Bold', fontSize: 28, textAlign: 'center', marginBottom: 40 },
  optionButton: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 20, paddingVertical: 20, alignItems: 'center', marginBottom: 16 },
  optionText: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
});