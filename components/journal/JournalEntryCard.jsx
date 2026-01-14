import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function JournalEntryCard({ entry, isLast }) {
    return (
        <View style={styles.container}>
            {/* Timeline Component */}
            <View style={styles.timeline}>
                <View style={styles.timelineDot} />
                {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Content */}
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.date}>{entry.date}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-sharp" size={12} color="#667085" />
                            <Text style={styles.location}>{entry.location}</Text>
                        </View>
                    </View>
                    <Text style={styles.mood}>{entry.mood}</Text>
                </View>

                {/* Title & Body */}
                <Text style={styles.title}>{entry.title}</Text>
                <Text style={styles.body}>{entry.text}</Text>

                {/* Image Gallery */}
                {entry.images && entry.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                        {entry.images.map((img, index) => (
                            <Image key={index} source={{ uri: img }} style={styles.image} />
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', marginBottom: 4 },

    timeline: { alignItems: 'center', width: 40, marginRight: 8 },
    timelineDot: {
        width: 12, height: 12, borderRadius: 6, backgroundColor: '#3E6FFF',
        borderWidth: 2, borderColor: '#1A1F2B', marginTop: 18, zIndex: 1
    },
    timelineLine: { flex: 1, width: 2, backgroundColor: '#2A3340', marginTop: -4 },

    card: {
        flex: 1, backgroundColor: '#1A1F2B', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#2A3340', marginBottom: 20
    },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    date: { color: '#3E6FFF', fontSize: 13, fontWeight: 'bold' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    location: { color: '#667085', fontSize: 12 },
    mood: { fontSize: 20 },

    title: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
    body: { color: '#ccc', fontSize: 14, lineHeight: 20 },

    gallery: { marginTop: 12 },
    image: { width: 100, height: 100, borderRadius: 8, marginRight: 8, backgroundColor: '#0E141C' }
});
