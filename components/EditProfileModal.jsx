import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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
import { supabase } from '../lib/supabase';

export default function EditProfileModal({ visible, onClose, user, onUpdate }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.user_metadata?.full_name || '');
            setPhone(user.user_metadata?.phone || '');
            setAvatar(user.user_metadata?.avatar_url || null);
        }
    }, [user, visible]);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled) {
                // ideally we upload this to storage, for now we effectively use the local URI
                // or a base64 data URI if we wanted to be hacky, but local URI is safer for performance
                // If we want to persist across devices, we need Supabase Storage.
                // For this demo, we'll use the uri.
                setAvatar(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Error picking image');
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = {
                full_name: name,
                phone: phone,
                avatar_url: avatar, // syncing the URI (or public URL if we had upload logic)
            };

            const { error, data } = await supabase.auth.updateUser({
                data: updates
            });

            if (error) throw error;

            Alert.alert('Success', 'Profile updated!');
            if (onUpdate) onUpdate(data.user);
            onClose();
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#ccc" />
                        </TouchableOpacity>
                    </View>

                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarInitials}>
                                        {name?.[0]?.toUpperCase() ?? 'U'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.cameraIcon}>
                                <Ionicons name="camera" size={16} color="white" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.changePhotoText}>Tap to change photo</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. John Doe"
                            placeholderTextColor="#666"
                        />

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+1234567890"
                            placeholderTextColor="#666"
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#1A1F2B',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#2A3340'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'Bold',
        fontFamily: 'Raleway_700Bold'
    },

    avatarSection: {
        alignItems: 'center',
        marginBottom: 24
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#3E6FFF'
    },
    avatarPlaceholder: {
        backgroundColor: '#2A3340',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarInitials: {
        fontSize: 36,
        color: '#3E6FFF',
        fontWeight: 'bold'
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3E6FFF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1A1F2B'
    },
    changePhotoText: {
        color: '#3E6FFF',
        fontSize: 14,
        fontWeight: '600'
    },

    form: {
        gap: 16,
        marginBottom: 24
    },
    label: {
        color: '#9BA4B4',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#0E141C',
        color: 'white',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#2A3340'
    },

    modalButtons: {
        flexDirection: 'row',
        gap: 12
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#2C303A'
    },
    saveBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#3E6FFF'
    },
    cancelText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
