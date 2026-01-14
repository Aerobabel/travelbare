import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddEntryModal from '../components/journal/AddEntryModal';
import JournalEntryCard from '../components/journal/JournalEntryCard';

export default function TravelDiary() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [entries, setEntries] = useState([
    {
      id: '1',
      date: 'Aug 24, 2025',
      title: 'Arrival in Tokyo 🇯🇵',
      text: 'Landed in Narita and took the Skyliner to Ueno. The humidity hit us immediately! Had amazing ramen for dinner.',
      location: 'Tokyo, Japan',
      mood: '🤩',
      images: []
    }
  ]);

  const handleAddEntry = (newEntry) => {
    setEntries([newEntry, ...entries]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Travel Journal</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <JournalEntryCard entry={item} isLast={index === entries.length - 1} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color="#2C303A" />
            <Text style={styles.emptyText}>Start documenting your journey.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <AddEntryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddEntry}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C222C',
    justifyContent: 'center', alignItems: 'center'
  },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'Raleway_700Bold' },

  list: { padding: 20 },

  fab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#3E6FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3E6FFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },

  emptyState: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptyText: { color: '#666', fontSize: 16 }
});