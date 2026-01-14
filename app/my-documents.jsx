import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import AddDocumentModal from '../components/AddDocumentModal';

export default function MyDocuments() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [documents, setDocuments] = useState([
        { id: '1', type: 'Passport', number: 'A12345678', expiry: '12/30', status: 'Verified' },
        { id: '2', type: 'Driving License', number: 'D98765432', expiry: '05/28', status: 'Pending' }
    ]);

    const handleAddDocument = (newDoc) => {
        setDocuments(prev => [newDoc, ...prev]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardIcon}>
                <MaterialCommunityIcons
                    name={item.type === 'Passport' ? 'passport' : 'card-account-details-outline'}
                    size={28} color="#3E6FFF"
                />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.type}</Text>
                <Text style={styles.cardSub}>{item.number}</Text>
                <Text style={styles.expiry}>Expires: {item.expiry}</Text>
            </View>
            <View style={styles.statusBadge}>
                {item.status === 'Verified' ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                ) : (
                    <Ionicons name="time" size={20} color="#FFC107" />
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>My Documents</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={documents}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={64} color="#2C303A" />
                        <Text style={styles.emptyText}>No documents added yet.</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <AddDocumentModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleAddDocument}
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
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1F2B',
        borderRadius: 16, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: '#2A3340'
    },
    cardIcon: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(62, 111, 255, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    cardInfo: { flex: 1 },
    cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardSub: { color: '#ccc', fontSize: 14, fontFamily: 'monospace' },
    expiry: { color: '#666', fontSize: 12, marginTop: 4 },

    statusBadge: { marginLeft: 12 },

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
