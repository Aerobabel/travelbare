
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const BG = '#030712'; // Dark slate/gray
const TEXT = '#F3F4F6'; // Cool gray 100
const PRIMARY = '#3B82F6'; // Blue 500
const SUBTLE = '#9CA3AF'; // Gray 400

export default function BookingSuccess() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, []);

    const bookingId = params.bookingId || 'Ref12345';
    const hotelName = params.hotelName || 'Hotel Name';
    const dates = params.dates || 'Dates';
    const price = params.price || '0.00';

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.header}>
                    <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
                        <Ionicons name="checkmark" size={64} color="white" />
                    </Animated.View>
                    <Text style={styles.title}>Booking Confirmed!</Text>
                    <Text style={styles.subtitle}>Pack your bags, you're going to {hotelName}.</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Reference</Text>
                        <Text style={styles.value}>{bookingId}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Hotel</Text>
                        <Text style={styles.value}>{hotelName}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Dates</Text>
                        <Text style={styles.value}>{dates}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Total Paid</Text>
                        <Text style={[styles.value, { color: '#34D399', fontWeight: '800' }]}>${price}</Text>
                    </View>
                </View>

                <Text style={styles.infoText}>
                    A confirmation email has been sent to your inbox.
                </Text>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.push('/(tabs)/MyTrips')}
                >
                    <Text style={styles.btnText}>View My Trips</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => router.navigate('/')} // Go Home
                >
                    <Text style={styles.secBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    content: {
        padding: 24,
        paddingTop: 80,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#10B981', // Emerald 500
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: TEXT,
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'Raleway_400Regular', // Assuming this font is available
    },
    subtitle: {
        fontSize: 16,
        color: SUBTLE,
        textAlign: 'center',
        maxWidth: '80%',
        fontFamily: 'Raleway_400Regular',
    },
    card: {
        width: '100%',
        backgroundColor: '#111827', // Gray 900
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#1F2937', // Gray 800
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    label: {
        fontSize: 14,
        color: SUBTLE,
        fontFamily: 'Raleway_400Regular',
    },
    value: {
        fontSize: 16,
        color: TEXT,
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
        fontFamily: 'Raleway_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#1F2937',
    },
    infoText: {
        color: '#6B7280',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 40,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        backgroundColor: BG,
    },
    primaryBtn: {
        backgroundColor: PRIMARY,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secBtnText: {
        color: SUBTLE,
        fontSize: 16,
        fontWeight: '600',
    }
});
