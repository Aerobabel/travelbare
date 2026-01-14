// app/FlightSearch.jsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import DestinationModal from '../components/DestinationModal';
import FiltersSheet from '../components/FiltersSheet';
import PassengersSheet from '../components/PassengersSheet';
import PriceChartModal from '../components/PriceChartModal';
import ResultsOverlay from '../components/ResultsOverlay';
import TripDetailsModal from '../components/TripDetailsModal';
import { api } from '../services/api';

const { width, height } = Dimensions.get('window');

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://travelapi-34zi.onrender.com';

const ACCENT = '#2F6BFF';
const TEXT = '#E9EEF8';
const SUBTLE = '#8A93A0';
const BORDER = '#283142';
const CARD_BG = '#ffffff09';
const INPUT_BG = '#ffffff09';

const DATE_TABS = ['Dates', 'Months', 'Flexible'];
const HEADER_HEIGHT = 48;
const RADIUS = 14;

/* ----------------------------- utils ----------------------------- */

// Extract IATA code from label: "City, CODE" / "(CODE)" / "CODE"
const extractCode = (label) => {
  if (!label) return null;
  const s = String(label).trim();
  const m1 = /\(([A-Z]{3})\)/i.exec(s);
  if (m1) return m1[1].toUpperCase();
  const parts = s.split(',').map((t) => t.trim());
  const last = parts[parts.length - 1] || s;
  if (/^[A-Za-z]{3}$/.test(last)) return last.toUpperCase();
  if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();
  return null;
};

// Format ISO date -> "8 Jul, Tue"
const formatPrettyDate = (iso) => {
  if (!iso) return 'Select date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
};

// Derive Amadeus-compatible travel class from onboard label
const deriveTravelClass = (onboard) => {
  const t = (onboard || '').toUpperCase();
  if (t.includes('1ST') || t.includes('FIRST')) return 'FIRST';
  if (t.includes('BUSINESS')) return 'BUSINESS';
  if (t.includes('PREMIUM')) return 'PREMIUM_ECONOMY';
  return 'ECONOMY';
};

const INITIAL_FILTERS = {
  onboard: 'Economy',
  time: [0, 24],
  arrivalTime: [0, 24],
  duration: [0, 48],
  stopDuration: [1, 24],
  transfers: { direct: false, one: false, two: false, three: false },
  price: [0, 10000],
  overnight: false,
};

export default function FlightSearch() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Core labels (backend parses codes itself)
  const [from, setFrom] = useState(params.from || 'Istanbul, IST');
  const [to, setTo] = useState(params.to || '');

  // Store ISO dates
  const [departDate, setDepartDate] = useState(params.departDate || null);
  const [returnDate, setReturnDate] = useState(params.returnDate || null);

  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [extraToggles, setExtraToggles] = useState({ breg: false, visa: false });

  // Calendar: single controller
  // 'depart' | 'return' | 'multi_0' | ...
  const [activeCalKey, setActiveCalKey] = useState(null);
  const [activeCalTab, setActiveCalTab] = useState('Dates');

  const [showPax, setShowPax] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Trip types
  const [tripType, setTripType] = useState('oneway'); // 'oneway' | 'round' | 'multi'
  const [legs, setLegs] = useState([{ from: '', to: '', date: null }]);

  // Results + modals
  const [resultsVisible, setResultsVisible] = useState(false);
  const [priceChartVisible, setPriceChartVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // API data
  const [apiOffers, setApiOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [priceRows, setPriceRows] = useState([]);

  // Recents + destination modal
  const [recent, setRecent] = useState(['Istanbul, IST', 'Paris, CDG', 'Amsterdam, AMS']);
  const [destModal, setDestModal] = useState({
    open: false,
    which: 'from',
    init: '',
    legIndex: null,
  });

  /* --------------------------- calendar --------------------------- */

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

  const openCalendar = (key) => {
    setActiveCalKey(key);
    setActiveCalTab('Dates');
  };

  const closeCalendar = () => setActiveCalKey(null);

  const getActiveCalDate = () => {
    if (!activeCalKey) return null;
    if (activeCalKey === 'depart') return departDate;
    if (activeCalKey === 'return') return returnDate;
    if (activeCalKey.startsWith('multi_')) {
      const idx = parseInt(activeCalKey.split('_')[1], 10);
      return legs[idx]?.date || null;
    }
    return null;
  };

  const handleSelectDate = (day) => {
    if (!activeCalKey) return;
    const iso = day.dateString;

    if (activeCalKey === 'depart') {
      setDepartDate(iso);
      if (tripType !== 'round') setReturnDate(null);
    } else if (activeCalKey === 'return') {
      setReturnDate(iso);
    } else if (activeCalKey.startsWith('multi_')) {
      const idx = parseInt(activeCalKey.split('_')[1], 10);
      setLegs((prev) => {
        const copy = [...prev];
        if (copy[idx]) copy[idx] = { ...copy[idx], date: iso };
        return copy;
      });
    }
  };

  const renderCalendarModal = () => {
    const visible = !!activeCalKey;
    if (!visible) return null;

    const selectedDate = getActiveCalDate();

    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.calContainer}>
            <View style={styles.calTabs}>
              {DATE_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.calTab, activeCalTab === tab && styles.calTabActive]}
                  onPress={() => setActiveCalTab(tab)}
                >
                  <Text
                    style={[
                      styles.calTabText,
                      activeCalTab === tab && styles.calTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeCalTab === 'Dates' && (
              <Calendar
                style={styles.calendar}
                theme={calTheme}
                onDayPress={handleSelectDate}
                markedDates={
                  selectedDate
                    ? { [selectedDate]: { selected: true } }
                    : {}
                }
                hideExtraDays={false}
              />

            )}

            {activeCalTab !== 'Dates' && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: SUBTLE, fontSize: 13 }}>
                  Flexible and monthly search coming soon.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.calConfirm} onPress={closeCalendar}>
              <Text style={styles.calConfirmText}>
                {selectedDate
                  ? `Select ${formatPrettyDate(selectedDate)}`
                  : 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  /* ------------------------- destination modal ------------------------- */

  const openDest = (which, legIndex = null) => {
    const init =
      legIndex !== null
        ? legs[legIndex]?.[which] || ''
        : which === 'from'
          ? from
          : to;
    setDestModal({ open: true, which, init, legIndex });
  };

  const handlePickDest = (label) => {
    const close = () =>
      setDestModal({ open: false, which: 'from', init: '', legIndex: null });

    if (destModal.legIndex !== null) {
      setLegs((prev) => {
        const copy = [...prev];
        copy[destModal.legIndex] = {
          ...copy[destModal.legIndex],
          [destModal.which]: label,
        };
        return copy;
      });
      close();
      return;
    }

    if (destModal.which === 'from') setFrom(label);
    else setTo(label);
    close();
  };

  /* ---------------------------- trip type UI ---------------------------- */

  const TripTypeSwitch = () => {
    const tabs = [
      { key: 'oneway', label: 'One-way' },
      { key: 'round', label: 'Round-trip' },
      { key: 'multi', label: 'Multi-city' },
    ];
    return (
      <View style={styles.segmentWrap}>
        {tabs.map((t) => {
          const active = tripType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => {
                setTripType(t.key);
                setActiveCalKey(null);
                if (t.key === 'oneway') {
                  setReturnDate(null);
                  setLegs([{ from: '', to: '', date: null }]);
                } else if (t.key === 'round') {
                  setLegs([{ from: '', to: '', date: null }]);
                } else if (t.key === 'multi') {
                  setDepartDate(null);
                  setReturnDate(null);
                  setLegs([{ from: '', to: '', date: null }]);
                }
              }}
            >
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const TopTabs = ({ active = 'Plane' }) => {
    const tabs = [
      { key: 'Plane', label: 'Plane Tickets', icon: 'airplane-outline' },
      { key: 'Hotels', label: 'Hotels', icon: 'bed-outline' },
      { key: 'Train', label: 'Train Tickets', icon: 'train-outline' },
      { key: 'Bus', label: 'Bus Tickets', icon: 'bus-outline' },
      { key: 'Transfers', label: 'Transfers', icon: 'swap-horizontal' },
      { key: 'Cruises', label: 'Cruises', icon: 'boat-outline' },
      { key: 'Tours', label: 'Tours', icon: 'map-outline' },
    ];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.8}
              style={[
                styles.tabPill,
                isActive && styles.tabPillActive,
              ]}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={isActive ? '#0E141C' : TEXT}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabPillText,
                  isActive && styles.tabPillTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  /* ---------------------- filtering + sorting ---------------------- */

  const applyFiltersAndSort = (offers) => {
    if (!Array.isArray(offers)) return [];

    const {
      duration = [0, 48],
      transfers = { direct: false, one: false, two: false, three: false },
      stopDuration = [1, 24],
      overnight = false,
      price = [0, 10000],
      time = [0, 24],
      arrivalTime = [0, 24],
    } = filters || {};

    const [depMin, depMax] = time;
    const [arrMin, arrMax] = arrivalTime;

    return offers
      .filter((o) => {
        // Duration filter (hours)
        if (o.durationMinutes != null) {
          const h = o.durationMinutes / 60;
          if (h < duration[0] || h > duration[1]) return false;
        }

        // Price filter
        if (o.price < price[0] || o.price > price[1]) return false;

        // Stops filter (pick the strictest selected)
        if (transfers.direct && o.stops !== 0) return false;
        if (transfers.one && o.stops !== 1) return false;
        if (transfers.two && o.stops !== 2) return false;
        if (transfers.three && o.stops < 3) return false;

        // Stop duration (max layover in hours)
        if (o.maxLayoverMinutes != null) {
          const layH = o.maxLayoverMinutes / 60;
          if (layH < stopDuration[0] || layH > stopDuration[1]) return false;
        }

        // No overnight transfers
        if (overnight && o.hasOvernightLayover) return false;

        // Departure window
        if (o.depart) {
          const [h, m] = o.depart.split(':').map(Number);
          const v = h + m / 60;
          if (v < depMin || v > depMax) return false;
        }

        // Arrival window
        if (o.arrive) {
          const [h, m] = o.arrive.split(':').map(Number);
          const v = h + m / 60;
          if (v < arrMin || v > arrMax) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        if (
          a.durationMinutes != null &&
          b.durationMinutes != null
        ) {
          return a.durationMinutes - b.durationMinutes;
        }
        return 0;
      });
  };

  /* --------------------------- search helpers --------------------------- */

  const buildSearchPayload = () => {
    const travelClass = deriveTravelClass(filters.onboard);
    const base = {
      tripType,
      passengers,
      travelClass,
      currencyCode: 'USD',
    };

    if (tripType === 'multi') {
      const cleanLegs = (legs || []).filter(
        (l) => l.from && l.to && l.date
      );

      if (!cleanLegs.length) {
        Alert.alert(
          'Add flights',
          'Please add at least one complete leg (from, to, date).'
        );
        return null;
      }

      return {
        ...base,
        legs: cleanLegs,
      };
    }

    if (!from || !to) {
      Alert.alert(
        'Where are you flying?',
        'Please select both origin and destination.'
      );
      return null;
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const finalDepart = departDate || todayISO;

    return {
      ...base,
      from,
      to,
      departDate: finalDepart,
      returnDate: tripType === 'round' ? returnDate || null : null,
    };
  };

  const openResults = async () => {
    const payload = buildSearchPayload();
    if (!payload) return;

    if (tripType !== 'multi' && from && to) {
      const combo = `${from} → ${to}`;
      setRecent((r) => [...new Set([combo, ...r])].slice(0, 10));
    }

    try {
      setLoadingOffers(true);
      const json = await api.post('/flights/search', payload);
      setApiOffers(Array.isArray(json?.offers) ? json.offers : []);
    } catch (e) {
      console.error('search error', e);
      setApiOffers([]);
      Alert.alert(
        'Error',
        'Could not load flights. Please try again.'
      );
    } finally {
      setLoadingOffers(false);
      setResultsVisible(true);
    }
  };

  const onOpenPriceChart = async () => {
    try {
      const origin = extractCode(from) || 'IST';
      const dest = extractCode(to) || 'CDG';

      const base = departDate
        ? new Date(departDate)
        : new Date();
      const start = new Date(base);
      start.setDate(start.getDate() - 3);
      const end = new Date(base);
      end.setDate(end.getDate() + 12);

      const fmt = (d) => d.toISOString().slice(0, 10);

      const json = await api.get('/flights/date-prices', {
        origin,
        destination: dest,
        from: fmt(start),
        to: fmt(end),
        currencyCode: 'USD'
      });
      setPriceRows(Array.isArray(json?.rows) ? json.rows : []);
    } catch (e) {
      console.error('price chart error', e);
      setPriceRows([]);
    }
    setPriceChartVisible(true);
  };

  // Loading state for purchase
  const [validatingOffer, setValidatingOffer] = useState(false);

  const buySelected = async () => {
    try {
      if (!selectedOffer?._raw) {
        Alert.alert(
          'Info',
          'Live repricing unavailable for this offer.'
        );
        return;
      }

      setValidatingOffer(true); // START LOADING

      const json = await api.post('/flights/price', { offer: selectedOffer._raw });
      const total =
        json?.priced?.data?.flightOffers?.[0]?.price?.grandTotal ||
        json?.priced?.flightOffers?.[0]?.price?.grandTotal ||
        selectedOffer.price;

      const routerParams = {
        offer: JSON.stringify({
          ...selectedOffer,
          _raw: undefined, // Don't pass raw object to avoid serialization issues if large
          // Manually add missing fields if normalized doesn't have them
          // But normalized offer structure should be fine
        })
      };

      setDetailsVisible(false);
      // Optional: keep results visible or close them too. Closing is cleaner.
      // setResultsVisible(false);

      router.push({
        pathname: '/ReviewFlightOrder',
        params: routerParams
      });
    } catch (e) {
      console.error('buy error', e);
      Alert.alert(
        'Info',
        'Could not validate price. Please try again.'
      );
    } finally {
      setValidatingOffer(false); // STOP LOADING
    }
  };

  const tripHeaderText = () => {
    if (tripType === 'multi') {
      const legCount = Math.max(1, legs.length);
      return `${legs[0]?.from || 'Multi-city'} · ${legCount} flights`;
    }
    const f = extractCode(from) || 'FROM';
    const t = extractCode(to) || 'TO';
    if (tripType === 'oneway') return `${f} ⇢ ${t}`;
    if (tripType === 'round') return `${f} ⇄ ${t}`;
    return `${f} ⇢ ${t}`;
  };

  /* ------------------------- decorative content ------------------------- */

  const lastMinute = [
    {
      price: 235,
      from: 'Istanbul',
      to: 'Paris',
      time: '5h / Direct',
      day: '19 December, Th',
      range: '12:10 – 17:05',
    },
    {
      price: 830,
      from: 'Istanbul',
      to: 'Rome',
      time: '4h / Direct',
      day: '19 December, Th',
      range: '12:10 – 16:10',
    },
  ];

  const explore = [
    {
      city: 'Paris',
      fromPrice: 1132,
      img: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=600&q=60',
    },
    {
      city: 'Amsterdam',
      fromPrice: 232,
      img: 'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?w=600&q=60',
    },
    {
      city: 'Prague',
      fromPrice: 287,
      img: 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=600&q=60',
    },
  ];

  const visibleOffers = applyFiltersAndSort(apiOffers);

  /* ------------------------------ render ------------------------------ */

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}
    >
      {/* Header */}
      <View style={[styles.header, { height: HEADER_HEIGHT }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={TEXT}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Air Tickets</Text>
        <View style={styles.headerRight}>
          <Ionicons
            name="notifications-outline"
            size={20}
            color={TEXT}
          />
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={TEXT}
            style={{ marginLeft: 12 }}
          />
        </View>
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? HEADER_HEIGHT : 0
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TopTabs />
          <TripTypeSwitch />

          {/* One-way / Round-trip */}
          {tripType !== 'multi' && (
            <>
              {/* From / Where to */}
              <View style={styles.fromWhereToCard}>
                <View style={styles.labeledInputRow}>
                  <Text style={styles.labelSmall}>From</Text>
                  <TouchableOpacity
                    style={styles.inputField}
                    activeOpacity={0.9}
                    onPress={() => openDest('from')}
                  >
                    <Text style={styles.inputText}>
                      {from || 'From'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerLine} />

                <View style={styles.labeledInputRow}>
                  <Text style={styles.labelSmall}>Where to?</Text>
                  <TouchableOpacity
                    style={styles.inputField}
                    activeOpacity={0.9}
                    onPress={() => openDest('to')}
                  >
                    <Text style={styles.inputText}>
                      {to || 'Where to?'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => {
                    if (!from && !to) return;
                    setFrom(to);
                    setTo(from);
                  }}
                >
                  <Ionicons
                    name="swap-vertical"
                    size={18}
                    color={TEXT}
                  />
                </TouchableOpacity>
              </View>

              {/* Dates / Passengers */}
              <View style={[styles.card, { marginTop: 12 }]}>
                <View style={styles.duoRowWrapper}>
                  <TouchableOpacity
                    style={styles.duoField}
                    onPress={() => openCalendar('depart')}
                  >
                    <Text style={styles.labelSmall}>When?</Text>
                    <Text style={styles.duoValue}>
                      {departDate
                        ? formatPrettyDate(departDate)
                        : 'Select date'}
                    </Text>
                  </TouchableOpacity>

                  {tripType === 'round' ? (
                    <TouchableOpacity
                      style={styles.duoField}
                      onPress={() => openCalendar('return')}
                    >
                      <Text style={styles.labelSmall}>Return</Text>
                      <Text style={styles.duoValue}>
                        {returnDate
                          ? formatPrettyDate(returnDate)
                          : '—'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.duoField,
                        { opacity: 0.35 },
                      ]}
                    >
                      <Text style={styles.labelSmall}>
                        Return
                      </Text>
                      <Text style={styles.duoValue}>—</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputDivider} />

                <TouchableOpacity
                  style={styles.passengersField}
                  onPress={() => setShowPax(true)}
                >
                  <Ionicons
                    name="people"
                    size={18}
                    color={SUBTLE}
                  />
                  <Text style={styles.passengersText}>
                    Passengers
                  </Text>
                  <Text style={styles.passengersCount}>
                    A{passengers.adults} C{passengers.children} I
                    {passengers.infants}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Multi-city */}
          {tripType === 'multi' && (
            <>
              {legs.map((leg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.multiCard,
                    idx !== 0 && { marginTop: 10 },
                  ]}
                >
                  <View style={styles.multiHeader}>
                    <View style={styles.multiBadge}>
                      <Text style={styles.multiBadgeText}>
                        {idx + 1}
                      </Text>
                    </View>
                    {idx > 0 && (
                      <TouchableOpacity
                        onPress={() =>
                          setLegs((prev) =>
                            prev.filter(
                              (_, i) => i !== idx
                            )
                          )
                        }
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={SUBTLE}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.labeledInput}>
                    <Text style={styles.labelSmall}>From</Text>
                    <TouchableOpacity
                      style={styles.inputRow}
                      activeOpacity={0.9}
                      onPress={() =>
                        openDest('from', idx)
                      }
                    >
                      <Text style={styles.inputText}>
                        {leg.from ||
                          (idx === 0
                            ? 'Istanbul, IST'
                            : 'From city/airport')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.labeledInput,
                      { marginTop: 10 },
                    ]}
                  >
                    <Text style={styles.labelSmall}>To</Text>
                    <TouchableOpacity
                      style={styles.inputRow}
                      activeOpacity={0.9}
                      onPress={() =>
                        openDest('to', idx)
                      }
                    >
                      <Text style={styles.inputText}>
                        {leg.to || 'Destination'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.duoField,
                      { marginTop: 12 },
                    ]}
                    onPress={() =>
                      openCalendar(`multi_${idx}`)
                    }
                  >
                    <Text style={styles.labelSmall}>
                      When?
                    </Text>
                    <Text style={styles.duoValue}>
                      {leg.date
                        ? formatPrettyDate(leg.date)
                        : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addLegBtn}
                onPress={() =>
                  setLegs((prev) => [
                    ...prev,
                    {
                      from: '',
                      to: '',
                      date: null,
                    },
                  ])
                }
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={TEXT}
                />
                <Text style={styles.addLegText}>
                  Add another flight
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Filters */}
          <TouchableOpacity
            style={[styles.card, styles.filtersCard]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={SUBTLE}
            />
            <Text style={styles.filtersCardText}>
              Filters
            </Text>
          </TouchableOpacity>

          {/* Search button */}
          <TouchableOpacity
            style={styles.standaloneSearchBtn}
            onPress={openResults}
            disabled={loadingOffers}
          >
            <Text style={styles.searchBtnText}>
              {loadingOffers ? 'Searching…' : 'Search'}
            </Text>
          </TouchableOpacity>

          {/* Decorative sections */}
          <Text style={styles.sectionTitle}>
            Last Minute Tickets
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
            }}
          >
            {lastMinute.map((c, idx) => (
              <View
                key={idx}
                style={styles.ticketCard}
              >
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>
                    ${c.price}
                  </Text>
                  <TouchableOpacity>
                    <Ionicons
                      name="heart-outline"
                      size={16}
                      color={TEXT}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <View style={styles.ticketRow}>
                  <MaterialCommunityIcons
                    name="airplane-takeoff"
                    size={14}
                    color={SUBTLE}
                  />
                  <Text
                    style={styles.ticketLabel}
                  >
                    {c.day}
                  </Text>
                </View>
                <Text style={styles.ticketSub}>
                  {c.range}
                </Text>
                <View style={styles.ticketRow}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={SUBTLE}
                  />
                  <Text
                    style={styles.ticketLabel}
                  >
                    {c.time}
                  </Text>
                </View>
                <View style={styles.routeRow}>
                  <Text style={styles.routeText}>
                    {c.from}
                  </Text>
                  <View style={styles.routeDot} />
                  <Text
                    style={[
                      styles.routeText,
                      { opacity: 0.5 },
                    ]}
                  >
                    —
                  </Text>
                  <View style={styles.routeDot} />
                  <Text
                    style={[
                      styles.routeText,
                      styles.routeActive,
                    ]}
                  >
                    {c.to}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Text
            style={[
              styles.sectionTitle,
              { marginTop: 8 },
            ]}
          >
            Where to Go?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 24,
            }}
          >
            {explore.map((e, i) => (
              <View
                key={i}
                style={styles.cityCard}
              >
                <Image
                  source={{ uri: e.img }}
                  style={styles.cityImg}
                />
                <Text style={styles.cityName}>
                  {e.city}
                </Text>
                <Text style={styles.cityPrice}>
                  from ${e.fromPrice}
                </Text>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Calendar modal */}
      {renderCalendarModal()}

      {/* Destination Modal */}
      <DestinationModal
        open={destModal.open}
        initialQuery={destModal.init}
        onPick={handlePickDest}
        onClose={() =>
          setDestModal({
            open: false,
            which: 'from',
            init: '',
            legIndex: null,
          })
        }
        recent={recent}
        onClearRecent={() => setRecent([])}
        title={
          destModal.which === 'from'
            ? 'Where are you flying from?'
            : 'Where are you flying to?'
        }
        apiBase={API_BASE}
      />

      {/* Passengers */}
      <PassengersSheet
        visible={showPax}
        passengers={passengers}
        onChange={setPassengers}
        onClose={() => setShowPax(false)}
      />

      {/* Filters */}
      <FiltersSheet
        visible={showFilters}
        filters={filters}
        extraToggles={extraToggles}
        onChangeFilters={setFilters}
        onChangeToggles={setExtraToggles}
        onReset={() => {
          setFilters(INITIAL_FILTERS);
          setExtraToggles({ breg: false, visa: false });
        }}
        onClose={() => setShowFilters(false)}
      />

      {/* Results overlay */}
      {resultsVisible && (
        <View style={styles.resultsOverlayWrap}>
          <ResultsOverlay
            offers={visibleOffers}
            loading={loadingOffers}
            titleText={tripHeaderText()}
            onBack={() => setResultsVisible(false)}
            onOpenDetails={(o) => {
              setSelectedOffer(o);
              setDetailsVisible(true);
            }}
            onOpenPriceChart={onOpenPriceChart}
            onOpenFilters={() => setShowFilters(true)}
            onOpenPassengers={() => setShowPax(true)}
          />
        </View>
      )}


      {/* Trip details modal */}
      <TripDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        selectedOffer={selectedOffer}
        tripType={tripType}
        legs={legs}
        fromLabel={from}
        toLabel={to}
        onBuy={buySelected}
        loading={validatingOffer}
      />

      {/* Price chart modal */}
      <PriceChartModal
        visible={priceChartVisible}
        onClose={() => setPriceChartVisible(false)}
        rows={priceRows}
      />
    </SafeAreaView>
  );
}

/* ------------------------------ styles ------------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E141C' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: TEXT,
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Raleway_700Regular',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scrollContent: { paddingBottom: 16 },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 32,
    marginRight: 8,
  },
  tabPillActive: { backgroundColor: TEXT },
  tabPillText: {
    color: TEXT,
    fontSize: 12,
    fontFamily: 'Raleway_400Regular',
  },
  tabPillTextActive: {
    color: '#0E141C',
    fontFamily: 'Raleway_700Regular',
  },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: '#0E141C' },
  segmentText: {
    color: SUBTLE,
    fontSize: 13,
    fontFamily: 'Raleway_400Regular',
  },
  segmentTextActive: {
    color: TEXT,
    fontFamily: 'Raleway_700Regular',
  },

  fromWhereToCard: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    marginTop: 12,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 0,
    borderColor: BORDER,
    position: 'relative',
  },
  labeledInputRow: { paddingVertical: 5 },
  labelSmall: {
    color: SUBTLE,
    fontSize: 11,
    marginBottom: 4,
    fontFamily: 'Raleway_400Regular',
  },
  inputField: {},
  inputText: {
    color: TEXT,
    fontSize: 16,
    fontFamily: 'Raleway_700Regular',
  },
  dividerLine: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 8,
  },
  swapBtn: {
    position: 'absolute',
    right: 30,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    marginTop: 12,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 0,
    borderColor: BORDER,
  },

  duoRowWrapper: { flexDirection: 'row', gap: 16 },
  duoField: { flex: 1, paddingVertical: 5 },
  duoValue: {
    color: TEXT,
    fontSize: 16,
    marginTop: 2,
    fontFamily: 'Raleway_700Regular',
  },
  inputDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 8,
  },
  passengersField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  passengersText: {
    color: TEXT,
    marginLeft: 8,
    fontSize: 16,
    flex: 1,
    fontFamily: 'Raleway_400Regular',
  },
  passengersCount: {
    color: SUBTLE,
    fontSize: 16,
    fontFamily: 'Raleway_400Regular',
  },

  filtersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  filtersCardText: {
    color: TEXT,
    fontSize: 16,
    fontFamily: 'Raleway_400Regular',
  },

  standaloneSearchBtn: {
    height: 48,
    borderRadius: RADIUS,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 10,
  },
  searchBtnText: {
    color: '#fff',
    fontFamily: 'Raleway_700Regular',
  },

  inputRow: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  multiCard: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginTop: 4,
    marginHorizontal: 12,
  },
  multiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  multiBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1A2340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiBadgeText: {
    color: TEXT,
    fontSize: 12,
    fontFamily: 'Raleway_700Regular',
  },
  labeledInput: {},
  addLegBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: INPUT_BG,
    marginTop: 10,
    marginHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addLegText: {
    color: TEXT,
    fontFamily: 'Raleway_700Regular',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  calContainer: {
    backgroundColor: '#1C2030',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    maxHeight: Math.min(width * 1.2, height * 0.85),
  },
  calTabs: {
    flexDirection: 'row',
    backgroundColor: '#0E141C',
  },
  calTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  calTabActive: { backgroundColor: ACCENT },
  calTabText: {
    color: SUBTLE,
    fontFamily: 'Raleway_400Regular',
  },
  calTabTextActive: {
    color: '#fff',
    fontFamily: 'Raleway_700Regular',
  },
  calendar: { backgroundColor: '#0E141C' },
  calConfirm: {
    backgroundColor: ACCENT,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24, // ⬅️ add this
    borderRadius: 12, // looks nicer floating
  },
  calConfirmText: {
    color: '#fff',
    fontFamily: 'Raleway_700Regular',
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 24,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    fontFamily: 'Raleway_700Regular',
  },
  ticketCard: {
    width: 200,
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginRight: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    color: TEXT,
    fontSize: 18,
    fontFamily: 'Raleway_700Regular',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 10,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  ticketLabel: {
    color: SUBTLE,
    fontSize: 12,
    fontFamily: 'Raleway_400Regular',
  },
  ticketSub: {
    color: TEXT,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Raleway_400Regular',
  },

  resultsOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },


  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  routeText: {
    color: TEXT,
    fontSize: 12,
    fontFamily: 'Raleway_400Regular',
  },
  routeActive: {
    color: TEXT,
    fontFamily: 'Raleway_700Regular',
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BORDER,
  },

  cityCard: {
    width: 180,
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    borderWidth: 6,
    borderColor: CARD_BG,
    marginRight: 12,
    overflow: 'hidden',
  },
  cityImg: { width: '100%', height: 112 },
  cityName: {
    color: TEXT,
    fontSize: 14,
    marginTop: 8,
    marginHorizontal: 10,
    fontFamily: 'Raleway_700Regular',
  },
  cityPrice: {
    color: SUBTLE,
    fontSize: 12,
    marginBottom: 10,
    marginHorizontal: 10,
    fontFamily: 'Raleway_400Regular',
  },
});
