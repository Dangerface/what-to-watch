import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, layout, zIndex } from '../lib/theme';

type Props = { editMode: boolean; onPress: () => void };

export function EditToggleButton({ editMode, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper} hitSlop={10}>
      {editMode ? (
        <Feather name="check-circle" size={26} color={colors.ink} />
      ) : (
        <Feather name="edit" size={24} color={colors.ink} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: layout.topControlTop,
    right: layout.topControlRight,
    zIndex: zIndex.floatingControl,
    width: layout.topControlSize,
    height: layout.topControlSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
});