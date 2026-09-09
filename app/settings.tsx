import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.header}>Settings</Text>

      <Pressable
        style={styles.optionButton}
        onPress={() => router.push({ pathname: '/providers', params: { fromSettings: 'true' } })}
      >
        <Text style={styles.optionText}>Streaming-tjenester</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24, paddingTop: 80 },
  header: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginBottom: 30 },
  optionButton: { borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  optionText: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
});