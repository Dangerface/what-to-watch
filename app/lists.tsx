import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { OutlineButton } from '../components/OutlineButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { colors, spacing, typography } from '../lib/theme';

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <ScreenBackground />
      <Text style={styles.header}>Lister</Text>
      <OutlineButton label="Watched" onPress={() => router.push('/watched')} />
      <OutlineButton label="Watch List" onPress={() => router.push('/watchlist')} />
      <OutlineButton label="Movie Jail" onPress={() => router.push('/movie-jail')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl, paddingTop: 80 },
  header: { ...typography.h1, textAlign: 'center', marginBottom: 40 },
});