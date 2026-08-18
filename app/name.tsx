import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSessionStore } from '../store/session';

export default function NameScreen() {
  const { persons, currentPersonIndex, setName } = useSessionStore();
  const [localName, setLocalName] = useState(persons[currentPersonIndex]?.name ?? '');

  return (
    <View style={styles.container}>
      <ScreenHeader step={1} />

      <Text style={styles.heading}>Person {currentPersonIndex + 1} of {persons.length}</Text>
      <Text style={styles.subheading}>What's your name?</Text>

      <TextInput
        style={styles.input}
        value={localName}
        onChangeText={setLocalName}
        placeholder="Your name"
        autoFocus
      />

      <Pressable
        style={[styles.nextButton, !localName.trim() && styles.nextButtonDisabled]}
        disabled={!localName.trim()}
        onPress={() => {
          setName(localName.trim());
          router.push('/genre');
        }}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', paddingHorizontal: 24 },
  heading: { fontFamily: 'Gabarito-Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 },
  subheading: { fontSize: 18, textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, fontSize: 18, backgroundColor: '#FFFFFF', marginBottom: 40 },
  nextButton: { backgroundColor: '#1A1A1A', paddingVertical: 18, borderRadius: 40, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
});