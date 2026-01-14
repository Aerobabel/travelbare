import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GuestPicker = ({ onClose, onGuestSelected }) => {
  const insets = useSafeAreaInsets();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const handleConfirm = () => {
    onGuestSelected({ adults, children });
    onClose();
  };

  const renderPicker = (title, value, setValue, max) => {
    const data =
      title === 'Adults'
        ? Array.from({ length: max }, (_, i) => i + 1) // [1, 2, ..., max]
        : Array.from({ length: max }, (_, i) => i); // [0, 1, ..., max-1]

    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>{title}</Text>
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={{ gap: 12 }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.option, item === value && styles.selectedOption]}
              onPress={() => setValue(item)}
            >
              <Text style={styles.optionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  return (
    <Modal transparent animationType="slide">
      <View style={styles.backdrop} />
      <View style={[styles.modal, { paddingBottom: 20 + insets.bottom }]}>
        <Text style={styles.title}>Who's traveling?</Text>
        {renderPicker('Adults', adults, setAdults, 6)}
        {renderPicker('Children', children, setChildren, 5)}

        <TouchableOpacity style={styles.button} onPress={handleConfirm}>
          <Text style={styles.buttonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default GuestPicker;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    width: Dimensions.get('window').width,
    backgroundColor: '#1C222C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    marginBottom: 4,
  },
  pickerContainer: {
    gap: 8,
  },
  label: {
    color: 'white',
    fontSize: 16,
  },
  option: {
    backgroundColor: '#2A2F3A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  selectedOption: {
    backgroundColor: '#3E6FFF',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#3E6FFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
