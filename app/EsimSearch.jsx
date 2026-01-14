import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Dimensions,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COUNTRIES = [
    { id: '1', name: 'Turkey', price: '$4.00', flag: '🇹🇷', region: 'Local' },
    { id: '2', name: 'China', price: '$4.00', flag: '🇨🇳', region: 'Local' },
    { id: '3', name: 'UAE', price: '$4.00', flag: '🇦🇪', region: 'Local' },
    { id: '4', name: 'Germany', price: '$4.00', flag: '🇩🇪', region: 'Local' },
    { id: '5', name: 'Russia', price: '$4.00', flag: '🇷🇺', region: 'Local' },
    { id: '6', name: 'Albania', price: '$4.00', flag: '🇦🇱', region: 'Local' },
    { id: '7', name: 'Algeria', price: '$4.50', flag: '🇩🇿', region: 'Local' },
    { id: '8', name: 'Andorra', price: '$4.00', flag: '🇦🇩', region: 'Local' },
    { id: '9', name: 'Africa', price: '$27.00', flag: '🌍', region: 'Regional' },
    { id: '10', name: 'Asia', price: '$4.50', flag: '🌏', region: 'Regional' },
    { id: '11', name: 'Global', price: '$48.00', flag: '🌐', region: 'Global' },
];

const FILTERS = ['Popular', 'Local', 'Regional', 'Global'];

export default function EsimSearch() {
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState('Local');
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [recentSearches, setRecentSearches] = useState([
        'Germany', 'Italy', 'United Kingdom', 'South Africa', 'Spain'
    ]);

    const clearAllRecents = () => setRecentSearches([]);
    const removeRecent = (item) => setRecentSearches(prev => prev.filter(i => i !== item));

    const filteredData = COUNTRIES.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
        const matchesFilter = activeFilter === 'Popular' ? true : // Mock logic for popular
            activeFilter === 'Regional' ? item.region === 'Regional' :
                activeFilter === 'Global' ? item.region === 'Global' :
                    item.region === 'Local'; // Default to local for Local tab

        // For this mock, let's just use searching as primary if text exists, else filter
        if (searchText.length > 0) return matchesSearch;
        return matchesFilter;
    });

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/EsimDetails', params: { ...item } })}
        >
            <View style={styles.cardLeft}>
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
            </View>
            <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{item.price}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => {
                        if (searchFocused) {
                            setSearchFocused(false);
                            setSearchText('');
                            Keyboard.dismiss();
                        } else {
                            router.back();
                        }
                    }} style={styles.backButton}>
                        <Ionicons name={searchFocused ? "chevron-back" : "arrow-back"} size={24} color="#E9EEF8" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{searchFocused ? '' : 'eSIM'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.paddingH}>
                    <View style={styles.searchBarContainer}>
                        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Where do you need an eSIM?"
                            placeholderTextColor="#666"
                            value={searchText}
                            onChangeText={setSearchText}
                            onFocus={() => setSearchFocused(true)}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {searchFocused ? (
                        <View style={styles.searchContent}>
                            {/* Recent Searches */}
                            {searchText.length === 0 && (
                                <View>
                                    <View style={styles.recentHeader}>
                                        <Text style={styles.recentTitle}>Recent Searches</Text>
                                        <TouchableOpacity onPress={clearAllRecents}>
                                            <Text style={styles.clearAllText}>Clear All</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.chipsContainer}>
                                        {recentSearches.map((item, index) => (
                                            <View key={index} style={styles.chip}>
                                                <Text style={styles.chipText}>{item}</Text>
                                                <TouchableOpacity onPress={() => removeRecent(item)}>
                                                    <Ionicons name="close" size={16} color="#A5B0C4" style={{ marginLeft: 4 }} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Search Results */}
                            {searchText.length > 0 && (
                                <View>
                                    {filteredData.map(item => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.resultItem}
                                            onPress={() => router.push({ pathname: '/EsimDetails', params: { ...item } })}
                                        >
                                            <View style={styles.resultIcon}>
                                                <Ionicons name="location-outline" size={22} color="#007AFF" />
                                            </View>
                                            <View style={styles.resultTextContainer}>
                                                <Text style={styles.resultTitle}>{item.name}</Text>
                                                <Text style={styles.resultDesc}>{item.region}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
                            {/* Hero Section */}
                            <View style={styles.heroContainer}>
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop' }}
                                    style={styles.heroImage}
                                />
                                <View style={styles.heroOverlay}>
                                    <Text style={styles.heroTitle}>Stay connected worldwide</Text>
                                    <Text style={styles.heroDesc}>Buy eSIMs for affordbale, reliable coverage around the world - choose from 200+ locations.</Text>
                                </View>
                            </View>

                            {/* Filters */}
                            <View style={styles.filterContainer}>
                                {FILTERS.map((filter) => (
                                    <TouchableOpacity
                                        key={filter}
                                        style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                                        onPress={() => setActiveFilter(filter)}
                                    >
                                        <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                                            {filter}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* List Header */}
                            <View style={styles.listHeader}>
                                <Text style={styles.listHeaderText}>
                                    {activeFilter === 'Popular' ? 'Explore our most popular eSIMs - packages start from the shown price.' :
                                        'Get local coverage where you need it - packages start from the shown price.'}
                                </Text>
                            </View>

                            {/* List */}
                            <View style={styles.listContainer}>
                                {filteredData.map(item => <View key={item.id} style={{ marginBottom: 10 }}>{renderItem({ item })}</View>)}
                            </View>

                            <View style={{ height: 40 }} />
                        </>
                    )}
                </ScrollView>
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
        marginBottom: 8,
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
    paddingH: {
        paddingHorizontal: 16,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C2533',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#2A3649',
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_400Regular',
    },
    content: {
        flex: 1,
    },
    heroContainer: {
        marginHorizontal: 16,
        height: 160,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        opacity: 0.7,
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)', // Subtle gradient replacement
    },
    heroTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Raleway_700Bold',
        marginBottom: 4,
    },
    heroDesc: {
        color: '#E0E0E0',
        fontSize: 12,
        fontFamily: 'Raleway_400Regular',
        lineHeight: 16,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 20,
        gap: 12,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1C2533',
        borderWidth: 1,
        borderColor: '#2A3649',
    },
    filterChipActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    filterText: {
        color: '#A5B0C4',
        fontSize: 14,
        fontFamily: 'Raleway_600SemiBold',
    },
    filterTextActive: {
        color: '#fff',
    },
    listHeader: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    listHeaderText: {
        color: '#A5B0C4',
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'Raleway_400Regular',
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#151A24', // Use darker card background from Wifi Map
        padding: 16,
        borderRadius: 12,
        marginBottom: 0, // Handled by container loop
        borderWidth: 1,
        borderColor: '#222B3A',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    countryName: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    priceBadge: {
        // Usually transparent text if just showing price, 
        // but updating to match design if they have a background style?
        // Image shows just text "$4.00" on the right.
    },
    priceText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_700Bold',
    },
    // Search Overlay Styles
    searchContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    recentTitle: {
        color: '#A5B0C4',
        fontSize: 14,
        fontFamily: 'Raleway_400Regular',
    },
    clearAllText: {
        color: '#007AFF',
        fontSize: 14,
        fontFamily: 'Raleway_600SemiBold',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C2533',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
    },
    chipText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Raleway_400Regular',
    },
    // Search Results
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2A3649',
    },
    resultIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,122,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    resultTextContainer: {
        flex: 1,
    },
    resultTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    resultDesc: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
        fontFamily: 'Raleway_400Regular',
    },
});
