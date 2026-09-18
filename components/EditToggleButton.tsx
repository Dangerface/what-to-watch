import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

type Props = { editMode: boolean; onPress: () => void };

export function EditToggleButton({ editMode, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper} hitSlop={10}>
      {editMode ? (
        <Feather name="check-circle" size={26} color="#1A1A1A" />
      ) : (
        <Feather name="edit" size={24} color="#1A1A1A" />
        
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 60, right: 20, zIndex: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});