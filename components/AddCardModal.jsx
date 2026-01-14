import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function AddCardModal({ visible, onClose, onSave }) {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [name, setName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        if (!cardNumber || !expiry || !cvv || !name) {
            Alert.alert("Validation", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            const newCard = {
                id: Date.now().toString(),
                brand: getCardBrand(cardNumber),
                last4: cardNumber.slice(-4),
                expiry,
                name,
                isDefault
            };
            onSave(newCard);
            setLoading(false);
            resetForm();
            onClose();
        }, 1500);
    };

    const resetForm = () => {
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setName('');
        setIsDefault(false);
    };

    const getCardBrand = (number) => {
        if (number.startsWith('4')) return 'Visa';
        if (number.startsWith('5')) return 'Mastercard';
        return 'Card';
    };

    // Simple formatter
    const formatCardNumber = (text) => {
        const cleaned = text.replace(/\D/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
        setCardNumber(formatted.slice(0, 19)); // 16 digits + 3 spaces
    };

    const formatExpiry = (text) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
        } else {
            setExpiry(cleaned);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>Add New Card</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#ccc" />
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Card Number</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="card-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                            <TextInput
                                style={styles.input}
                                value={cardNumber}
                                onChangeText={formatCardNumber}
                                placeholder="0000 0000 0000 0000"
                                placeholderTextColor="#666"
                                keyboardType="number-pad"
                                maxLength={19}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Expiry Date</Text>
                                <TextInput
                                    style={styles.inputBox}
                                    value={expiry}
                                    onChangeText={formatExpiry}
                                    placeholder="MM/YY"
                                    placeholderTextColor="#666"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>CVV</Text>
                                <TextInput
                                    style={styles.inputBox}
                                    value={cvv}
                                    onChangeText={setCvv}
                                    placeholder="123"
                                    placeholderTextColor="#666"
                                    keyboardType="number-pad"
                                    maxLength={3}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Cardholder Name</Text>
                        <TextInput
                            style={styles.inputBox}
                            value={name}
                            onChangeText={setName}
                            placeholder="John Doe"
                            placeholderTextColor="#666"
                        />

                        {/* Default Toggle */}
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Set as default payment method</Text>
                            <Switch
                                value={isDefault}
                                onValueChange={setIsDefault}
                                trackColor={{ false: "#767577", true: "#3E6FFF" }}
                                thumbColor={isDefault ? "#fff" : "#f4f3f4"}
                            />
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="lock-closed" size={16} color="white" />
                                    <Text style={styles.saveText}>Save Securely</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#1A1F2B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: '60%'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'Raleway_700Bold' },

    form: { gap: 16 },
    label: { color: '#9BA4B4', fontSize: 13, marginBottom: 6, fontWeight: '600' },

    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#0E141C',
        borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#2A3340'
    },
    input: { flex: 1, color: 'white', paddingVertical: 14, fontSize: 16, fontFamily: 'monospace' },

    inputBox: {
        backgroundColor: '#0E141C', color: 'white', padding: 14,
        borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#2A3340'
    },

    row: { flexDirection: 'row' },

    switchRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, paddingVertical: 8
    },
    switchLabel: { color: 'white', fontSize: 15 },

    footer: { marginTop: 32 },
    saveBtn: {
        backgroundColor: '#3E6FFF', borderRadius: 12, height: 56,
        justifyContent: 'center', alignItems: 'center'
    },
    saveText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
