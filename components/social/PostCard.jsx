import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function PostCard({ post }) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [bookmarked, setBookmarked] = useState(false);

    const toggleLike = () => {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
    };

    const toggleBookmark = () => {
        setBookmarked(!bookmarked);
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                    <View>
                        <Text style={styles.username}>{post.user.name}</Text>
                        {post.location && (
                            <Text style={styles.location}>{post.location}</Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#9BA4B4" />
                </TouchableOpacity>
            </View>

            {/* Main Media */}
            <Image source={{ uri: post.image }} style={styles.media} resizeMode="cover" />

            {/* Actions */}
            <View style={styles.footer}>
                <View style={styles.actionsRow}>
                    <View style={styles.leftActions}>
                        <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
                            <Ionicons
                                name={liked ? "heart" : "heart-outline"}
                                size={28}
                                color={liked ? "#FF4B55" : "white"}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="chatbubble-outline" size={26} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="paper-plane-outline" size={26} color="white" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={toggleBookmark}>
                        <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={26} color={bookmarked ? "#3E6FFF" : "white"} />
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>

                <View style={styles.captionRow}>
                    <Text style={styles.captionUser}>{post.user.name}</Text>
                    <Text style={styles.captionText} numberOfLines={2}>
                        {post.caption}
                    </Text>
                </View>

                <TouchableOpacity>
                    <Text style={styles.timestamp}>View all {post.comments} comments</Text>
                </TouchableOpacity>
                <Text style={[styles.timestamp, { marginTop: 2 }]}>{post.timestamp}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 24,
        backgroundColor: '#0E141C',
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
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1C222C',
    },
    username: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Raleway_700Bold',
    },
    location: {
        color: '#9BA4B4',
        fontSize: 11,
        fontFamily: 'Raleway_400Regular',
    },

    media: {
        width: width,
        height: width * 1.0, // Square or 4:5 aspect ratio
        backgroundColor: '#1C222C',
    },

    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionBtn: {
        // hit slop could be added
    },

    likes: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 6,
        fontFamily: 'Raleway_700Bold',
    },
    captionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 6,
    },
    captionUser: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
        marginRight: 6,
        fontFamily: 'Raleway_700Bold',
    },
    captionText: {
        color: '#E6EDF3',
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Raleway_400Regular',
        flex: 1,
    },
    timestamp: {
        color: '#667085',
        fontSize: 12,
        fontFamily: 'Raleway_400Regular',
    },
});
