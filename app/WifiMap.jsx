import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Dark map style matching the design
const darkMapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#212121" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#212121" }]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "administrative.country",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "poi",
        "stylers": [{ "visibility": "off" }] // Hide default POIs
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#2c2c2c" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#8a8a8a" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#000000" }]
    }
];

// Mock Data
const WIFI_SPOTS = [
    { id: '1', name: 'The Camus cafe', address: 'Lenina street, 68', distance: '450m', type: 'Free', lat: 55.7558, lng: 37.6173 },
    { id: '2', name: 'White market', address: '1st Institute lane, 38', distance: '900m', type: 'Edu', lat: 55.7522, lng: 37.6200 },
    { id: '3', name: 'Kafe Sukhumi', address: 'Zarechye', distance: '1.2km', type: 'Free', lat: 55.7580, lng: 37.6250 },
    { id: '4', name: 'Holy Trinity Church', address: 'Zarechye', distance: '1.5km', type: 'Free', lat: 55.7540, lng: 37.6100 },
    { id: '5', name: 'Circus', address: 'Chelyabinsk', distance: '2.0km', type: 'Public', lat: 55.7600, lng: 37.6300 },
];

export default function WifiMap() {
    const router = useRouter();
    const mapRef = useRef(null);
    const [selectedSpot, setSelectedSpot] = useState(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Recent Searches Mock
    const [recentSearches, setRecentSearches] = useState([
        'Berlin', 'Milan', 'Manchester City', 'Seychelles', 'Cape Town', 'Barcelona'
    ]);

    // Search Results Mock
    const allCities = [
        { name: 'Budapest', desc: 'City in Hungary' },
        { name: 'Buenos Aires', desc: 'City in Argentina' },
        { name: 'Bucharest', desc: 'City in Romania' },
        { name: 'Buraydah', desc: 'City in Saudi Arabia' },
        { name: 'Bursa', desc: 'City in Turkey' },
        { name: 'Bulgaria', desc: '' }
    ];

    const searchResults = searchText.length > 0
        ? allCities.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()))
        : [];

    // Initial Region (Moscow area mock)
    const initialRegion = {
        latitude: 55.7558,
        longitude: 37.6173,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    const handleMarkerPress = (spot) => {
        if (searchFocused) return; // Disable when searching
        setSelectedSpot(spot);
    };

    const handleListPress = (spot) => {
        setSelectedSpot(spot);
        mapRef.current?.animateToRegion({
            latitude: spot.lat,
            longitude: spot.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        }, 500);
    };

    const clearAllRecents = () => setRecentSearches([]);
    const removeRecent = (item) => setRecentSearches(prev => prev.filter(i => i !== item));

    const WifiItem = ({ item }) => (
        <TouchableOpacity style={styles.listItem} onPress={() => handleListPress(item)}>
            <View style={styles.iconContainer}>
                <MaterialIcons name="wifi" size={24} color="#007AFF" />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemAddress}>{item.address}</Text>
                <Text style={styles.itemMeta}>{item.type === 'Free' ? 'INTERSVYAZ_FREE' : 'SUSU_EDU'}</Text>
            </View>
            <View style={styles.itemRight}>
                <Ionicons name="location-sharp" size={14} color="#666" />
                <Text style={styles.itemDistance}>{item.distance}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Map Background */}
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={darkMapStyle}
                initialRegion={initialRegion}
                provider={PROVIDER_DEFAULT}
            >
                {WIFI_SPOTS.map((spot) => (
                    <Marker
                        key={spot.id}
                        coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                        onPress={() => handleMarkerPress(spot)}
                    >
                        <View style={[styles.marker, selectedSpot?.id === spot.id && styles.selectedMarker]}>
                            <View style={styles.markerInner} />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Top Overlay / Search Area */}
            {/* Using absolute positioning to cover everything when focused */}
            <SafeAreaView style={[styles.topContainer, searchFocused && styles.fullScreenOverlay]} edges={['top']}>
                <View style={styles.headerRow}>
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
                        {searchFocused && <Text style={styles.headerTitle}></Text>}
                    </TouchableOpacity>
                    {/* Title only when not searching or maybe custom title? Designing per image */}
                    {!searchFocused && <Text style={styles.headerTitle}>Wifi Map</Text>}
                    {/* Placeholder for center alignment if not searching */}
                    {!searchFocused && <View style={{ width: 40 }} />}
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Where are you going?"
                        placeholderTextColor="#666"
                        value={searchText}
                        onChangeText={setSearchText}
                        onFocus={() => setSearchFocused(true)}
                        // onBlur is handled carefully to not close when clicking results
                        autoFocus={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={18} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search Overlay Content */}
                {searchFocused && (
                    <View style={styles.searchContent}>
                        {/* Recent Searches State */}
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

                        {/* Search Results State */}
                        {searchText.length > 0 && (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.name}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.resultItem}>
                                        <View style={styles.resultIcon}>
                                            <Ionicons name="location-outline" size={22} color="#007AFF" />
                                        </View>
                                        <View style={styles.resultTextContainer}>
                                            <Text style={styles.resultTitle}>{item.name}</Text>
                                            {item.desc ? <Text style={styles.resultDesc}>{item.desc}</Text> : null}
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                )}
            </SafeAreaView>

            {/* Bottom List Sheet (Collapsed State or List) - Hide when searching */}
            {!selectedSpot && !searchFocused && (
                <View style={styles.bottomSheet}>
                    <View style={styles.handle} />
                    <Text style={styles.sheetTitle}>65 Wifi nearby</Text>
                    <FlatList
                        data={WIFI_SPOTS}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <WifiItem item={item} />}
                        style={styles.list}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </View>
            )}

            {/* Selected Spot Details Overlay */}
            {selectedSpot && !searchFocused && (
                <View style={styles.detailsCard}>
                    {/* Header Controls (Close/Share) - Positioning relative to card or absolute? 
                        Image shows them on top of the map background actually. 
                        But we are just overlaying the card. Let's put a close button on the card or rely on the map's UI?
                        The user image shows top bar with back arrow. 
                        Let's keep our existing back/search bar and just overlay this card at the bottom.
                    */}
                    <View style={styles.detailsDragHandleCenter} />

                    <View style={styles.detailsHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailsTitle}>{selectedSpot.name}</Text>
                            <View style={styles.tagRow}>
                                <View style={styles.tagIconCircle}>
                                    <MaterialIcons name="restaurant" size={12} color="#fff" />
                                </View>
                                <Text style={styles.tagTextMain}>Food & Drinks</Text>
                            </View>
                            <View style={styles.distanceRow}>
                                <MaterialIcons name="directions-walk" size={14} color="#A5B0C4" />
                                <Text style={styles.detailsMeta}> 7 min • {selectedSpot.distance}</Text>
                            </View>
                        </View>
                        {/* Close Button specific to details */}
                        <TouchableOpacity onPress={() => setSelectedSpot(null)} style={styles.closeDetailsButton}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.connectButton}>
                        <MaterialIcons name="directions-walk" size={20} color="#fff" />
                        <Text style={styles.connectButtonText}>Walk to connect</Text>
                    </TouchableOpacity>

                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Wifi Details</Text>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="wifi" size={18} color="#007AFF" />
                            <Text style={styles.infoValue}>INTERSVYAZ_FREE</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <MaterialIcons name="lock-outline" size={18} color="#007AFF" />
                            <Text style={styles.infoValue}>12345678</Text>
                        </View>
                    </View>

                    <View style={styles.moreInfoSection}>
                        <Text style={styles.infoLabel}>More info</Text>
                        <View style={styles.moreInfoRow}>
                            <Text style={styles.moreInfoLabel}>Last signal</Text>
                            <Text style={styles.moreInfoValue}>2 weeks ago</Text>
                        </View>
                        <View style={styles.moreInfoRow}>
                            <Text style={styles.moreInfoLabel}>Last connection</Text>
                            <Text style={styles.moreInfoValue}>2 weeks ago</Text>
                        </View>
                        <View style={styles.moreInfoRow}>
                            <Text style={styles.moreInfoLabel}>Connections</Text>
                            <Text style={styles.moreInfoValue}>225</Text>
                        </View>
                    </View>

                    {/* Mini Map */}
                    <View style={styles.miniMapContainer}>
                        <MapView
                            style={styles.miniMap}
                            initialRegion={{
                                latitude: selectedSpot.lat,
                                longitude: selectedSpot.lng,
                                latitudeDelta: 0.002,
                                longitudeDelta: 0.002,
                            }}
                            liteMode={true} // Use Lite Mode for performance
                            customMapStyle={darkMapStyle}
                        >
                            <Marker coordinate={{ latitude: selectedSpot.lat, longitude: selectedSpot.lng }}>
                                <View style={styles.miniMapMarker}>
                                    <View style={styles.miniMapMarkerInner} />
                                </View>
                            </Marker>
                        </MapView>
                        {/* Overlay Content on Mini Map */}
                        <View style={styles.miniMapOverlay}>
                            <TouchableOpacity style={styles.getRouteAction}>
                                <Ionicons name="navigate-outline" size={16} color="#007AFF" />
                                <Text style={styles.getRouteText}>Get route</Text>
                            </TouchableOpacity>
                            <View style={styles.miniMapAddressRow}>
                                <Ionicons name="location-outline" size={16} color="#fff" />
                                <Text style={styles.miniMapAddressText}>{selectedSpot.address}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0E141C',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    topContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0E141C', // Added background color
        paddingHorizontal: 16,
        paddingBottom: 24, // Increased padding for better spacing
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    fullScreenOverlay: {
        backgroundColor: '#0E141C',
        bottom: 0,
        height: '100%',
        zIndex: 100, // Be on top of map
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        height: 44,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Raleway_600SemiBold',
        color: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
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

    // Custom Marker
    marker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,122,255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedMarker: {
        backgroundColor: 'rgba(255,255,255, 0.4)',
        transform: [{ scale: 1.2 }],
    },
    markerInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
        borderWidth: 2,
        borderColor: '#fff',
    },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        backgroundColor: '#151A24',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        paddingTop: 8,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#2C3545',
        alignSelf: 'center',
        borderRadius: 2,
        marginBottom: 12,
    },
    sheetTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
        marginBottom: 12,
    },
    list: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C222F',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,122,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    itemAddress: {
        color: '#A5B0C4',
        fontSize: 12,
        marginVertical: 2,
        fontFamily: 'Raleway_400Regular',
    },
    itemMeta: {
        color: '#666',
        fontSize: 11,
        fontFamily: 'Raleway_400Regular',
    },
    itemRight: {
        alignItems: 'flex-end',
    },
    itemDistance: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
        fontFamily: 'Raleway_400Regular',
    },

    // Details Card
    detailsCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#151A24',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '85%', // Allow it to be tall
    },
    detailsDragHandleCenter: {
        width: 40,
        height: 4,
        backgroundColor: '#2C3545',
        alignSelf: 'center',
        borderRadius: 2,
        marginBottom: 20,
    },
    detailsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    closeDetailsButton: {
        padding: 4,
        backgroundColor: '#2A3649',
        borderRadius: 20,
    },
    detailsTitle: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Raleway_700Bold',
        marginBottom: 8,
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tagIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#007AFF', // Blue circle
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    tagTextMain: {
        color: '#A5B0C4',
        fontSize: 14,
        fontFamily: 'Raleway_400Regular',
    },
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailsMeta: {
        color: '#A5B0C4',
        fontSize: 14,
        fontFamily: 'Raleway_400Regular',
    },
    connectButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 24,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
        marginLeft: 8,
    },
    infoSection: {
        backgroundColor: '#1C222F',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    infoLabel: {
        color: '#fff', // White header for sections
        fontSize: 16,
        marginBottom: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#2A3649',
        marginVertical: 12,
        marginLeft: 30, // Indent to align with text
    },
    infoValue: {
        color: '#A5B0C4',
        fontSize: 15,
        marginLeft: 12,
        fontFamily: 'Raleway_400Regular',
    },

    // More Info
    moreInfoSection: {
        marginBottom: 24,
    },
    moreInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    moreInfoLabel: {
        color: '#A5B0C4',
        fontSize: 14,
        fontFamily: 'Raleway_400Regular',
    },
    moreInfoValue: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Raleway_400Regular',
        textAlign: 'right',
    },

    // Mini Map
    miniMapContainer: {
        height: 140,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    miniMap: {
        width: '100%',
        height: '100%',
    },
    miniMapMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(0,122,255, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniMapMarkerInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        borderWidth: 1,
        borderColor: '#fff',
    },
    miniMapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        // Gradient or background to make text readable? 
        // Image shows it's just on top of map, maybe map is dark enough
    },
    getRouteAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    getRouteText: {
        color: '#007AFF',
        fontSize: 14,
        marginLeft: 6,
        fontFamily: 'Raleway_600SemiBold',
    },
    miniMapAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniMapAddressText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 6,
        fontFamily: 'Raleway_400Regular',
    },

    // Search Overlay Styles
    searchContent: {
        flex: 1,
        marginTop: 20,
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
