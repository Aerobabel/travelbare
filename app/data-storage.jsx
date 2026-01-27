import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DataStorage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleClearHistory = () => {
        Alert.alert(
            "Clear Chat History",
            "Are you sure you want to delete all chat history? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await AsyncStorage.removeItem('travel_chat_sessions');
                            await AsyncStorage.removeItem('current_chat_session');
                            // Optional: Clear other keys if needed
                            Alert.alert("Success", "Chat history cleared.");
                        } catch (e) {
                            Alert.alert("Error", "Failed to clear history.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is permanent and cannot be undone. All your data will be wiped.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: () => {
                        // Mock for now, or call Supabase delete
                        Alert.alert("Request Received", "Your account deletion request has been processed.");
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerPill}>
                    <Text style={styles.headerTitle}>Data Storage</Text>
                </View>
                <View style={styles.spacer} />
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.dangerButton} onPress={handleClearHistory} disabled={loading}>
                    <Text style={styles.dangerText}>Clear Chat History</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount} disabled={loading}>
                    <Text style={styles.dangerText}>Delete Account</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#FF453A" />
                </View>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0E141C' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 40,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#161B23',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerPill: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 30, // Fully rounded pill
        backgroundColor: '#161B23',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#E8EDF7',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold', // Or system font if Raleway not loaded in this file scope context (it should be global if loaded in root)
    },
    spacer: { width: 44 },

    content: {
        paddingHorizontal: 20,
        gap: 16,
    },
    dangerButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        backgroundColor: 'rgba(35, 12, 12, 0.4)', // Very subtle red tint bg
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 58, 0.3)', // Red outline
        alignItems: 'center', // Centered text if that's what image implies? 
        // Image shows text left aligned actually. Let's check image... 
        // Image: "Clear Chat History" is red, left aligned. Background is dark. Border is thin light/red.
        alignItems: 'flex-start',
        paddingHorizontal: 24,
    },
    dangerText: {
        color: '#FF453A',
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'Raleway',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
