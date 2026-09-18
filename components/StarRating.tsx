import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export function StarRating({ ratingOutOfTen }: { ratingOutOfTen: number | null }) {
  const ratingOutOfFive = ratingOutOfTen != null ? ratingOutOfTen / 2 : 0;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        let icon: keyof typeof Ionicons.glyphMap = 'star-outline';
        if (ratingOutOfFive >= star) icon = 'star';
        else if (ratingOutOfFive >= star - 0.5) icon = 'star-half';
        return <Ionicons key={star} name={icon} size={22} color="#1A1A1A" />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 8 } });