import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function AddDocumentModal({ visible, onClose, onSave }) {
    const [docType, setDocType] = useState('Passport'); // Default
    const [docNumber, setDocNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert("Error", "Could not pick image");
        }
    };

    const handleSave = async () => {
        if (!docNumber || !expiryDate) {
            Alert.alert("Validation", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            const newDoc = {
                id: Date.now().toString(),
                type: docType,
                number: docNumber,
                expiry: expiryDate,
                image: imageUri,
                status: 'Verified' // Mock status
            };
            onSave(newDoc);
            setLoading(false);
            resetForm();
            onClose();
        }, 1000);
    };

    const resetForm = () => {
        setDocNumber('');
        setExpiryDate('');
        setImageUri(null);
        setDocType('Passport');
    };

    const docTypes = ['Passport', 'National ID', 'Visa', 'Driving License'];

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>Add Document</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#ccc" />
                        </TouchableOpacity>
                    </View>

                    {/* Type Selector (Simple Tabs) */}
                    <View style={styles.typeContainer}>
                        {docTypes.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.typeChip, docType === type && styles.activeTypeChip]}
                                onPress={() => setDocType(type)}
                            >
                                <Text style={[styles.typeText, docType === type && styles.activeTypeText]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Document Number</Text>
                        <TextInput
                            style={styles.input}
                            value={docNumber}
                            onChangeText={setDocNumber}
                            placeholder="e.g. A12345678"
                            placeholderTextColor="#666"
                        />

                        <Text style={styles.label}>Expiry Date</Text>
                        <TextInput
                            style={styles.input}
                            value={expiryDate}
                            onChangeText={setExpiryDate}
                            placeholder="MM/YY"
                            placeholderTextColor="#666"
                        />

                        <Text style={styles.label}>Photo Scan</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.scanPreview} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="scan-outline" size={32} color="#3E6FFF" />
                                    <Text style={styles.placeholderText}>Tap to scan/upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Document</Text>}
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
        minHeight: '70%'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'Raleway_700Bold' },

    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    typeChip: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: '#2C303A', borderWidth: 1, borderColor: '#2C303A'
    },
    activeTypeChip: { backgroundColor: '#3E6FFF', borderColor: '#3E6FFF' },
    typeText: { color: '#ccc', fontSize: 13 },
    activeTypeText: { color: 'white', fontWeight: 'bold' },

    form: { gap: 16 },
    label: { color: '#9BA4B4', fontSize: 14, fontWeight: '600' },
    input: {
        backgroundColor: '#0E141C', color: 'white', padding: 16,
        borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#2A3340'
    },

    imagePicker: {
        height: 150, backgroundColor: '#0E141C', borderRadius: 12,
        borderWidth: 1, borderColor: '#3E6FFF', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    placeholder: { alignItems: 'center', gap: 8 },
    placeholderText: { color: '#3E6FFF', fontSize: 14 },
    scanPreview: { width: '100%', height: '100%', resizeMode: 'cover' },

    footer: { marginTop: 32 },
    saveBtn: {
        backgroundColor: '#3E6FFF', borderRadius: 12, height: 56,
        justifyContent: 'center', alignItems: 'center'
    },
    saveText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
