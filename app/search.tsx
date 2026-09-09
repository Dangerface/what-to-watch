import { StyleSheet, Text, View } from 'react-native';

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Søg</Text>
      <Text style={styles.subtext}>Fritekst-søgning kommer snart.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8B923', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: { fontFamily: 'Gabarito-Bold', fontSize: 28, marginBottom: 12 },
  subtext: { fontSize: 16, textAlign: 'center' },
});