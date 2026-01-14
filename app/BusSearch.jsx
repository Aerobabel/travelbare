// app/BusSearch.jsx
// Bus Tickets — same design + functionality as TrainSearch, adapted for buses.
// Requires: expo, expo-router, react-native-calendars

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  //SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------- theme / const ----------
const { width, height } = Dimensions.get('window');
const DATE_TABS = ['Dates', 'Months', 'Flexible'];
const ACCENT = '#2F6BFF';
const TEXT = '#E9EEF8';
const SUBTLE = '#8A93A0';
const BORDER = '#283142';
const CARD_BG = '#121826';

const INITIAL_FILTERS = {
  onboard: 'Standard',
  time: [0, 24],
  duration: [0, 48],
  transfers: { direct: false, one: false, two: false, three: false },
  stops: [0, 24],
  price: [0, 10000],
  overnight: false,
};

// Suggestions for city/stop search
const STOPS = [
  { name: 'Paris', code: 'PAR', country: 'France' },
  { name: 'London', code: 'LON', country: 'United Kingdom' },
  { name: 'Amsterdam', code: 'AMS', country: 'Netherlands' },
  { name: 'Brussels', code: 'BRU', country: 'Belgium' },
  { name: 'Berlin', code: 'BER', country: 'Germany' },
  { name: 'Munich', code: 'MUC', country: 'Germany' },
  { name: 'Milan', code: 'MIL', country: 'Italy' },
  { name: 'Rome', code: 'ROM', country: 'Italy' },
  { name: 'Zurich', code: 'ZRH', country: 'Switzerland' },
  { name: 'Vienna', code: 'VIE', country: 'Austria' },
];

// ---------- utils ----------
const toTime = (h) => {
  const total = Math.round(Number(h) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hh)}:${pad(mm)}`;
};

// ---------- RangeSlider (unchanged) ----------
function RangeSlider({ min, max, step = 1, values, onChange }) {
  const [trackW, setTrackW] = useState(0);
  const [active, setActive] = useState(null);
  const [lo, hi] = values;

  const clamp = (v) => Math.min(max, Math.max(min, v));
  const snap = (v) => Math.round(v / step) * step;
  const posFromVal = (v) => ((clamp(v) - min) / (max - min)) * trackW;
  const valFromPos = (x) => clamp(min + ((max - min) * x) / Math.max(1, trackW));

  const lowPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setActive('low'),
        onPanResponderMove: (_, g) => {
          const raw = valFromPos(posFromVal(lo) + g.dx);
          const nlo = Math.min(snap(raw), hi - step);
          onChange([nlo, hi]);
        },
        onPanResponderRelease: () => setActive(null),
      }),
    [trackW, lo, hi]
  );

  const highPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setActive('high'),
        onPanResponderMove: (_, g) => {
          const raw = valFromPos(posFromVal(hi) + g.dx);
          const nhi = Math.max(snap(raw), lo + step);
          onChange([lo, nhi]);
        },
        onPanResponderRelease: () => setActive(null),
      }),
    [trackW, lo, hi]
  );

  const onTrackPress = (e) => {
    const x = e.nativeEvent.locationX;
    const target = valFromPos(x);
    const dLo = Math.abs(target - lo);
    const dHi = Math.abs(target - hi);
    if (dLo <= dHi) {
      onChange([snap(Math.min(target, hi - step)), hi]);
      setActive('low');
    } else {
      onChange([lo, snap(Math.max(target, lo + step))]);
      setActive('high');
    }
    setTimeout(() => setActive(null), 100);
  };

  return (
    <View
      style={styles.rsWrap}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderStart={onTrackPress}
    >
      <View style={styles.rsTrack} />
      <View
        style={[
          styles.rsRange,
          { left: trackW ? posFromVal(lo) : 0, right: trackW ? trackW - posFromVal(hi) : 0 },
        ]}
      />
      <View
        style={[
          styles.rsThumb,
          { left: trackW ? posFromVal(lo) - 12 : 0 },
          active === 'low' && styles.rsThumbActive,
        ]}
        {...lowPan.panHandlers}
      />
      <View
        style={[
          styles.rsThumb,
          { left: trackW ? posFromVal(hi) - 12 : 0 },
          active === 'high' && styles.rsThumbActive,
        ]}
        {...highPan.panHandlers}
      />
    </View>
  );
}

// ---------- Destination Search Modal (same UX) ----------
function DestinationModal({ open, onClose, onPick, initialQuery = '', recent, onClearRecent }) {
  const [query, setQuery] = useState(initialQuery);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return STOPS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 12 }}>
            <Text style={{ color: TEXT, fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, height: 42, justifyContent: 'center' }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="City or stop"
              placeholderTextColor={SUBTLE}
              autoFocus
              style={{ color: TEXT }}
            />
          </View>
        </View>

        {!query ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700' }}>Recent Searches</Text>
              {recent.length ? (
                <TouchableOpacity onPress={onClearRecent}>
                  <Text style={{ color: ACCENT }}>Clear All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
              {recent.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => onPick(r)}
                  style={{ backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}
                >
                  <Text style={{ color: TEXT, fontWeight: '600' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {list.map((s) => (
              <TouchableOpacity
                key={s.code}
                onPress={() => onPick(s.name)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              >
                <Text style={{ fontSize: 18, marginRight: 12 }}>🚌</Text>
                <View>
                  <Text style={{ color: TEXT, fontSize: 16, fontWeight: '600' }}>
                    {s.name} <Text style={{ color: SUBTLE }}>({s.code})</Text>
                  </Text>
                  <Text style={{ color: SUBTLE }}>{s.country}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------- ResultsContent (adapted to buses) ----------
function ResultsContent({ offers, onBack, onOpenDetails, onOpenPriceChart, titleText }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' }}>{titleText}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 6, gap: 8 }}>
        <TouchableOpacity style={styles.resChip}>
          <Ionicons name="funnel-outline" size={14} color={TEXT} />
          <Text style={styles.resChipText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resChip}>
          <Ionicons name="swap-vertical" size={14} color={TEXT} />
          <Text style={styles.resChipText}>Sort by</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resChip}>
          <Ionicons name="people" size={14} color={TEXT} />
          <Text style={styles.resChipText}>Passengers</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {offers.map((o) => (
          <TouchableOpacity
            key={o.id}
            activeOpacity={0.9}
            onPress={() => onOpenDetails(o)}
            style={styles.resCard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.resTime}>{o.depart}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resAirline}>{o.operator}</Text>
                <Text style={styles.resMeta}>{o.duration} · {o.transfers}</Text>
              </View>
              <Text style={styles.resTime}>{o.arrive}</Text>
            </View>

            <View style={styles.resRoute}>
              <Text style={styles.resApt}>{o.stopFrom}</Text>
              <View style={styles.resDivider} />
              <Text style={styles.resApt}>{o.stopTo}</Text>
            </View>

            <View style={styles.resFooter}>
              <TouchableOpacity onPress={onOpenPriceChart}>
                <Text style={styles.resPrice}>from ${o.price}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buyBtn}>
                <Text style={styles.buyBtnText}>Buy ticket</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.priceChartBtn} onPress={onOpenPriceChart}>
          <Ionicons name="stats-chart" size={16} color={TEXT} />
          <Text style={{ color: TEXT, fontWeight: '700' }}>Price chart</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Main ----------
export default function BusSearch() {
  const router = useRouter();

  // core state
  const [from, setFrom] = useState('Paris');
  const [to, setTo] = useState('Amsterdam');
  const [departDate, setDepartDate] = useState(null);
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });

  // recents + modal
  const [recent, setRecent] = useState(['London', 'Berlin', 'Milan', 'Rome']);
  const [destModal, setDestModal] = useState({ open: false, which: 'from', init: '' });

  // filters + overlays
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [extraToggles, setExtraToggles] = useState({ breg: false, visa: false });
  const [showCal, setShowCal] = useState(false);
  const [activeCalTab, setActiveCalTab] = useState('Dates');
  const [showPax, setShowPax] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [resultsVisible, setResultsVisible] = useState(false);
  const [priceChartVisible, setPriceChartVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // calendar theme
  const calTheme = {
    backgroundColor: '#0E141C',
    calendarBackground: '#0E141C',
    textSectionTitleColor: SUBTLE,
    selectedDayBackgroundColor: ACCENT,
    selectedDayTextColor: '#fff',
    todayTextColor: '#FF5A5F',
    dayTextColor: '#E9EEF8',
    textDisabledColor: '#4A5463',
    arrowColor: '#E9EEF8',
    monthTextColor: '#E9EEF8',
  };

  // Top tabs (Bus active)
  const TopTabs = ({ active = 'Bus' }) => {
    const tabs = [
      { key: 'Plane',     label: 'Plane Tickets', icon: 'airplane-outline' },
      { key: 'Hotels',    label: 'Hotels',        icon: 'bed-outline' },
      { key: 'Train',     label: 'Train Tickets', icon: 'train-outline' },
      { key: 'Bus',       label: 'Bus Tickets',   icon: 'bus-outline' },
      { key: 'Transfers', label: 'Transfers',     icon: 'swap-horizontal' },
      { key: 'Cruises',   label: 'Cruises',       icon: 'boat-outline' },
      { key: 'Tours',     label: 'Tours',         icon: 'map-outline' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {tabs.map(t => {
          const isActive = t.key === active;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.8}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={isActive ? '#0E141C' : TEXT}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // open calendar (single date)
  const renderCalendarModal = () => (
    <Modal visible={showCal} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.calContainer}>
          <View style={styles.calTabs}>
            {DATE_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.calTab, activeCalTab === tab && styles.calTabActive]}
                onPress={() => setActiveCalTab(tab)}
              >
                <Text style={[styles.calTabText, activeCalTab === tab && styles.calTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeCalTab === 'Dates' && (
            <Calendar
              style={styles.calendar}
              onDayPress={(day) => setDepartDate(day.dateString)}
              markedDates={departDate ? { [departDate]: { selected: true } } : {}}
              theme={calTheme}
              hideExtraDays={false}
            />
          )}

          <TouchableOpacity style={styles.calConfirm} onPress={() => setShowCal(false)}>
            <Text style={styles.calConfirmText}>{departDate ? `Select ${departDate}` : 'Select Date'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // mock cards
  const lastMinute = [
    { price: 19, from: 'Paris', to: 'Brussels', time: '3h 45m · Direct', day: '19 Dec, Thu', range: '12:10 – 15:55' },
    { price: 25, from: 'Amsterdam', to: 'Berlin', time: '8h 20m · 1 transfer', day: '19 Dec, Thu', range: '09:05 – 17:25' },
  ];
  const explore = [
    { city: 'Paris', fromPrice: 9,  img: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=600&q=60' },
    { city: 'Amsterdam', fromPrice: 12, img: 'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?w=600&q=60' },
    { city: 'Prague', fromPrice: 14, img: 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=600&q=60' },
  ];

  // results (mock)
  const offers = [
    { id: '1', operator: 'FlixBus',    depart: '08:10', arrive: '12:30', stopFrom: 'PAR', stopTo: 'AMS', duration: '4h 20m', transfers: 'Direct',      price: 22 },
    { id: '2', operator: 'BlaBlaBus',  depart: '09:40', arrive: '14:35', stopFrom: 'PAR', stopTo: 'AMS', duration: '4h 55m', transfers: 'Direct',      price: 24 },
    { id: '3', operator: 'Eurolines',  depart: '07:15', arrive: '14:45', stopFrom: 'PAR', stopTo: 'AMS', duration: '7h 30m', transfers: '1 transfer',  price: 19 },
    { id: '4', operator: 'RegioJet',   depart: '14:05', arrive: '21:20', stopFrom: 'PAR', stopTo: 'AMS', duration: '7h 15m', transfers: '2 transfers', price: 18 },
  ];

  // helpers
  const openResults = () => {
    const next = [...new Set([`${from} → ${to}`, ...recent])].slice(0, 10);
    if (from && to) setRecent(next);
    setResultsVisible(true);
  };
  const openDetails = (offer) => { setSelectedOffer(offer); setDetailsVisible(true); };
  const tripHeaderText = () => `${from || 'City A'} ⇢ ${to || 'City B'}`;

  // destination pick handlers
  const openDest = (which) => setDestModal({ open: true, which, init: which === 'from' ? from : to });
  const handlePickDest = (city) => {
    if (destModal.which === 'from') setFrom(city);
    else setTo(city);
    setDestModal({ open: false, which: 'from', init: '' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Tickets</Text>
        <View style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={20} color={TEXT} />
          <Ionicons name="ellipsis-vertical" size={18} color={TEXT} style={{ marginLeft: 12 }} />
        </View>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TopTabs />

        {/* Search Card */}
        <View style={styles.card}>
          {/* From */}
          <View style={styles.labeledInput}>
            <Text style={styles.labelSmall}>From</Text>
            <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => openDest('from')}>
              <Text style={styles.inputText}>{from || 'City / Stop'}</Text>
              <TouchableOpacity style={styles.swapBtn} onPress={() => [setFrom(to), setTo(from)]}>
                <Ionicons name="swap-vertical" size={18} color={TEXT} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* To */}
          <View style={[styles.labeledInput, { marginTop: 10 }]}>
            <Text style={styles.labelSmall}>Where to?</Text>
            <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => openDest('to')}>
              <Text style={styles.inputText}>{to || 'Destination'}</Text>
            </TouchableOpacity>
          </View>

          {/* Date (single) */}
          <View style={[styles.duoRow, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.duoField} onPress={() => setShowCal(true)}>
              <Text style={styles.labelSmall}>When?</Text>
              <Text style={styles.duoValue}>{departDate ? departDate : 'Select date'}</Text>
            </TouchableOpacity>

            {/* No return (placeholder) */}
            <View style={[styles.duoField, { opacity: 0.35 }]}>
              <Text style={styles.labelSmall}>Return</Text>
              <Text style={styles.duoValue}>—</Text>
            </View>
          </View>

          {/* Passengers */}
          <TouchableOpacity style={styles.passengersField} onPress={() => setShowPax(true)}>
            <Ionicons name="people" size={18} color={SUBTLE} />
            <Text style={styles.passengersText}>
              Passengers — A{passengers.adults} C{passengers.children} I{passengers.infants}
            </Text>
          </TouchableOpacity>

          {/* Filters + Search */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
              <Ionicons name="options-outline" size={18} color={TEXT} />
              <Text style={styles.filterBtnText}>Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={openResults}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Last Minute */}
        <Text style={styles.sectionTitle}>Last Minute Tickets</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {lastMinute.map((c, idx) => (
            <View key={idx} style={styles.ticketCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>${c.price}</Text>
                <TouchableOpacity><Ionicons name="heart-outline" size={16} color={TEXT} /></TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <View style={styles.ticketRow}>
                <MaterialCommunityIcons name="bus" size={14} color={SUBTLE} />
                <Text style={styles.ticketLabel}>{c.day}</Text>
              </View>
              <Text style={styles.ticketSub}>{c.range}</Text>
              <View style={styles.ticketRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={SUBTLE} />
                <Text style={styles.ticketLabel}>{c.time}</Text>
              </View>
              <View style={styles.routeRow}>
                <Text style={styles.routeText}>{c.from}</Text>
                <View style={styles.routeDot} />
                <Text style={[styles.routeText, { opacity: 0.5 }]}>—</Text>
                <View style={styles.routeDot} />
                <Text style={[styles.routeText, styles.routeActive]}>{c.to}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Where to go */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Where to Go?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {explore.map((e, i) => (
            <View key={i} style={styles.cityCard}>
              <Image source={{ uri: e.img }} style={styles.cityImg} />
              <Text style={styles.cityName}>{e.city}</Text>
              <Text style={styles.cityPrice}>from ${e.fromPrice}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Calendar (single-date) */}
      {renderCalendarModal()}

      {/* Destination modal */}
      <DestinationModal
        open={destModal.open}
        initialQuery={destModal.init}
        recent={recent}
        onClearRecent={() => setRecent([])}
        onClose={() => setDestModal({ open: false, which: 'from', init: '' })}
        onPick={handlePickDest}
      />

      {/* Passenger Modal (unchanged design) */}
      <Modal visible={showPax} animationType="slide" transparent onRequestClose={() => setShowPax(false)}>
        <View style={styles.overlay}>
          <View style={styles.paxSheet}>
            <Text style={styles.paxHeader}>Passengers</Text>
            {['adults', 'children', 'infants'].map((key) => {
              const lab = key === 'adults' ? 'Adults' : key === 'children' ? 'Children' : 'Infants';
              const sub = key === 'adults' ? '12+ years' : key === 'children' ? '2–11 years' : 'Under 2 years';
              return (
                <View key={key} style={styles.paxRow}>
                  <View>
                    <Text style={styles.paxLabel}>{lab}</Text>
                    <Text style={styles.paxSub}>{sub}</Text>
                  </View>
                  <View style={styles.paxControls}>
                    <TouchableOpacity style={styles.paxBtn} onPress={() => setPassengers((p) => ({ ...p, [key]: Math.max(0, p[key] - 1) }))}>
                      <Text style={styles.paxBtnText}>–</Text>
                    </TouchableOpacity>
                    <Text style={styles.paxCount}>{passengers[key]}</Text>
                    <TouchableOpacity style={styles.paxBtn} onPress={() => setPassengers((p) => ({ ...p, [key]: p[key] + 1 }))}>
                      <Text style={styles.paxBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <TouchableOpacity style={styles.paxSave} onPress={() => setShowPax(false)}>
              <Text style={styles.paxSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filters Modal (bus labels) */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.overlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeaderBar} />
            <Text style={styles.filtersTitle}>Filters</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Bus information</Text>
                <TouchableOpacity style={styles.selectorRow} activeOpacity={0.8}>
                  <Text style={styles.selectorText}>Select operators</Text>
                  <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectorRow} activeOpacity={0.8}>
                  <Text style={styles.selectorText}>Select bus types / classes</Text>
                  <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
                </TouchableOpacity>
              </View>

              <View style={styles.group}>
                <Text style={styles.groupTitle}>Departure & Arrival</Text>

                <View style={styles.sliderBlock}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderTitle}>Departure time</Text>
                    <Text style={styles.sliderPill}>{toTime(filters.time[0])}–{toTime(filters.time[1])}</Text>
                  </View>
                  <RangeSlider min={0} max={24} step={0.5} values={[filters.time[0], filters.time[1]]} onChange={(vals) => setFilters((f) => ({ ...f, time: vals }))} />
                </View>

                <View style={[styles.sliderBlock, { marginTop: 18 }]}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderTitle}>Arrival time</Text>
                    <Text style={styles.sliderPill}>{toTime(filters.stops[0])}–{toTime(filters.stops[1])}</Text>
                  </View>
                  <RangeSlider min={0} max={24} step={0.5} values={[filters.stops[0], filters.stops[1]]} onChange={(vals) => setFilters((f) => ({ ...f, stops: vals }))} />
                </View>
              </View>

              <View style={styles.group}>
                <Text style={styles.groupTitle}>Duration of trip</Text>
                <View style={styles.selectorRow}><Text style={styles.selectorText}>Less than 48hrs</Text></View>
                <RangeSlider min={0} max={48} step={1} values={[filters.duration[0], filters.duration[1]]} onChange={(vals) => setFilters((f) => ({ ...f, duration: vals }))} />
              </View>

              <View style={styles.group}>
                <Text style={styles.groupTitle}>Transfers</Text>
                {[
                  { key: 'direct', label: 'Direct buses' },
                  { key: 'one', label: '1 transfer' },
                  { key: 'two', label: '2 transfers' },
                  { key: 'three', label: '3+ transfers' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.checkRow}
                    activeOpacity={0.8}
                    onPress={() => setFilters((f) => ({ ...f, transfers: { ...f.transfers, [item.key]: !f.transfers[item.key] } }))}
                  >
                    <Ionicons
                      name={filters.transfers[item.key] ? 'checkbox-outline' : 'square-outline'}
                      size={18}
                      color={filters.transfers[item.key] ? ACCENT : SUBTLE}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.checkLabel}>{item.label}</Text>
                    <Text style={styles.checkPrice}>$15</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.group}>
                <Text style={styles.groupTitle}>Duration of transfers</Text>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderPillPlain}>10m</Text>
                  <Text style={styles.sliderPillPlain}>4h</Text>
                </View>
                <RangeSlider
                  min={0.2}
                  max={4}
                  step={0.2}
                  values={[Math.max(0.2, filters.stops[0] || 0.2), Math.max(0.2, filters.stops[1] || 4)]}
                  onChange={(vals) => setFilters((f) => ({ ...f, stops: vals }))}
                />
              </View>

              <View style={styles.group}>
                <Text style={styles.groupTitle}>Price range</Text>
                <View style={styles.priceCaps}>
                  <View style={styles.cap}>
                    <Text style={styles.capLabel}>Minimum</Text>
                    <Text style={styles.capValue}>${filters.price[0]}</Text>
                  </View>
                  <View style={styles.cap}>
                    <Text style={styles.capLabel}>Maximum</Text>
                    <Text style={styles.capValue}>${filters.price[1]}</Text>
                  </View>
                </View>
                <RangeSlider min={0} max={10000} step={10} values={[filters.price[0], filters.price[1]]} onChange={(vals) => setFilters((f) => ({ ...f, price: vals }))} />
              </View>

              <View style={styles.group}>
                {[
                  { key: 'breg', label: 'USB / power outlets preferred' },
                  { key: 'visa', label: 'Visa-free transfer countries' },
                  { key: 'overnight', label: 'No overnight transfers', bind: 'overnight' },
                ].map((item) => (
                  <View key={item.key} style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>{item.label}</Text>
                    <TouchableOpacity
                      onPress={() => item.bind
                        ? setFilters((f) => ({ ...f, overnight: !f.overnight }))
                        : setExtraToggles((t) => ({ ...t, [item.key]: !t[item.key] }))
                      }
                      style={[styles.switch, (item.bind ? filters.overnight : extraToggles[item.key]) && styles.switchOn]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.knob, (item.bind ? filters.overnight : extraToggles[item.key]) && styles.knobOn]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.filterBtns}>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    setFilters(INITIAL_FILTERS);
                    setExtraToggles({ breg: false, visa: false });
                  }}
                >
                  <Ionicons name="refresh" size={16} color={TEXT} />
                  <Text style={styles.clearBtnText}>Clear Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.paxSave} onPress={() => setShowFilters(false)}>
                  <Text style={styles.paxSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RESULTS overlay */}
      {resultsVisible && (
        <View style={styles.resultsOverlay} pointerEvents="auto">
          <ResultsContent
            offers={offers}
            titleText={tripHeaderText()}
            onBack={() => setResultsVisible(false)}
            onOpenDetails={openDetails}
            onOpenPriceChart={() => setPriceChartVisible(true)}
          />
        </View>
      )}

      {/* Trip details (single segment) */}
      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setDetailsVisible(false)}
        hardwareAccelerated
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: '#0E141C' }}>
            <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
              <TouchableOpacity onPress={() => setDetailsVisible(false)} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </TouchableOpacity>
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' }}>Trip Details</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {selectedOffer && (
                <View style={{ backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <MaterialCommunityIcons name="bus" size={16} color={SUBTLE} />
                    <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>
                      {from} – {to}
                    </Text>
                  </View>
                  <Text style={{ color: TEXT, marginTop: 2, fontFamily: 'Raleway_400Regular' }}>
                    {selectedOffer.depart} — {selectedOffer.arrive}
                  </Text>
                  <Text style={{ color: SUBTLE, fontSize: 12, marginTop: 4, fontFamily: 'Raleway_400Regular' }}>
                    {selectedOffer.operator} · {selectedOffer.duration} · {selectedOffer.transfers}
                  </Text>
                  <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 10 }} />
                  <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: 'Raleway_400Regular' }}>Standard seat</Text>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>• Power/USB (if available)</Text>
                    <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>• Exchangeable (fee may apply)</Text>
                    <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>• Refundable (conditions apply)</Text>
                  </View>
                </View>
              )}
              <View style={{ height: 12 }} />
              <Text style={{ color: TEXT, fontWeight: '700', textAlign: 'center', marginTop: 6, fontFamily: 'Raleway_400Regular' }}>${selectedOffer?.price ?? 0} for 1 ticket</Text>
            </ScrollView>

            <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#0E141C' }}>
              <TouchableOpacity style={{ height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Buy Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Price chart (unchanged) */}
      <Modal
        visible={priceChartVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setPriceChartVisible(false)}
        hardwareAccelerated
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingBottom: 20, maxHeight: Math.min(height * 0.5, 380) }}>
            <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Price chart</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {Array.from({ length: 16 }).map((_, i) => {
                const price = 10 + Math.round(Math.abs(Math.sin(i * 1.1)) * 40);
                const barH = Math.max(24, Math.min(120, Math.round((price / 60) * 120)));
                return (
                  <View key={i} style={{ width: 36, alignItems: 'center', marginRight: 8 }}>
                    <View style={{ width: 24, borderRadius: 6, backgroundColor: ACCENT, height: barH }} />
                    <Text style={{ color: SUBTLE, fontSize: 10, marginTop: 6, fontFamily: 'Raleway_400Regular' }}>{price}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{ backgroundColor: ACCENT, borderRadius: 8, padding: 14, marginHorizontal: 16, marginTop: 16, alignItems: 'center' }} onPress={() => setPriceChartVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------- Styles ----------------
const RADIUS = 14;
const styles = StyleSheet.create({
  // added missing key to avoid undefined style reference
  tabsScroll: {},

  safe: { flex: 1, backgroundColor: '#0E141C' },

  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: TEXT, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  scrollContent: { paddingBottom: 16 },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6 },
  tabPill: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, height: 32, marginRight: 8 },
  tabPillActive: { backgroundColor: TEXT },
  tabPillText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  tabPillTextActive: { color: '#0E141C', fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  card: { backgroundColor: CARD_BG, borderRadius: RADIUS, marginTop: 12, marginHorizontal: 12, padding: 12, borderWidth: 1, borderColor: BORDER },
  labeledInput: {},
  labelSmall: { color: SUBTLE, fontSize: 11, marginBottom: 6, fontFamily: 'Raleway_400Regular' },
  inputRow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, justifyContent: 'center' },
  inputText: { color: TEXT, fontSize: 15, fontFamily: 'Raleway_400Regular' },
  swapBtn: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C2740', alignItems: 'center', justifyContent: 'center', borderColor: BORDER, borderWidth: 1 },

  duoRow: { flexDirection: 'row', gap: 10 },
  duoField: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, paddingVertical: 10 },
  duoValue: { color: TEXT, fontSize: 15, marginTop: 2, fontFamily: 'Raleway_400Regular' },

  passengersField: { marginTop: 12, height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  passengersText: { color: TEXT, marginLeft: 8, fontFamily: 'Raleway_400Regular' },

  actionRow: { flexDirection: 'row', marginTop: 12 },
  filterBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  filterBtnText: { color: TEXT, marginLeft: 8, fontWeight: '500', fontFamily: 'Raleway_400Regular' },
  searchBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 10, paddingHorizontal: 16, fontFamily: 'Raleway_400Regular' },

  ticketCard: { width: 200, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, padding: 12, marginRight: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { color: TEXT, fontSize: 18, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  ticketLabel: { color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  ticketSub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: 'Raleway_400Regular' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' },
  routeText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  routeActive: { color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  routeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER },

  cityCard: { width: 180, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, marginRight: 12, overflow: 'hidden' },
  cityImg: { width: '100%', height: 112 },
  cityName: { color: TEXT, fontSize: 14, fontWeight: '700', marginTop: 8, marginHorizontal: 10, fontFamily: 'Raleway_400Regular' },
  cityPrice: { color: SUBTLE, fontSize: 12, marginBottom: 10, marginHorizontal: 10, fontFamily: 'Raleway_400Regular' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  calContainer: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden', maxHeight: width * 1.2 },
  calTabs: { flexDirection: 'row', backgroundColor: '#0E141C' },
  calTab: { flex: 1, padding: 12, alignItems: 'center' },
  calTabActive: { backgroundColor: ACCENT },
  calTabText: { color: SUBTLE, fontFamily: 'Raleway_400Regular' },
  calTabTextActive: { color: '#fff', fontWeight: '600', fontFamily: 'Raleway_400Regular' },
  calendar: { backgroundColor: '#0E141C' },
  calConfirm: { backgroundColor: ACCENT, padding: 16, alignItems: 'center' },
  calConfirmText: { color: '#fff', fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  paxSheet: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 32 },
  paxHeader: { color: TEXT, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10, fontFamily: 'Raleway_400Regular' },
  paxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginVertical: 8 },
  paxLabel: { color: TEXT, fontSize: 16, fontFamily: 'Raleway_400Regular' },
  paxSub: { color: SUBTLE, fontSize: 12, marginTop: 2, fontFamily: 'Raleway_400Regular' },
  paxControls: { flexDirection: 'row', alignItems: 'center' },
  paxBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A3247', justifyContent: 'center', alignItems: 'center' },
  paxBtnText: { color: '#fff', fontSize: 20, lineHeight: 20, fontFamily: 'Raleway_400Regular' },
  paxCount: { color: TEXT, fontSize: 16, marginHorizontal: 12, fontFamily: 'Raleway_400Regular' },
  paxSave: { backgroundColor: ACCENT, borderRadius: 8, padding: 14, marginHorizontal: 16, marginTop: 16, alignItems: 'center' },
  paxSaveText: { color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  filterSheet: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8, paddingBottom: 24 },
  filterHeaderBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A3247', marginTop: 6, marginBottom: 6 },
  filtersTitle: { color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6, fontFamily: 'Raleway_400Regular' },

  group: { borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  groupTitle: { color: SUBTLE, fontSize: 12, marginBottom: 10, fontFamily: 'Raleway_400Regular' },

  selectorRow: { height: 44, borderRadius: 10, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  selectorText: { color: SUBTLE, fontSize: 13, fontFamily: 'Raleway_400Regular' },

  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkLabel: { color: TEXT, fontSize: 13, flex: 1, fontFamily: 'Raleway_400Regular' },
  checkPrice: { color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' },

  sliderBlock: {},
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sliderTitle: { color: TEXT, fontSize: 13, fontFamily: 'Raleway_400Regular' },
  sliderPill: { backgroundColor: '#1A2340', color: TEXT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', fontSize: 12 },
  sliderPillPlain: { color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' },

  priceCaps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cap: { width: '48%', backgroundColor: '#0E1523', borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 10 },
  capLabel: { color: SUBTLE, fontSize: 11, marginBottom: 4, fontFamily: 'Raleway_400Regular' },
  capValue: { color: TEXT, fontSize: 14, fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel: { color: TEXT, fontSize: 13, fontFamily: 'Raleway_400Regular' },
  switch: { width: 50, height: 30, borderRadius: 16, backgroundColor: '#263149', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: ACCENT },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT, alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },

  // range slider visuals
  rsWrap: { height: 44, justifyContent: 'center' },
  rsTrack: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: BORDER, borderRadius: 2 },
  rsRange: { position: 'absolute', height: 4, backgroundColor: ACCENT, borderRadius: 2 },
  rsThumb: { position: 'absolute', top: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT },
  rsThumbActive: { transform: [{ scale: 1.05 }] },

  filterBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16 },
  clearBtn: { height: 48, flex: 1, borderRadius: 12, backgroundColor: '#1a2133', borderWidth: 0, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexDirection: 'row', gap: 8 },
  clearBtnText: { color: TEXT, fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  // results shared styles
  resChip: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD_BG, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  resChipText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },

  resCard: { marginHorizontal: 12, marginTop: 10, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, padding: 12 },
  resTime: { color: TEXT, fontSize: 16, fontWeight: '700', width: 56, textAlign: 'center', fontFamily: 'Raleway_400Regular' },
  resAirline: { color: TEXT, fontSize: 13, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  resMeta: { color: SUBTLE, fontSize: 12, marginTop: 2, fontFamily: 'Raleway_400Regular' },
  resRoute: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8, paddingHorizontal: 6 },
  resApt: { color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  resDivider: { flex: 1, height: 1, backgroundColor: BORDER },
  resFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  resPrice: { color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  buyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: ACCENT },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Raleway_400Regular' },

  priceChartBtn: { marginHorizontal: 12, marginTop: 12, height: 46, borderRadius: 12, backgroundColor: '#11214a', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },

  resultsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E141C',
    zIndex: 20,
    elevation: 20,
  },
});
