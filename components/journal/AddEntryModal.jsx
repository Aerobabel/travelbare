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
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function AddEntryModal({ visible, onClose, onSave }) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [location, setLocation] = useState('');
    const [mood, setMood] = useState('😊');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    const moods = ['😊', '🤩', '🤠', '😴', '😎', '🥹', '😋', '😰'];

    const pickImages = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                const uris = result.assets.map(asset => asset.uri);
                setImages(prev => [...prev, ...uris]);
            }
        } catch (error) {
            Alert.alert("Error", "Could not pick images.");
        }
    };

    const handleSave = () => {
        if (!title || !text) {
            Alert.alert("Fill it out!", "Please add a title and some story.");
            return;
        }

        setLoading(true);
        setTimeout(() => {
            const newEntry = {
                id: Date.now().toString(),
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                title,
                text,
                location: location || 'Unknown Place',
                mood,
                images
            };
            onSave(newEntry);
            setLoading(false);
            resetForm();
            onClose();
        }, 1000);
    };

    const resetForm = () => {
        setTitle('');
        setText('');
        setLocation('');
        setMood('😊');
        setImages([]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>New Memory</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#ccc" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Title & Location */}
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Day 1 in Paris..."
                            placeholderTextColor="#666"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Eiffel Tower"
                            placeholderTextColor="#666"
                            value={location}
                            onChangeText={setLocation}
                        />

                        {/* Mood */}
                        <Text style={styles.label}>Mood</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            <View style={styles.moodContainer}>
                                {moods.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.moodChip, mood === m && styles.activeMood]}
                                        onPress={() => setMood(m)}
                                    >
                                        <Text style={styles.moodText}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Story */}
                        <Text style={styles.label}>The Story</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Write about your day..."
                            placeholderTextColor="#666"
                            value={text}
                            onChangeText={setText}
                            multiline
                            textAlignVertical="top"
                        />

                        {/* Images */}
                        <Text style={styles.label}>Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                                <Ionicons name="camera" size={24} color="#3E6FFF" />
                            </TouchableOpacity>
                            {images.map((uri, index) => (
                                <Image key={index} source={{ uri }} style={styles.previewImage} />
                            ))}
                        </ScrollView>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Entry</Text>}
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
        height: '90%'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'Raleway_700Bold' },

    scrollContent: { paddingBottom: 100 },

    label: { color: '#9BA4B4', fontSize: 13, marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#0E141C', color: 'white', padding: 14,
        borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#2A3340', marginBottom: 16
    },
    textArea: { height: 120 },

    moodContainer: { flexDirection: 'row', gap: 10 },
    moodChip: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2C303A', justifyContent: 'center', alignItems: 'center' },
    activeMood: { backgroundColor: '#3E6FFF', borderWidth: 2, borderColor: '#fff' },
    moodText: { fontSize: 24 },

    imageRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    addPhotoBtn: {
        width: 80, height: 80, borderRadius: 12, backgroundColor: '#0E141C',
        borderWidth: 1, borderColor: '#3E6FFF', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', marginRight: 10
    },
    previewImage: { width: 80, height: 80, borderRadius: 12, marginRight: 10 },

    footer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
    saveBtn: {
        backgroundColor: '#3E6FFF', borderRadius: 12, height: 56,
        justifyContent: 'center', alignItems: 'center'
    },
    saveText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
