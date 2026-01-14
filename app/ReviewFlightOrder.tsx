
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://travelapi-34zi.onrender.com';
const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY || 'pk_test_51O2...'; // Fallback or env

const TEXT = '#E9EEF8';
const SUBTLE = '#8A93A0';
const BG = '#0C111A';
const CARD = '#121826';
const INPUT_BG = '#ffffff09';
const BLUE = '#2F6BFF';
const BORDER = '#283142';

function ReviewFlightOrderContent() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [loading, setLoading] = useState(false);

    // Parse offer data
    let offer = null;
    try {
        if (params.offer) {
            offer = JSON.parse(params.offer as string);
        }
    } catch (e) {
        console.error("Failed to parse offer", e);
    }

    const [travelerName, setTravelerName] = useState('Jane Doe');
    const [email, setEmail] = useState('jane@example.com');

    if (!offer) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white' }}>Invalid Flight Offer</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: BLUE }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    const handlePay = async () => {
        if (!travelerName || !email) {
            Alert.alert('Missing info', 'Please enter traveler details');
            return;
        }

        try {
            setLoading(true);
            // 1. Create Booking / PaymentIntent
            const res = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'flight',
                    itemId: offer.id,
                    price: offer.price,
                    currency: offer.currency || 'USD',
                    details: {
                        airline: offer.airline,
                        from: offer.airportFrom,
                        to: offer.airportTo,
                        date: offer.depart, // e.g. "2023-12-25" or ISO
                        duration: offer.duration,
                        traveler: travelerName,
                        email
                    }
                })
            });

            const json = await res.json();

            if (!json.success || !json.clientSecret) {
                Alert.alert('Error', json.error || 'Payment init failed');
                setLoading(false);
                return;
            }

            // 2. Init Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Nuvia Travel',
                paymentIntentClientSecret: json.clientSecret,
                defaultBillingDetails: {
                    name: travelerName,
                    email: email
                }
            });

            if (initError) {
                Alert.alert('Stripe Error', initError.message);
                setLoading(false);
                return;
            }

            // 3. Present Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                Alert.alert('Payment cancelled', paymentError.message);
            } else {
                // Success
                router.push({
                    pathname: '/BookingSuccess',
                    params: {
                        bookingId: json.booking.id,
                        hotelName: `Flight to ${offer.airportTo}`, // Reusing hotelName param for simple display
                        dates: `${offer.depart} - ${offer.arrive}`,
                        price: offer.price.toFixed(2)
                    }
                });
            }

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={TEXT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review Order</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Flight Card */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.city}>{offer.airportFrom}</Text>
                            <Text style={styles.time}>{offer.depart}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.duration}>{offer.duration}</Text>
                            <View style={styles.line} />
                            <Ionicons name="airplane" size={16} color={BLUE} />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.city}>{offer.airportTo}</Text>
                            <Text style={styles.time}>{offer.arrive}</Text>
                        </View>
                    </View>
                    <View style={styles.airlineRow}>
                        <Text style={styles.airline}>{offer.airline}</Text>
                        <Text style={styles.price}>${offer.price}</Text>
                    </View>
                </View>

                {/* Traveler Info */}
                <Text style={styles.sectionTitle}>Traveler Details</Text>
                <View style={styles.card}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={travelerName}
                        onChangeText={setTravelerName}
                        placeholder="e.g. Jane Doe"
                        placeholderTextColor={SUBTLE}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        placeholderTextColor={SUBTLE}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Price Breakdown */}
                <Text style={styles.sectionTitle}>Price Breakdown</Text>
                <View style={styles.card}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Flight Fare</Text>
                        <Text style={styles.priceValue}>${offer.price.toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Taxes & Fees</Text>
                        <Text style={styles.priceValue}>$0.00</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: 'white', fontWeight: 'bold' }]}>Total</Text>
                        <Text style={[styles.priceValue, { color: 'white', fontWeight: 'bold', fontSize: 18 }]}>${offer.price.toFixed(2)}</Text>
                    </View>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <View>
                    <Text style={{ color: SUBTLE, fontSize: 12 }}>Total</Text>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>${offer.price.toFixed(2)}</Text>
                </View>
                <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payBtnText}>Pay & Book</Text>}
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

// Wrapper
export default function ReviewFlightOrder() {
    return (
        <StripeProvider publishableKey={STRIPE_KEY}>
            <ReviewFlightOrderContent />
        </StripeProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 50 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
    scroll: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    city: { color: TEXT, fontSize: 24, fontWeight: '800' },
    time: { color: SUBTLE, fontSize: 14, marginTop: 4 },
    duration: { color: SUBTLE, fontSize: 12, marginBottom: 4 },
    line: { width: 80, height: 1, backgroundColor: SUBTLE, marginBottom: 4 },
    airlineRow: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    airline: { color: TEXT, fontSize: 16, fontWeight: '600' },
    price: { color: '#34D399', fontSize: 18, fontWeight: '800' },
    sectionTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 12 },
    label: { color: SUBTLE, fontSize: 14, marginBottom: 8 },
    input: { backgroundColor: INPUT_BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, color: 'white', padding: 12, fontSize: 16 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    priceLabel: { color: SUBTLE, fontSize: 14 },
    priceValue: { color: TEXT, fontSize: 14 },
    divider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BG, padding: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    payBtn: { backgroundColor: BLUE, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
    payBtnText: { color: 'white', fontWeight: '700', fontSize: 16 }
});
