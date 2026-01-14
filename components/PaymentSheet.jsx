import {
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Constants ---
const PRIMARY = '#3E6FFF';
const CARD_BG = '#1C222C';
const SHEET_BG = '#0F151C';
const TEXT_COLOR = '#FFFFFF';
const TEXT_MUTED = '#9CA3AF';

const PaymentSheet = ({ visible, onClose, plan }) => {
    const insets = useSafeAreaInsets();

    // Mock data if real cost breakdown isn't available
    const items = plan?.costBreakdown || [
        { item: 'Fly Tickets', provider: 'Wizz Air/Turkish Airlines', price: 250.00 },
        { item: 'Hotel', provider: 'Radisson (Family suit)', price: 570.00 },
        { item: 'Transfers', provider: 'Get transfer', price: 160.00 },
        { item: 'Excursions', provider: 'Get Guide', price: 250.00 },
        { item: 'Insurance', provider: 'Axa Schengen', price: 40.00 },
    ];

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>

                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                <Text style={styles.title}>Trip Payment</Text>

                <ScrollView contentContainerStyle={styles.listContent}>
                    {items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.item}</Text>
                                <Text style={styles.itemProvider}>{item.provider}</Text>
                            </View>
                            <View style={styles.itemActions}>
                                <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                                <TouchableOpacity style={styles.payButton}>
                                    <Text style={styles.payButtonText}>Pay Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: SHEET_BG,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    handleContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 6,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#2A3441',
        borderRadius: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: TEXT_COLOR,
        textAlign: 'center',
        marginBottom: 24,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2A3A',
        paddingBottom: 16,
    },
    itemInfo: {
        flex: 1,
        paddingRight: 10,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_COLOR,
        marginBottom: 4,
    },
    itemProvider: {
        fontSize: 13,
        color: TEXT_MUTED,
    },
    itemActions: {
        alignItems: 'flex-end',
        gap: 8,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_COLOR,
    },
    payButton: {
        backgroundColor: PRIMARY,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    payButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: '#1C222C',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    closeButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PaymentSheet;
