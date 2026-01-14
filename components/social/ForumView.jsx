import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
    { id: 'c1', name: 'General Chat', icon: 'chatbubbles' },
    { id: 'c2', name: 'Destinations', icon: 'map' },
    { id: 'c3', name: 'Visa & Immigration', icon: 'card' },
    { id: 'c4', name: 'Travel Tips', icon: 'bulb' },
];

const TOPICS = [
    {
        id: 't1',
        title: 'Best SIM card for Japan?',
        category: 'Travel Tips',
        user: { name: 'John Doe', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' },
        timestamp: '3h ago',
        repliesCount: 12,
        body: 'Heading to Tokyo next week. Should I get Pocket Wifi or just an eSIM? I heard Airalo is good but I want reliable speeds for video calls.'
    },
    {
        id: 't2',
        title: 'Hidden gems in Bali away from crowds',
        category: 'Destinations',
        user: { name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
        timestamp: '5h ago',
        repliesCount: 8,
        body: 'Ubud is too crowded now. Looking for something peaceful in the North. Any recommendations?'
    },
    {
        id: 't3',
        title: 'US Visa wait times in 2026',
        category: 'Visa & Immigration',
        user: { name: 'Mike', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36' },
        timestamp: '1d ago',
        repliesCount: 45,
        body: 'Just checked the embassy site and it says 400 days! Is this real? Has anyone applied recently?'
    }
];

export default function ForumView() {
    const router = useRouter();

    const renderHeader = () => (
        <View style={styles.categoriesRow}>
            {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.id} style={styles.categoryCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={cat.icon} size={20} color="#3E6FFF" />
                    </View>
                    <Text style={styles.catName}>{cat.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <FlatList
            data={TOPICS}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={styles.topicCard}
                    onPress={() => router.push({ pathname: '/TopicScreen', params: { topic: JSON.stringify(item) } })}
                >
                    <View style={styles.topicHeader}>
                        <Text style={styles.topicCategory}>{item.category}</Text>
                        <Text style={styles.topicTime}>{item.timestamp}</Text>
                    </View>
                    <Text style={styles.topicTitle}>{item.title}</Text>
                    <View style={styles.topicFooter}>
                        <Text style={styles.topicUser}>by {item.user.name}</Text>
                        <View style={styles.replyCount}>
                            <Ionicons name="chatbubble-outline" size={14} color="#666" />
                            <Text style={styles.replyText}>{item.repliesCount}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            )}
        />
    );
}

const styles = StyleSheet.create({
    categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    categoryCard: { width: '48%', backgroundColor: '#1C222C', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(62, 111, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
    catName: { color: 'white', fontSize: 14, fontFamily: 'Raleway_700Bold', flex: 1 },

    topicCard: { backgroundColor: '#171E27', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1E2A3A' },
    topicHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    topicCategory: { color: '#3E6FFF', fontSize: 12, fontFamily: 'Raleway_700Bold' },
    topicTime: { color: '#666', fontSize: 12 },
    topicTitle: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold', marginBottom: 12 },
    topicFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topicUser: { color: '#9BA4B4', fontSize: 13 },
    replyCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    replyText: { color: '#666', fontSize: 13 }
});
