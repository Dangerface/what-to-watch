import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { colors, spacing, typography } from '../lib/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ScreenBackground />
      <Text style={styles.title}>Movie Box</Text>
      <PrimaryButton label="Find Movie" onPress={() => router.push('/source-type')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  title: { ...typography.display, textAlign: 'center', marginBottom: 60 },
  button: { paddingHorizontal: 60 },
});