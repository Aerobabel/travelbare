import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as topojson from 'topojson-client';
import CreateTripModal from '../../components/CreateTripModal';
import WorldMap from '../../components/Map';

const worldMap = require('../../components/countries2.json');
const STORAGE_KEY = '@visited_countries_v1';
const TRIPS_KEY = '@user_trips_v1';

const COUNTRY_ID_MAP = {
  '004': 'AF', '008': 'AL', '010': 'AQ', '012': 'DZ', '016': 'AS', '020': 'AD', '024': 'AO', '028': 'AG', '031': 'AZ', '032': 'AR',
  '036': 'AU', '040': 'AT', '044': 'BS', '048': 'BH', '050': 'BD', '051': 'AM', '052': 'BB', '056': 'BE', '060': 'BM', '064': 'BT',
  '068': 'BO', '070': 'BA', '072': 'BW', '074': 'BV', '076': 'BR', '084': 'BZ', '086': 'IO', '090': 'SB', '092': 'VG', '096': 'BN',
  '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY', '116': 'KH', '120': 'CM', '124': 'CA', '132': 'CV', '136': 'KY', '140': 'CF',
  '144': 'LK', '148': 'TD', '152': 'CL', '156': 'CN', '158': 'TW', '162': 'CX', '166': 'CC', '170': 'CO', '174': 'KM', '175': 'YT',
  '178': 'CG', '180': 'CD', '184': 'CK', '188': 'CR', '191': 'HR', '192': 'CU', '196': 'CY', '203': 'CZ', '204': 'BJ', '208': 'DK',
  '212': 'DM', '214': 'DO', '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET', '232': 'ER', '233': 'EE', '234': 'FO', '238': 'FK',
  '239': 'GS', '242': 'FJ', '246': 'FI', '248': 'AX', '250': 'FR', '254': 'GF', '258': 'PF', '260': 'TF', '262': 'DJ', '266': 'GA',
  '268': 'GE', '270': 'GM', '275': 'PS', '276': 'DE', '288': 'GH', '292': 'GI', '296': 'KI', '300': 'GR', '304': 'GL', '308': 'GD',
  '312': 'GP', '316': 'GU', '320': 'GT', '324': 'GN', '328': 'GY', '332': 'HT', '334': 'HM', '336': 'VA', '340': 'HN', '344': 'HK',
  '348': 'HU', '352': 'IS', '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE', '376': 'IL', '380': 'IT', '384': 'CI',
  '388': 'JM', '392': 'JP', '398': 'KZ', '400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR', '414': 'KW', '417': 'KG', '418': 'LA',
  '422': 'LB', '426': 'LS', '428': 'LV', '430': 'LR', '434': 'LY', '438': 'LI', '440': 'LT', '442': 'LU', '446': 'MO', '450': 'MG',
  '454': 'MW', '458': 'MY', '462': 'MV', '466': 'ML', '470': 'MT', '474': 'MQ', '478': 'MR', '480': 'MU', '484': 'MX', '492': 'MC',
  '496': 'MN', '498': 'MD', '499': 'ME', '500': 'MS', '504': 'MA', '508': 'MZ', '512': 'OM', '516': 'NA', '520': 'NR', '524': 'NP',
  '528': 'NL', '531': 'CW', '533': 'AW', '534': 'SX', '535': 'BQ', '540': 'NC', '548': 'VU', '554': 'NZ', '558': 'NI', '562': 'NE',
  '566': 'NG', '570': 'NU', '574': 'NF', '578': 'NO', '580': 'MP', '581': 'UM', '583': 'FM', '584': 'MH', '585': 'PW', '586': 'PK',
  '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE', '608': 'PH', '612': 'PN', '616': 'PL', '620': 'PT', '624': 'GW', '626': 'TL',
  '630': 'PR', '634': 'QA', '638': 'RE', '642': 'RO', '643': 'RU', '646': 'RW', '652': 'BL', '654': 'SH', '659': 'KN', '660': 'AI',
  '662': 'LC', '663': 'MF', '666': 'PM', '670': 'VC', '674': 'SM', '678': 'ST', '682': 'SA', '686': 'SN', '688': 'RS', '690': 'SC',
  '694': 'SL', '702': 'SG', '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO', '710': 'ZA', '716': 'ZW', '724': 'ES', '728': 'SS',
  '729': 'SD', '732': 'EH', '740': 'SR', '744': 'SJ', '748': 'SZ', '752': 'SE', '756': 'CH', '760': 'SY', '762': 'TJ', '764': 'TH',
  '768': 'TG', '772': 'TK', '776': 'TO', '780': 'TT', '784': 'AE', '788': 'TN', '792': 'TR', '795': 'TM', '796': 'TC', '798': 'TV',
  '800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB', '834': 'TZ', '840': 'US', '850': 'VI', '854': 'BF', '858': 'UY',
  '860': 'UZ', '862': 'VE', '876': 'WF', '882': 'WS', '887': 'YE', '894': 'ZM'
};

// Build list of selectable countries from topojson
const COUNTRIES = (() => {
  const fc = topojson.feature(worldMap, worldMap.objects.countries);
  const seen = new Set();
  return fc.features
    .map(f => {
      const id = String(f.id ?? '');
      const code = COUNTRY_ID_MAP[id] ?? null;
      const name = f.properties?.name ?? 'Unnamed';
      return code ? { code, name } : null;
    })
    .filter(Boolean)
    .filter(({ code }) => (seen.has(code) ? false : (seen.add(code), true)))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

const TABS = ['Active', 'Past', 'Progress']; // "Active" here means Upcoming basically

export default function MyTripsScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('Past');

  // visited state (persisted locally)
  const [visited, setVisited] = useState([]);
  const [loadingVisited, setLoadingVisited] = useState(false);
  const [savingVisited, setSavingVisited] = useState(false);

  // modal + search
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');

  const [allTrips, setAllTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const sheetHeight = Math.round(screenH * 0.55); // ~half screen

  const loadVisited = useCallback(async () => {
    setLoadingVisited(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      setVisited(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.warn('AsyncStorage read error', e);
      setVisited([]);
    } finally {
      setLoadingVisited(false);
    }
  }, []);

  const saveVisited = useCallback(async (next) => {
    setSavingVisited(true);
    try {
      const arr = Array.isArray(next) ? next : [];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      setVisited(arr);
    } catch (e) {
      console.warn('AsyncStorage write error', e);
    } finally {
      setSavingVisited(false);
    }
  }, []);

  // load once on mount
  useEffect(() => {
    loadVisited();
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoadingTrips(true);
      const raw = await AsyncStorage.getItem(TRIPS_KEY);
      // seed dummy if empty for demo
      const initial = raw ? JSON.parse(raw) : [
        { id: '1', city: 'Barcelona', period: '14.04.2025 – 21.04.2025', hotel: { name: 'Blue Radisson Barcelona', desc: 'A balanced mix of iconic sights, beaches, and authentic local experiences', image: null }, startDate: '2025-04-14' },
        { id: '2', city: 'Paris', period: '02.03.2023 – 09.03.2023', hotel: { name: 'Hilton DoubleTree Paris', desc: 'A balanced mix of iconic sights, beaches, and authentic local experiences', image: null }, startDate: '2023-03-02' },
      ];
      setAllTrips(initial);
    } catch {
      // ignore
    } finally {
      setLoadingTrips(false);
    }
  };

  const saveNewTrip = async (trip) => {
    const next = [trip, ...allTrips];
    setAllTrips(next);
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(next));
  };

  // search filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const toggleCountry = (code) => {
    setVisited(prev => (prev.includes(code)
      ? prev.filter(c => c !== code)
      : [...prev, code]));
  };

  const renderTab = (label) => {
    const active = selectedTab === label;
    return (
      <TouchableOpacity
        key={label}
        onPress={() => setSelectedTab(label)}
        style={[styles.tabButton, active && styles.activeTab]}>
        <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Image source={require('@/assets/images/empty.png')} style={styles.emptyImage} resizeMode="contain" />
      <Text style={styles.emptyWhere}>Where to next?</Text>
      <Text style={styles.emptyText}>You don't have any {selectedTab.toLowerCase()} trips yet.</Text>
      <Text style={styles.emptyText}>When you make a booking it will appear here.</Text>
    </View>
  );

  const getCategorizedTrips = () => {
    const now = new Date().toISOString().split('T')[0];
    const past = allTrips.filter(t => t.startDate && t.startDate < now);
    const upcoming = allTrips.filter(t => !t.startDate || t.startDate >= now);
    // Sort
    past.sort((a, b) => b.startDate.localeCompare(a.startDate)); // descending
    upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate)); // ascending
    return { past, upcoming };
  };

  const { past, upcoming } = getCategorizedTrips();

  const PastTripItem = ({ item }) => (
    <View style={styles.tripBlock}>
      <Text style={styles.cityHeading}>{item.city}</Text>
      <Text style={styles.periodText}>{item.period}</Text>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {item.hotel?.image ? (
            <Image source={{ uri: item.hotel.image }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}><Text style={styles.thumbEmoji}>🏨</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.hotelName} numberOfLines={1}>{item.hotel?.name}</Text>
            <Text style={styles.hotelDesc} numberOfLines={2}>{item.hotel?.desc}</Text>
          </View>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.cta, styles.ctaGhost]} onPress={() => router.push({ pathname: '/ChatScreen', params: { tripData: JSON.stringify(item) } })}>
            <Text style={[styles.ctaText, styles.ctaGhostText]}>Chat with AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cta, styles.ctaPrimary]} onPress={() => { }}>
            <Text style={[styles.ctaText, styles.ctaPrimaryText]}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTripsList = (data) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tripList}
      renderItem={({ item }) => <PastTripItem item={item} />}
      showsVerticalScrollIndicator={false}
    />
  );

  const totalCountries = COUNTRIES.length;
  const visitedCount = visited.length;
  const percent = totalCountries ? Math.round((visitedCount / totalCountries) * 100) : 0;

  // Calculate unique cities from past trips
  const uniqueCitiesCount = useMemo(() => {
    const citySet = new Set();
    past.forEach(t => {
      if (t.city) citySet.add(t.city.trim());
    });
    return citySet.size;
  }, [past]);

  const renderProgressWithMap = () => (
    <View style={{ flex: 1 }}>
      {loadingVisited ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <WorldMap visitedCountries={visited} />
      )}

      <View style={styles.statsCard}>
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>{percent}%</Text>
          <Text style={styles.statsLabel}>World</Text>
        </View>
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>{visitedCount}</Text>
          <Text style={styles.statsLabel}>Countries</Text>
        </View>
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>{uniqueCitiesCount}</Text>
          <Text style={styles.statsLabel}>Cities</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>My Trips</Text>
        {selectedTab === 'Progress' && (
          <TouchableOpacity onPress={() => setPickerOpen(true)} style={styles.editBtn}>
            <Text style={styles.editIcon}>✎</Text>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
        {selectedTab !== 'Progress' && (
          <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.addBtn}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsRow}>{TABS.map(renderTab)}</View>

      <View style={styles.contentContainer}>
        {selectedTab === 'Progress'
          ? renderProgressWithMap()
          : selectedTab === 'Past'
            ? (past.length ? renderTripsList(past) : renderEmpty())
            : (upcoming.length ? renderTripsList(upcoming) : renderEmpty())}
      </View>

      <CreateTripModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={saveNewTrip}
      />

      {/* Country picker modal */}
      <Modal transparent visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { height: sheetHeight }]}>
            <SheetContent
              insets={insets}
              query={query}
              setQuery={setQuery}
              filtered={filtered}
              visited={visited}
              toggleCountry={toggleCountry}
              savingVisited={savingVisited}
              onSave={async () => { await saveVisited(visited); setPickerOpen(false); }}
              onClose={() => setPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Extracted content for the half-sheet. Footer (Save) does NOT move with keyboard. */
function SheetContent({
  insets,
  query,
  setQuery,
  filtered,
  visited,
  toggleCountry,
  savingVisited,
  onSave,
  onClose,
}) {
  return (
    <>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Edit visited countries</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput
          placeholder="Search country"
          placeholderTextColor="#667085"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          returnKeyType="search"
          autoFocus
        />
      </View>

      {/* Suggestions list stays high; iOS only avoids keyboard for the list, not footer */}
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={styles.suggestionsBox}>
          <SuggestionsList filtered={filtered} visited={visited} toggleCountry={toggleCountry} />
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.suggestionsBox}>
          <SuggestionsList filtered={filtered} visited={visited} toggleCountry={toggleCountry} />
        </View>
      )}

      {/* Footer pinned */}
      <View style={[styles.footerWrap, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          disabled={savingVisited}
          onPress={onSave}
          style={[styles.saveBtn, savingVisited && { opacity: 0.6 }]}
        >
          <Text style={styles.saveText}>{savingVisited ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function SuggestionsList({ filtered, visited, toggleCountry }) {
  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.code}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => {
        const checked = visited.includes(item.code);
        return (
          <TouchableOpacity onPress={() => toggleCountry(item.code)} style={styles.row}>
            <Text style={styles.countryName}>{item.name}</Text>
            <Text style={[styles.check, checked && styles.checkOn]}>{checked ? '●' : '○'}</Text>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={{ paddingBottom: 96 }}
      showsVerticalScrollIndicator
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C' },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 12, gap: 12 },
  title: { color: '#fdfbfbff', fontSize: 20, textAlign: 'center', fontFamily: 'Raleway_400Regular' },
  editBtn: {
    position: 'absolute', right: 12, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#121820', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderColor: '#1C1F2A', borderWidth: 1, gap: 6,
  },
  editIcon: { color: '#9BA4B4', fontSize: 14 },
  editText: { color: '#E6EDF3', fontSize: 14, fontFamily: 'Raleway_400Regular' },

  addBtn: {
    position: 'absolute', right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#3E6FFF',
    alignItems: 'center', justifyContent: 'center'
  },
  addIcon: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: -2 },

  tabsRow: {
    flexDirection: 'row', backgroundColor: '#121820', borderRadius: 20, marginHorizontal: 12, padding: 6, borderWidth: 1, borderColor: '#1C1F2A',
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 15, color: '#888', fontFamily: 'Raleway_400Regular' },
  activeTab: { backgroundColor: '#0E141C' },
  activeTabText: { color: 'white', fontFamily: 'Raleway_400Bold' },

  contentContainer: { flex: 1, padding: 16 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 90 },
  emptyImage: { width: 200, height: 200, marginBottom: 16 },
  emptyWhere: { fontSize: 30, color: 'white', marginBottom: 10, fontFamily: 'Raleway_400Regular' },
  emptyText: { fontSize: 16, color: '#999', fontFamily: 'Raleway_400Regular' },

  tripList: { paddingBottom: 40 },
  tripBlock: { marginBottom: 22 },
  cityHeading: { color: 'white', fontSize: 22, fontWeight: '600', marginBottom: 4, fontFamily: 'Raleway_400Regular' },
  periodText: { color: '#9BA4B4', fontSize: 14, marginBottom: 10, fontFamily: 'Raleway_400Regular' },

  card: {
    backgroundColor: '#121826', borderRadius: 22, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  thumb: { width: 58, height: 58, borderRadius: 12 },
  thumbPlaceholder: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#2A3340', alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 22 },
  hotelName: { color: '#E6EDF3', fontSize: 16, fontFamily: 'Raleway_400Bold' },
  hotelDesc: { color: '#9BA4B4', fontSize: 12, marginTop: 4, fontFamily: 'Raleway_400Regular' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cta: { flex: 1, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '600' },
  ctaGhost: { backgroundColor: '#1C222C' },
  ctaGhostText: { color: 'white' },
  ctaPrimary: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  ctaPrimaryText: { color: '#0C111A' },

  statsCard: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    backgroundColor: 'rgba(18, 24, 32, 0.78)', borderRadius: 20, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14,
  },
  statsItem: { alignItems: 'center' },
  statsValue: { color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'Raleway_400Regular' },
  statsLabel: { color: '#aaa', fontSize: 13, marginTop: 4, fontFamily: 'Raleway_400Regular' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0E141C',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: 'white', fontSize: 18, fontFamily: 'Raleway_400Bold' },
  closeText: { color: '#9BA4B4', fontSize: 16 },

  searchInput: {
    height: 42, borderRadius: 10, paddingHorizontal: 12,
    backgroundColor: '#121820', color: 'white', borderWidth: 1, borderColor: '#1C1F2A',
  },

  suggestionsBox: {
    flex: 1,
    paddingTop: 4,
  },

  sep: { height: 1, backgroundColor: '#1C1F2A', marginHorizontal: 16 },
  row: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryName: { color: 'white', fontSize: 16 },
  check: { fontSize: 18, color: '#667085' },
  checkOn: { color: '#4F8EF7' },

  footerWrap: { paddingHorizontal: 16 },
  saveBtn: {
    borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  saveText: { color: '#0C111A', fontSize: 16, fontWeight: '700' },
});
