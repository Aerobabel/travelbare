import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function CreatorTourCard({ tour }) {
    const router = useRouter();
    const [bookmarked, setBookmarked] = useState(false);
    const [following, setFollowing] = useState(false);

    const handleViewItinerary = () => {
        // Generate a plan object compatible with TripDetails
        const plan = {
            location: tour.location,
            country: tour.country || '',
            dates: `${tour.duration} Days`,
            dateRange: 'Flexible Dates',
            description: tour.description,
            image: tour.image,
            price: tour.price,
            itinerary: tour.itinerary || [], // Should be passed in mock data
            costBreakdown: tour.costBreakdown || [],
            weather: { icon: 'sunny', temp: 25 },
            isCreatorTour: true,
            creator: tour.user
        };

        router.push({
            pathname: '/TripDetails',
            params: { plan: JSON.stringify(plan), readOnly: 'true' }
        });
    };

    return (
        <View style={styles.card}>
            {/* Header: Creator Info */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: tour.user.avatar }} style={styles.avatar} />
                    <View>
                        <Text style={styles.username}>{tour.user.name}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Verified Guide</Text>
                            </View>
                            {!following && (
                                <TouchableOpacity onPress={() => setFollowing(true)}>
                                    <Text style={styles.followText}>• Follow</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setBookmarked(!bookmarked)}>
                    <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={24} color={bookmarked ? "#3E6FFF" : "white"} />
                </TouchableOpacity>
            </View>

            {/* Main Stats Overlay on Image */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: tour.image }} style={styles.media} resizeMode="cover" />
                <View style={styles.overlay}>
                    <View style={styles.statChip}>
                        <Ionicons name="time-outline" size={14} color="white" />
                        <Text style={styles.statText}>{tour.duration} Days</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: '#3E6FFF' }]}>
                        <Text style={styles.statText}>${tour.price}</Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.footer}>
                <Text style={styles.title}>{tour.title}</Text>
                <Text style={styles.location}>{tour.location}</Text>

                <Text style={styles.description} numberOfLines={2}>
                    {tour.description}
                </Text>

                <TouchableOpacity style={styles.ctaButton} onPress={handleViewItinerary}>
                    <Text style={styles.ctaText}>View Full Itinerary</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 24,
        backgroundColor: '#0E141C',
        borderRadius: 0, // Edge to edge like posts
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1C222C',
    },
    username: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Raleway_700Bold',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2
    },
    badge: {
        backgroundColor: '#1C222C',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    badgeText: {
        color: '#3E6FFF',
        fontSize: 10,
        fontWeight: '700'
    },
    followText: {
        color: '#9BA4B4',
        fontSize: 12,
        fontWeight: '600'
    },

    imageContainer: {
        position: 'relative'
    },
    media: {
        width: width,
        height: width * 0.7, // 4:3 roughly
        backgroundColor: '#1C222C',
    },
    overlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        gap: 8
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backdropFilter: 'blur(4px)'
    },
    statText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 13
    },

    footer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Raleway_700Bold',
        marginBottom: 2
    },
    location: {
        color: '#9BA4B4',
        fontSize: 13,
        fontFamily: 'Raleway_400Regular',
        marginBottom: 10
    },
    description: {
        color: '#E6EDF3',
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Raleway_400Regular',
        marginBottom: 16
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1E2A3A',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3E6FFF'
    },
    ctaText: {
        color: '#3E6FFF',
        fontSize: 16,
        fontWeight: '700'
    }
});
