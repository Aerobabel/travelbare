import { FontAwesome, Ionicons } from '@expo/vector-icons';
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
import AddCardModal from '../components/AddCardModal';

export default function PaymentMethods() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);

    const [cards, setCards] = useState([
        { id: '1', brand: 'Visa', last4: '4242', expiry: '12/28', name: 'John Doe', isDefault: true },
        { id: '2', brand: 'Mastercard', last4: '5566', expiry: '09/27', name: 'John Doe', isDefault: false }
    ]);

    const handleAddCard = (newCard) => {
        let updatedCards = [...cards];
        if (newCard.isDefault) {
            updatedCards = updatedCards.map(c => ({ ...c, isDefault: false }));
        }
        updatedCards.push(newCard);
        setCards(updatedCards);
    };

    const setDefault = (id) => {
        const updatedCards = cards.map(c => ({
            ...c,
            isDefault: c.id === id
        }));
        setCards(updatedCards);
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, item.isDefault && styles.activeCard]}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <FontAwesome
                        name={item.brand === 'Visa' ? 'cc-visa' : 'cc-mastercard'}
                        size={24}
                        color={item.brand === 'Visa' ? 'white' : '#FF5F00'}
                    />
                    <Text style={styles.cardTitle}>{item.brand} •••• {item.last4}</Text>
                </View>
                {item.isDefault && (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardBottom}>
                <Text style={styles.cardExpiry}>Exp: {item.expiry}</Text>
                {!item.isDefault && (
                    <TouchableOpacity onPress={() => setDefault(item.id)}>
                        <Text style={styles.setText}>Set as Default</Text>
                    </TouchableOpacity>
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
                <Text style={styles.title}>Payment Methods</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={cards}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <AddCardModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleAddCard}
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
        backgroundColor: '#1A1F2B',
        borderRadius: 16, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#2A3340',
        minHeight: 120, justifyContent: 'space-between'
    },
    activeCard: {
        borderColor: '#3E6FFF',
        backgroundColor: 'rgba(62, 111, 255, 0.05)'
    },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' },

    defaultBadge: {
        backgroundColor: '#3E6FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6
    },
    defaultText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardExpiry: { color: '#888', fontSize: 14 },
    setText: { color: '#3E6FFF', fontSize: 14, fontWeight: '600' },

    fab: {
        position: 'absolute', bottom: 30, right: 20,
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#3E6FFF',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#3E6FFF', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    }
});
