// app/(tabs)/Services.jsx
import { useRouter } from 'expo-router';
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const services = [
  { id: '1', title: 'Air Tickets', desc: 'Book flights worldwide with best deals', icon: '✈️' },
  { id: '2', title: 'Hotels', desc: 'Find perfect accommodations for stay', icon: '🏨' },
  { id: '3', title: 'Car Rentals', desc: 'Get wheels for your journey', icon: '🚗', comingSoon: true },
  { id: '4', title: 'Insurance', desc: 'Travel safely with comprehensive coverage', icon: '📄', comingSoon: true },
  { id: '5', title: 'Train Tickets', desc: 'Book train transportation between cities', icon: '🚆', comingSoon: true },
  { id: '6', title: 'Bus Tickets', desc: 'Book bus transportation between cities', icon: '🚌', comingSoon: true },
  { id: '7', title: 'Cruises', desc: 'Explore destinations by luxury ships', icon: '🛳️', comingSoon: true },
  { id: '8', title: 'Tours & Activities', desc: 'Discover unique experiences and adventures', icon: '🌋', comingSoon: true },
  { id: '9', title: 'eSIM', desc: 'Stay connected wherever you go', icon: '📱' },
  { id: '10', title: 'Transfers', desc: 'Seamless airport to hotel transportation', icon: '🚕' },
  { id: '11', title: 'Visa Assistance', desc: 'Simplifying travel document requirements', icon: '🛂', comingSoon: true },
  { id: '12', title: 'Wi-Fi Map', desc: 'Find free internet spots everywhere', icon: '📡', comingSoon: true },
];

const numColumns = 2;
const GUTTER = 12;
const CARD_WIDTH =
  (Dimensions.get('window').width - GUTTER * (numColumns + 1)) / numColumns;

// Reserve space on the right for the big icon so text never overlaps.
const ICON_GUTTER = Platform.OS === 'android' ? 72 : 88; // Smaller gutter on Android for more text space
const ICON_SIZE = Platform.OS === 'android' ? 48 : 56; // Smaller icons on Android

export default function Services() {
  const router = useRouter();

  const onPressService = (item) => {
    if (item.comingSoon) return;
    if (item.id === '1') router.push('/FlightSearch');
    if (item.id === '2') router.push('/HotelSearchFlow');
    if (item.id === '3') router.push('/carRentals');
    if (item.id === '5') router.push('/TrainSearch');
    if (item.id === '6') router.push('/BusSearch');
    if (item.id === '7') router.push('/CruisesSearch');
    if (item.id === '8') router.push('/ToursAndActivities');
    if (item.id === '9') router.push('/EsimSearch');
    if (item.id === '10') router.push('/TransfersSearch');
    if (item.id === '12') router.push('/WifiMap');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, item.comingSoon && styles.cardDisabled]}
      activeOpacity={item.comingSoon ? 1 : 0.85}
      onPress={() => onPressService(item)}
    >
      {/* Text block with right padding = icon gutter */}
      <View style={styles.textWrap}>
        <Text style={[styles.heading, item.comingSoon && styles.textDisabled]}>{item.title}</Text>
        <Text style={styles.desc}>{item.desc}</Text>
        {item.comingSoon && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Coming Soon</Text>
          </View>
        )}
      </View>

      {/* Big icon anchored bottom-right */}
      <Text style={[styles.icon, item.comingSoon && styles.iconDisabled]}>{item.icon}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Services</Text>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        bounces={true} // Enable bounce on iOS (default, but explicit)
        style={styles.flatList} // flex:1
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E141C',
  },

  // top header bar
  topBar: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2831421a',
    backgroundColor: '#1218260a',
  },
  topBarText: {
    color: '#E9EEF8',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Raleway_400Regular',
  },

  list: {
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 80 : 16, // Extra bottom padding on Android
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: GUTTER,
  },

  flatList: {
    flex: 1,
    ...(Platform.OS === 'android' ? { overScrollMode: 'always' } : {}), // Enable over-scroll glow on Android
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: '#151A24',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0,
    borderColor: '#222B3A',
    overflow: 'hidden',
    minHeight: 118,
  },

  // wrap gives the left text column and reserves right space for icon
  textWrap: {
    paddingRight: ICON_GUTTER,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 15 : 15, // Smaller heading size on Android only
    lineHeight: Platform.OS === 'android' ? 17 : 18, // Adjust line height accordingly
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: 'Raleway_400Bold',
    includeFontPadding: false, // Android: removes extra line gap
    textAlign: 'left',
    flexShrink: 1,
    ...(Platform.OS === 'android' ? {
      flexWrap: 'nowrap', // Prevent wrapping on Android headings
      numberOfLines: 1, // Limit to one line
      ellipsizeMode: 'tail', // Add ellipsis if too long
      androidHyphenationFrequency: 'none',
      textBreakStrategy: 'simple',
    } : {
      flexWrap: 'wrap',
    }),
  },
  desc: {
    color: '#A5B0C4',
    fontSize: Platform.OS === 'android' ? 11 : 12, // Smaller font size on Android only
    lineHeight: Platform.OS === 'android' ? 15 : 16, // Adjust line height accordingly
    fontFamily: 'Raleway_400Regular',
    includeFontPadding: false, // Android fix
    textAlign: 'left',
    flexShrink: 1,
    flexWrap: 'wrap',
    ...(Platform.OS === 'android' ? {
      androidHyphenationFrequency: 'none',
      textBreakStrategy: 'simple',
    } : {}),
  },

  icon: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    fontSize: ICON_SIZE,
    opacity: 0.95,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#12161E',
  },
  textDisabled: {
    color: '#6B7280',
  },
  iconDisabled: {
    opacity: 0.3,
  },
  badge: {
    marginTop: 8,
    backgroundColor: '#1E2A3A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});