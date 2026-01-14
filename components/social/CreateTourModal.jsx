import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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

export default function CreateTourModal({ visible, onClose, onPublish }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [location, setLocation] = useState('');
    const [duration, setDuration] = useState('');

    // Hardcoded for demo
    const [image, setImage] = useState('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1');

    const handlePublish = () => {
        if (!title || !price || !location) {
            Alert.alert('Missing Info', 'Please fill in the main details.');
            return;
        }

        const newTour = {
            id: Math.random().toString(),
            user: { name: 'Me', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36' },
            title,
            description: description || 'No description provided.',
            price: parseInt(price) || 0,
            location,
            duration: parseInt(duration) || 3,
            country: 'Unknown',
            image,
            itinerary: [],
            costBreakdown: []
        };

        onPublish(newTour);
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setPrice('');
        setLocation('');
        setDuration('');
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Tour</Text>
                    <TouchableOpacity onPress={handlePublish}>
                        <Text style={styles.publishText}>Publish</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>

                        <TouchableOpacity style={styles.imagePicker} onPress={() => Alert.alert('Pick Image', 'Image picker would open here.')}>
                            <Image source={{ uri: image }} style={styles.coverImage} />
                            <View style={styles.cameraIcon}>
                                <Ionicons name="camera" size={24} color="white" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tour Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Hidden Gems of Rome"
                                placeholderTextColor="#666"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Price ($)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="500"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Duration (Days)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="3"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    value={duration}
                                    onChangeText={setDuration}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Location / Route</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Rome • Florence • Venice"
                                placeholderTextColor="#666"
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe the experience..."
                                placeholderTextColor="#666"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0E141C',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#1E2A3A',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'Raleway_700Bold',
    },
    cancelText: {
        color: '#9BA4B4',
        fontSize: 16,
        fontFamily: 'Raleway_400Regular',
    },
    publishText: {
        color: '#3E6FFF',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Raleway_700Bold',
    },
    content: {
        padding: 20,
    },
    imagePicker: {
        height: 200,
        backgroundColor: '#1C222C',
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center'
    },
    coverImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6
    },
    cameraIcon: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 12,
        borderRadius: 30
    },
    formGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row'
    },
    label: {
        color: '#9BA4B4',
        marginBottom: 8,
        fontSize: 14,
        fontFamily: 'Raleway_700Regular',
    },
    input: {
        backgroundColor: '#1C222C',
        color: 'white',
        padding: 14,
        borderRadius: 12,
        fontSize: 16,
        fontFamily: 'Raleway_400Regular',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top'
    }
});
