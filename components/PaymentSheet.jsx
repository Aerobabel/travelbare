import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser'; // Correctly placed import
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGlassStyle, getGlassTextStyle } from '../constants/GlassStyles';
import { useTheme } from '../context/ThemeContext';
import { GlassReflection } from './ui/GlassReflection';
import { LiquidTexture } from './ui/LiquidTexture';

const { width } = Dimensions.get('window');

const PaymentSheet = ({ visible, onClose, plan }) => {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();

    // Mock data if real cost breakdown isn't available
    const items = plan?.costBreakdown || [
        { item: 'Fly Tickets', provider: 'Wizz Air/Turkish Airlines', price: 250.00 },
        { item: 'Hotel', provider: 'Radisson (Family suit)', price: 570.00 },
        { item: 'Transfers', provider: 'Get transfer', price: 160.00 },
        { item: 'Excursions', provider: 'Get Guide', price: 250.00 },
        { item: 'Insurance', provider: 'Axa Schengen', price: 40.00 },
    ];



    // ... imports ...

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    const normalizeZenBookingUrl = (rawUrl, item) => {
        try {
            const parsed = new URL(rawUrl);
            const host = (parsed.hostname || '').replace(/^www\./, '').toLowerCase();
            if (host !== 'zenhotels.com') return rawUrl;

            const roomPath = /^\/rooms\/([^/]+)\/?$/i.exec(parsed.pathname || '');
            if (!roomPath) return rawUrl;

            const roomId = String(roomPath[1] || '').trim();
            if (/^\d+$/.test(roomId)) return rawUrl;

            // Recover from broken deep links stored in old plans.
            const params = new URLSearchParams(parsed.search || '');
            const q = `${item?.provider || ''} ${plan?.location || ''}`.trim();
            if (q) params.set('q', q);
            return `https://www.zenhotels.com/hotels/?${params.toString()}`;
        } catch {
            return rawUrl;
        }
    };

    const handlePayNow = async (item) => {
        const itemType = (item.item || '').toLowerCase();
        const provider = (item.provider || '').toLowerCase();
        let url = item.booking_url || 'https://www.google.com/search?q=book+trip'; // Use AI URL if available

        if (item.booking_url) {
            url = normalizeZenBookingUrl(item.booking_url, item);
        }
        // 1. Transfers -> GetTransfer (Explicit user request)
        else if (itemType.includes('transfer') || provider.includes('get transfer')) {
            url = 'https://gettransfer.com/';
        }
        // 2. Flights -> Search
        else if (itemType.includes('flight') || itemType.includes('fly')) {
            const airline = item.raw?.airline || item.provider || '';
            const query = `book flight ${airline} ${item.raw?.origin || ''} to ${item.raw?.destination || ''}`.trim();
            url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        // 3. Hotels -> Search
        else if (itemType.includes('hotel') || itemType.includes('stay') || provider.includes('hotel')) {
            const query = `book hotel ${item.provider || ''} ${plan.location || ''}`.trim();
            url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        // 4. Excursions/Others -> Search
        else {
            const query = `book ${item.item} ${item.provider || ''} ${plan.location || ''}`.trim();
            url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }

        try {
            await WebBrowser.openBrowserAsync(url, {
                toolbarColor: '#131820', // Dark theme to match app
                controlsColor: '#3E6FFF',
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.MODAL,
            });
        } catch (error) {
            console.error("Failed to open browser", error);
        }
    };


    const glassStyle = getGlassStyle(theme);
    const glassTextStyle = getGlassTextStyle(theme);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView
                intensity={glassStyle.shadowOpacity * 100 + 60}
                tint={theme === 'light' ? 'light' : 'dark'}
                style={[
                    styles.container,
                    { backgroundColor: glassStyle.backgroundColor.replace('0.03', '0.01') } // Even more transparent for full screen
                ]}
            >
                <LiquidTexture opacity={0.1} scale={2} />
                <GlassReflection opacity={0.05} />
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <BlurView
                        intensity={glassStyle.shadowOpacity * 100 + 50}
                        tint={theme === 'light' ? 'light' : 'dark'}
                        style={[
                            styles.circleBtn,
                            {
                                borderColor: glassStyle.borderColor,
                                borderWidth: glassStyle.borderWidth,
                                backgroundColor: glassStyle.backgroundColor,
                                overflow: 'hidden'
                            }
                        ]}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </BlurView>
                    <BlurView
                        intensity={glassStyle.shadowOpacity * 100 + 50}
                        tint={theme === 'light' ? 'light' : 'dark'}
                        style={[
                            styles.headerPill,
                            {
                                borderColor: glassStyle.borderColor,
                                borderWidth: glassStyle.borderWidth,
                                backgroundColor: glassStyle.backgroundColor,
                                overflow: 'hidden'
                            }
                        ]}
                    >
                        <View style={{ paddingHorizontal: 24, paddingVertical: 10 }}>
                            <Text style={[styles.headerTitle, { color: colors.text }, glassTextStyle]}>Trip Payment</Text>
                        </View>
                    </BlurView>
                    <View style={styles.spacer} />
                </View>

                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {items.map((item, index) => (
                        <BlurView
                            intensity={30} // Cards inside can be less intense
                            tint={theme === 'light' ? 'light' : 'dark'}
                            key={index}
                            style={[
                                styles.cardItem,
                                {
                                    borderColor: glassStyle.borderColor,
                                    borderWidth: glassStyle.borderWidth,
                                    backgroundColor: 'rgba(255,255,255,0.02)', // Slightly distinct from bg
                                    overflow: 'hidden'
                                }
                            ]}
                        >
                            <LiquidTexture opacity={0.1} />
                            <GlassReflection opacity={0.15} />
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, { color: colors.text }, glassTextStyle]}>{item.item}</Text>
                                <Text style={[styles.itemProvider, { color: colors.textSecondary }]}>
                                    {(item.raw && item.raw.airline)
                                        ? item.raw.airline.split(/[\/\?,(]/)[0].trim()
                                        : (item.provider ? item.provider.split(/[\/\?,(]/)[0].trim() : '')}
                                </Text>
                            </View>
                            <View style={styles.itemActions}>
                                <Text style={[styles.itemPrice, { color: colors.text }, glassTextStyle]}>{formatPrice(item.price)}</Text>
                                <TouchableOpacity style={styles.payButton} onPress={() => handlePayNow(item)}>
                                    <Text style={styles.payButtonText}>Pay Now</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    ))}
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
                    <TouchableOpacity
                        style={[
                            styles.closeButton,
                            theme === 'light' ? {
                                backgroundColor: '#FFFFFF',
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.1,
                                shadowRadius: 10,
                                elevation: 5,
                                borderWidth: 0
                            } : {
                                backgroundColor: '#161B23',
                                borderColor: 'rgba(255,255,255,0.1)'
                            }
                        ]}
                        onPress={onClose}
                    >
                        <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                    </TouchableOpacity>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(14, 20, 28, 0.95)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginTop: 10,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerPill: {
        borderRadius: 30,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    spacer: {
        width: 44,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 120, // Space for footer
    },
    cardItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20, // Increased padding
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    itemInfo: {
        flex: 1,
        paddingRight: 10,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        fontFamily: 'Raleway_700Bold',
    },
    itemProvider: {
        fontSize: 13,
        fontFamily: 'Raleway_400Regular',
    },
    itemActions: {
        alignItems: 'flex-end',
        gap: 10,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Raleway_700Bold',
    },
    payButton: {
        backgroundColor: '#3E6FFF',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 30, // Much rounder
    },
    payButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        fontFamily: 'Raleway_700Bold',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    closeButton: {
        backgroundColor: '#161B23',
        paddingVertical: 18,
        borderRadius: 30, // Pill Shape
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Raleway_600SemiBold',
    },
});

export default PaymentSheet;
