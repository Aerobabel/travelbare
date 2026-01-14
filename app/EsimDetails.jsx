import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PACKAGES = [
    { id: '1', data: '1 GB', duration: '7 Days', price: '$4.00' },
    { id: '2', data: '3 GB', duration: '30 Days', price: '$8.00' },
    { id: '3', data: '5 GB', duration: '30 Days', price: '$12.00' },
    { id: '4', data: '10 GB', duration: '30 Days', price: '$19.00' },
    { id: '5', data: '20 GB', duration: '30 Days', price: '$32.00' },
];

export default function EsimDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0].id);
    const [tab, setTab] = useState('Standard');

    const { name, flag } = params;

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#E9EEF8" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{name || 'Turkey'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <Text style={styles.flag}>{flag || '🇹🇷'}</Text>
                            <Text style={styles.infoCardTitle}>{name || 'Turkey'}</Text>
                        </View>

                        <View style={styles.operatorRow}>
                            <View style={styles.operatorIcon}>
                                <Feather name="bar-chart-2" size={24} color="#aaa" style={{ transform: [{ rotate: '90deg' }] }} />
                            </View>
                            <View>
                                <Text style={styles.operatorName}>Merhaba</Text>
                                <View style={styles.coverageRow}>
                                    <Text style={styles.coverageText}>Turk Telekom (Avea)</Text>
                                    <View style={styles.badge5g}>
                                        <Text style={styles.badge5gText}>5G</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.compatibilityRow}>
                            <Text style={styles.compatibilityText}>Is this device compatible?</Text>
                            <View style={styles.checkRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
                                <Text style={styles.yesText}>Yes</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, tab === 'Standard' && styles.tabActive]}
                            onPress={() => setTab('Standard')}
                        >
                            <Text style={[styles.tabText, tab === 'Standard' && styles.tabTextActive]}>Standard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, tab === 'Unlimited' && styles.tabActive]}
                            onPress={() => setTab('Unlimited')}
                        >
                            <Text style={[styles.tabText, tab === 'Unlimited' && styles.tabTextActive]}>Unlimited</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Packages */}
                    <Text style={styles.sectionTitle}>Choose your package</Text>
                    <Text style={styles.subTitle}>{PACKAGES[0].duration}</Text>

                    {/* Only mock logic for "3 Days" etc. in the list headers, for now flat list */}
                    <View style={styles.packagesList}>
                        {PACKAGES.map((pkg) => {
                            const isSelected = selectedPackage === pkg.id;
                            return (
                                <TouchableOpacity
                                    key={pkg.id}
                                    style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                                    onPress={() => setSelectedPackage(pkg.id)}
                                >
                                    <View style={styles.packageLeft}>
                                        <Text style={[styles.packageData, isSelected && styles.packageTextSelected]}>{pkg.data}</Text>
                                    </View>
                                    <Text style={[styles.packagePrice, isSelected && styles.packageTextSelected]}>{pkg.price}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Bar */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.buyButton}>
                        <Text style={styles.buyButtonText}>Buy now</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0E141C',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 44,
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Raleway_600SemiBold',
        color: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    infoCard: {
        backgroundColor: '#151A24',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2A3649',
        marginBottom: 24,
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    infoCardTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Raleway_600SemiBold',
    },
    operatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    operatorIcon: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: '#666',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    operatorName: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_700Bold',
    },
    coverageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    coverageText: {
        color: '#A5B0C4',
        fontSize: 12,
        fontFamily: 'Raleway_400Regular',
        marginRight: 6,
    },
    badge5g: {
        backgroundColor: '#fff',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    badge5gText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#2A3649',
        marginBottom: 12,
    },
    compatibilityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    compatibilityText: {
        color: '#A5B0C4',
        fontSize: 12,
        fontFamily: 'Raleway_400Regular',
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    yesText: {
        color: '#4CD964',
        fontSize: 12,
        marginLeft: 4,
        fontFamily: 'Raleway_600SemiBold',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#151A24',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#2A3649',
    },
    tab: {
        flex: 1,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#2A3649', // Or slightly lighter? Image looks dark. 
        // Actually image shows focused style? Wait, "Standard" and "Unlimited" look like tabs. 
        // Image shows "Regional" active as blue. But detailed view tabs look dark grey background.
        backgroundColor: '#1C2533',
    },
    tabText: {
        color: '#A5B0C4',
        fontSize: 14,
        fontFamily: 'Raleway_600SemiBold',
    },
    tabTextActive: {
        color: '#fff',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
        marginBottom: 8,
    },
    subTitle: {
        color: '#A5B0C4',
        fontSize: 12,
        fontFamily: 'Raleway_400Regular',
        marginBottom: 12,
    },
    packagesList: {
        gap: 10,
    },
    packageCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#151A24',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2A3649', // or transparent if not selected
    },
    packageCardSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#007AFF10', // slightly tinted? 
        // Image shows blue border and maybe background is still dark but the border highlights it.
    },
    packageLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    packageData: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    packagePrice: {
        color: '#fff', // or A5B0C4
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    packageTextSelected: {
        color: '#fff', // Keep white.
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#0E141C',
        borderTopWidth: 1,
        borderTopColor: '#2A3649',
    },
    buyButton: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_700Bold',
    },
});
