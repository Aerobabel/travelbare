import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const GuestPicker = ({ onClose, onGuestSelected }) => {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const [adults, setAdults] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childAges, setChildAges] = useState([]);

  // Handle changing number of children
  const handleChildrenCountChange = (count) => {
    setChildrenCount(count);
    // Resize ages array
    if (count > childAges.length) {
      // Add more (default age 12 like mockup)
      const newAges = [...childAges];
      for (let i = childAges.length; i < count; i++) {
        newAges.push(12);
      }
      setChildAges(newAges);
    } else {
      // Trim
      setChildAges(childAges.slice(0, count));
    }
  };

  const handleAgeChange = (index, age) => {
    const newAges = [...childAges];
    newAges[index] = age;
    setChildAges(newAges);
  };

  const handleConfirm = () => {
    onGuestSelected({
      adults,
      children: childrenCount,
      childAges
    });
    onClose();
  };

  const renderNumberPicker = (title, value, onSelect, rangeStart, rangeEnd, keyPrefix) => {
    const data = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);

    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{title}</Text>
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => `${keyPrefix}-${item}`}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item === value;
            return (
              <TouchableOpacity
                style={[styles.circleOption, isSelected && styles.selectedCircle]}
                onPress={() => onSelect(item)}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.textTertiary },
                  isSelected && styles.selectedOptionText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="overFullScreen">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme === 'dark' ? '#161B23' : '#F3F4F6', borderColor: colors.pillBorder }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
          data={[]} // Using ListHeaderComponent for content to allow scrolling if needed
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Adults */}
              {renderNumberPicker('Adults', adults, setAdults, 1, 7, 'adult')}

              {/* Kids */}
              {renderNumberPicker('Kids', childrenCount, handleChildrenCountChange, 0, 7, 'kid')}

              {/* Child Ages */}
              {childAges.map((age, index) => (
                <View key={`age-${index}`}>
                  {renderNumberPicker(
                    index === 0 ? 'How old is first child?' :
                      index === 1 ? 'How old is second child?' :
                        `How old is child ${index + 1}?`,
                    age,
                    (val) => handleAgeChange(index, val),
                    0, 14,
                    `age-${index}`
                  )}
                </View>
              ))}
            </>
          }
        />

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleConfirm}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

export default GuestPicker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: 24,
    paddingLeft: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Raleway',
    marginBottom: 16,
  },
  circleOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: {
    backgroundColor: '#0066FF', // Bright blue
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'Raleway',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#0066FF',
    borderRadius: 30, // Pill shape
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Raleway',
  },
});
