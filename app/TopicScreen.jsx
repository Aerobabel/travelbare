import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function TopicScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const topic = params.topic ? JSON.parse(params.topic) : null;

    const [reply, setReply] = useState('');
    const [messages, setMessages] = useState(topic?.replies || [
        { id: 'r1', user: 'Alex', text: 'I totally agree with this! The visa process was super smooth for me too.', time: '2h ago', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36' },
        { id: 'r2', user: 'Maria', text: 'Thanks for the tip. Did you need an appointment?', time: '1h ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' }
    ]);

    const handleSend = () => {
        if (!reply.trim()) return;
        const newMsg = {
            id: Math.random().toString(),
            user: 'Me',
            text: reply,
            time: 'Just now',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'
        };
        setMessages([...messages, newMsg]);
        setReply('');
    };

    if (!topic) return null;

    const renderHeader = () => (
        <View style={styles.mainPost}>
            <View style={styles.userInfo}>
                <Image source={{ uri: topic.user.avatar }} style={styles.avatar} />
                <View>
                    <Text style={styles.username}>{topic.user.name}</Text>
                    <Text style={styles.time}>{topic.timestamp}</Text>
                </View>
            </View>
            <Text style={styles.title}>{topic.title}</Text>
            <Text style={styles.body}>{topic.body}</Text>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Replies ({messages.length})</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Topic</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <View style={styles.replyCard}>
                        <Image source={{ uri: item.avatar }} style={styles.replyAvatar} />
                        <View style={styles.replyContent}>
                            <View style={styles.replyHeader}>
                                <Text style={styles.replyUser}>{item.user}</Text>
                                <Text style={styles.replyTime}>{item.time}</Text>
                            </View>
                            <Text style={styles.replyText}>{item.text}</Text>
                        </View>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Add a reply..."
                        placeholderTextColor="#666"
                        value={reply}
                        onChangeText={setReply}
                    />
                    <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0E141C' },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1E2A3A' },
    navTitle: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold' },

    mainPost: { padding: 20, borderBottomWidth: 8, borderColor: '#111821' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333' },
    username: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold' },
    time: { color: '#666', fontSize: 13, fontFamily: 'Raleway_400Regular' },
    title: { color: 'white', fontSize: 20, fontFamily: 'Raleway_700Bold', marginBottom: 8 },
    body: { color: '#E0E0E0', fontSize: 15, lineHeight: 22, fontFamily: 'Raleway_400Regular' },
    divider: { height: 1, backgroundColor: '#1E2A3A', marginVertical: 20 },
    sectionTitle: { color: '#9BA4B4', fontSize: 14, fontFamily: 'Raleway_700Bold' },

    replyCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#1E2A3A' },
    replyAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: '#333' },
    replyContent: { flex: 1 },
    replyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    replyUser: { color: 'white', fontSize: 14, fontFamily: 'Raleway_700Bold' },
    replyTime: { color: '#666', fontSize: 12 },
    replyText: { color: '#CCC', fontSize: 14, lineHeight: 20, fontFamily: 'Raleway_400Regular' },

    inputBar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#1E2A3A', backgroundColor: '#0E141C' },
    input: { flex: 1, backgroundColor: '#1C222C', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: 'white', marginRight: 10 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3E6FFF', justifyContent: 'center', alignItems: 'center' }
});
