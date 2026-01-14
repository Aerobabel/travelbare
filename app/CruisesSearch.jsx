// app/CruisesSearch.jsx
// Cruises flow — search → results → details with destination/port/lines pickers & filters.
// Peer deps: expo, expo-router, react-native-calendars

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  //SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ---------------------- API base/helpers ---------------------- */
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://travelapi-34zi.onrender.com';
async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) url.searchParams.set(k, v.join(','));
    else url.searchParams.set(k, v);
  });
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('apiGet failed', err);
    throw err;
  }
}
async function apiPost(path, body = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('apiPost failed', err);
    throw err;
  }
}

/* -------------------------- theme / const --------------------------- */
const { height } = Dimensions.get('window');
const ACCENT = '#2F6BFF';
const TEXT = '#E9EEF8';
const SUBTLE = '#8A93A0';
const BORDER = '#283142';
const CARD_BG = '#121826';

const INITIAL_FILTERS = {
  classes: [],            // 'Luxury' | 'Premium' | 'Standard'
  price: [2000, 10000],
  duration: [],           // ['1-3','4-7','8-14','15-21','22+']
  perks: { pickup: false, wifi: false, shore: false, custom: false, dining: false }
};

/* -------------------------- tiny helpers --------------------------- */
const RatingPill = ({ score, reviews }) => (
  <View style={styles.ratingPill}>
    <Text style={styles.ratingPillScore}>{Number(score).toFixed(1)}</Text>
    <Text style={styles.ratingPillText}>Exceptional · {Number(reviews).toLocaleString()} reviews</Text>
  </View>
);

const Chip = ({ label, onRemove }) => (
  <View style={styles.chip}>
    <Text style={{ color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{label}</Text>
    {onRemove && (
      <TouchableOpacity onPress={onRemove} style={{ marginLeft: 6 }}>
        <Ionicons name="close" size={14} color={TEXT} />
      </TouchableOpacity>
    )}
  </View>
);

/* ----------------- RangeSlider (draggable, aligned) ----------------- */
function RangeSlider({ min, max, step = 50, values, onChange }) {
  const [trackW, setTrackW] = useState(0);
  const [lo, hi] = values;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const snap = (v) => Math.round(v / step) * step;
  const posFromVal = (v) => ((clamp(v) - min) / (max - min)) * trackW;
  const valFromPos = (x) => clamp(min + ((max - min) * x) / Math.max(1, trackW));
  const makePan = (which) => ({
    onStartShouldSetResponder: () => true,
    onResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      const target = snap(valFromPos(x));
      if (which === 'lo') onChange([Math.min(target, hi - step), hi]);
      else onChange([lo, Math.max(target, lo + step)]);
    }
  });
  return (
    <View style={styles.rsWrap} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
      {/* center the track and thumbs using top: '50%' + negative margins */}
      <View style={styles.rsTrack} />
      <View style={[styles.rsRange, { left: posFromVal(lo), right: trackW - posFromVal(hi) }]} />
      <View style={[styles.rsThumb, { left: posFromVal(lo) - 12 }]} {...makePan('lo')} />
      <View style={[styles.rsThumb, { left: posFromVal(hi) - 12 }]} {...makePan('hi')} />
    </View>
  );
}

/* -------- Generic checkbox list modal (top-level, stays above keyboard) -------- */
function MultiPickerModal({ open, onClose, title, items, selected = [], onSave, searchable = true }) {
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(selected);

  // normalize label & key for any backend object
  const labelOf = (x) => (x?.name ?? x?.title ?? String(x));
  const keyOf = (x) => (x?.slug ?? x?.code ?? x?.id ?? labelOf(x));

  const list = useMemo(() => {
    const all = Array.isArray(items) ? items : [];
    if (!q.trim()) return all;
    const s = q.trim().toLowerCase();
    return all.filter((x) => labelOf(x).toLowerCase().includes(s));
  }, [q, items]);

  const toggle = (x) => {
    const key = keyOf(x);
    setPick((p) => (p.includes(key) ? p.filter((i) => i !== key) : [...p, key]));
  };
  const isOn = (x) => pick.includes(keyOf(x));

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' }}
      >
        <View style={styles.sheetLarge}>
          <Text style={styles.sheetTitle}>{title}</Text>

          {searchable && (
            <View style={styles.searchField}>
              <TextInput
                placeholder={`Enter ${title.toLowerCase().replace('select ', '')} name`}
                placeholderTextColor={SUBTLE}
                value={q}
                onChangeText={setQ}
                style={{ color: TEXT }}
                returnKeyType="search"
              />
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetScroll}
          >
            {list.map((it, idx) => (
              <TouchableOpacity
                key={`${keyOf(it)}-${idx}`}
                style={styles.checkRowAir}
                onPress={() => toggle(it)}
              >
                <View style={[styles.checkbox, isOn(it) && styles.checkboxOn]}>
                  {isOn(it) && <Ionicons name="checkmark" size={14} color="#0E141C" />}
                </View>
                {it.logo && <Image source={{ uri: it.logo }} style={{ width: 20, height: 20, marginHorizontal: 8 }} />}
                <Text style={{ color: TEXT, flex: 1 }}>{labelOf(it)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sheetActionRow}>
            <TouchableOpacity style={styles.clearBtn} onPress={() => setPick([])}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBar, styles.flex1NoTop]} onPress={() => onSave(pick)}>
              <Text style={styles.primaryBarText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------- Filters Modal ------------------------- */
function FiltersModal({ open, onClose, values, onSave }) {
  const [v, setV] = useState(values);
  const toggleClass = (k) => setV((s) => ({ ...s, classes: s.classes.includes(k) ? s.classes.filter((x) => x !== k) : [...s.classes, k] }));
  const toggleDur = (k) => setV((s) => ({ ...s, duration: s.duration.includes(k) ? s.duration.filter((x) => x !== k) : [...s.duration, k] }));

  const chips = [...v.classes.map((c) => `• ${c}`), ...v.duration.map((d) => d.replace('-', '–') + ' days')];

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.overlay} /></TouchableWithoutFeedback>

      <View style={styles.sheetLarge}>
        <Text style={styles.sheetTitle}>Filters</Text>

        <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
          {!!chips.length && (
            <View style={{ marginTop: -2, marginBottom: 8 }}>
              <Text style={[styles.groupTitle, { marginBottom: 6 }]}>Your selections</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {chips.map((c, i) => <Chip key={`${c}-${i}`} label={c} />)}
              </View>
            </View>
          )}

          <Text style={styles.groupTitle}>Onboard Class</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {['Luxury', 'Premium', 'Standard'].map((c) => (
              <TouchableOpacity key={c} onPress={() => toggleClass(c)} style={[styles.classPill, v.classes.includes(c) && styles.classPillOn]}>
                <Text style={[styles.classPillText, v.classes.includes(c) && styles.classPillTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.groupTitle}>Price range</Text>
          <View style={styles.priceCaps}>
            <View style={styles.cap}><Text style={styles.capLabel}>Minimum</Text><Text style={styles.capValue}>${v.price[0]}</Text></View>
            <View style={styles.cap}><Text style={styles.capLabel}>Maximum</Text><Text style={styles.capValue}>${v.price[1]}</Text></View>
          </View>
          <RangeSlider min={2000} max={10000} step={50} values={v.price} onChange={(vals) => setV((s) => ({ ...s, price: vals }))} />

          <View style={{ height: 12 }} />
          <Text style={styles.groupTitle}>Duration of cruise</Text>
          {['1-3', '4-7', '8-14', '15-21', '22+'].map((d) => (
            <TouchableOpacity key={d} style={styles.checkRow} onPress={() => toggleDur(d)}>
              <View style={[styles.checkbox, v.duration.includes(d) && styles.checkboxOn]}>
                {v.duration.includes(d) && <Ionicons name="checkmark" size={14} color="#0E141C" />}
              </View>
              <Text style={styles.checkLabel}>{d === '22+' ? '22+ days' : d.replace('-', '–') + ' days'}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 6 }} />
          {[
            { k: 'pickup', label: 'Hotel pickup included' },
            { k: 'wifi', label: 'Wi-Fi onboard' },
            { k: 'shore', label: 'Shore excursions included' },
            { k: 'custom', label: 'Customizable itinerary' },
            { k: 'dining', label: 'Fine dining included' },
          ].map((p) => (
            <View key={p.k} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{p.label}</Text>
              <TouchableOpacity
                onPress={() => setV((s) => ({ ...s, perks: { ...s.perks, [p.k]: !s.perks[p.k] } }))}
                activeOpacity={0.8}
                style={[styles.switch, v.perks[p.k] && styles.switchOn]}
              >
                <View style={[styles.knob, v.perks[p.k] && styles.knobOn]} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.filterBtns}>
          <TouchableOpacity style={styles.clearBtn} onPress={() => setV(INITIAL_FILTERS)}>
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBar, styles.flex1NoTop]} onPress={() => onSave(v)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------- Sort modal --------------------------- */
function SortByModal({ open, onClose, value = 'Recommended', onSave }) {
  const opts = ['Recommended', 'Cheapest', 'Early arrival', 'Fastest'];
  const [pick, setPick] = useState(value);
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetSmall}>
          <Text style={styles.sheetTitle}>Sort by</Text>
          {opts.map((o) => (
            <TouchableOpacity key={o} onPress={() => setPick(o)} style={styles.radioRowTop}>
              <View style={[styles.radioOuter, pick === o && styles.radioOuterOn]}>
                {pick === o && <View style={styles.radioInner} />}
              </View>
              <Text style={{ color: TEXT }}>{o}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.primaryBar} onPress={() => onSave(pick)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------- Details screen (with back) -------------------- */
function CruiseDetails({ open, onClose, cruise }) {
  if (!cruise) return null;
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cruise Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
          <View style={{ margin: 12, borderRadius: 14, overflow: 'hidden' }}>
            <Image source={{ uri: cruise.img }} style={{ width: '100%', height: 160 }} />
          </View>
          <View style={styles.detailCard}>
            <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{cruise.title}</Text>
            <Text style={{ color: SUBTLE, marginTop: 2 }}>{cruise.city}</Text>
            <View style={{ height: 10 }} />
            <RatingPill score={cruise.rating} reviews={cruise.reviews} />
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>About this cruise</Text>
            <Text style={styles.detailBody}>
              Join an unforgettable cruise with premium cabins, world-class dining, and breathtaking views.
              Explore sun-kissed shores, vibrant cultures, and exclusive shore excursions designed for every guest.
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>What’s included</Text>
            {[
              'Hotel pickup, professional guide',
              'Wi-Fi onboard',
              'Shore excursions included',
              'Special gala dinner & shows',
              'Round-trip transfer from/to port',
            ].map((t, i) => (
              <View key={`${t}-${i}`} style={styles.detailBullet}>
                <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
                <Text style={styles.detailBulletText}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Ratings</Text>
            {[
              ['Overall', 9.6],
              ['Cleanliness', 9.3],
              ['Facilities', 9.1],
              ['Value for money', 9.0],
              ['Location', 9.2],
            ].map(([label, score]) => (
              <View key={label} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{label}</Text>
                  <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{score}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: BORDER, borderRadius: 3, marginTop: 6 }}>
                  <View style={{ width: `${(score / 10) * 100}%`, height: 6, backgroundColor: ACCENT, borderRadius: 3 }} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.detailFooter}>
          <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>${Number(cruise.price).toFixed(2)}</Text>
          <TouchableOpacity style={[styles.primaryBar, { flex: 1, marginTop: 0, marginLeft: 10 }]}>
            <Text style={styles.primaryBarText}>Book now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* -------------------------- Results screen -------------------------- */
function ResultsScreen({ open, onClose, onSort, onOpenFilters, onPick, sortValue, results = [] }) {
  const [fav, setFav] = useState({});
  if (!open) return null;
  return (
    <SafeAreaView style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#0E141C' }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cruise results</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 6, gap: 8 }}>
        <TouchableOpacity style={styles.resChip} onPress={onOpenFilters}>
          <Ionicons name="funnel-outline" size={14} color={TEXT} />
          <Text style={styles.resChipText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resChip} onPress={onSort}>
          <Ionicons name="swap-vertical" size={14} color={TEXT} />
          <Text style={styles.resChipText}>Sort</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resChip}>
          <Ionicons name="heart-outline" size={14} color={TEXT} />
          <Text style={styles.resChipText}>Favourites</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {results.map((c) => (
          <TouchableOpacity key={c.id} style={styles.resultCard} activeOpacity={0.9} onPress={() => onPick(c)}>
            <View style={{ position: 'absolute', top: 8, left: 12, zIndex: 2, flexDirection: 'row', gap: 6 }}>
              {(c.badges || []).map((b, i) => (
                <View key={`${c.id}-badge-${i}`} style={styles.badge}><Text style={styles.badgeText}>{b}</Text></View>
              ))}
            </View>
            <Image source={{ uri: c.img }} style={styles.resultImg} />
            <TouchableOpacity onPress={() => setFav((f) => ({ ...f, [c.id]: !f[c.id] }))} style={styles.heartBtn}>
              <Ionicons name={fav[c.id] ? 'heart' : 'heart-outline'} size={18} color={fav[c.id] ? ACCENT : '#fff'} />
            </TouchableOpacity>
            <View style={{ padding: 12 }}>
              <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{c.title}</Text>
              <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{c.city}</Text>
              <View style={{ height: 8 }} />
              <RatingPill score={c.rating} reviews={c.reviews} />
              {c.oldPrice ? <Text style={[styles.strike, { marginTop: 10 }]}>${Number(c.oldPrice).toFixed(2)}</Text> : <View style={{ height: 6 }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                <Text style={{ color: TEXT, fontWeight: '700', fontSize: 16, fontFamily: 'Raleway_400Regular' }}>${Number(c.price).toFixed(2)}</Text>
                <TouchableOpacity style={styles.buyBtn}>
                  <Text style={styles.buyBtnText}>Get tickets now</Text>
                </TouchableOpacity>
              </View>
              {!!c.days && <Text style={{ color: SUBTLE, fontSize: 12, marginTop: 6, fontFamily: 'Raleway_400Regular' }}>{c.days}</Text>}
            </View>
          </TouchableOpacity>
        ))}
        {results.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={{ color: SUBTLE }}>No cruises found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------ Main ------------------------------ */
export default function CruisesSearch() {
  const router = useRouter();

  // backend lists
  const [destinationsData, setDestinationsData] = useState([]);
  const [portsData, setPortsData] = useState([]);
  const [linesData, setLinesData] = useState([]);

  // selected (store backend keys)
  const [destination, setDestination] = useState([]); // slugs
  const [port, setPort] = useState([]);               // codes
  const [date, setDate] = useState(null);
  const [lines, setLines] = useState([]);             // line ids
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // modals
  const [destOpen, setDestOpen] = useState(false);
  const [portOpen, setPortOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [linesOpen, setLinesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // results / details
  const [resultsOpen, setResultsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState('Recommended');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // recommended
  const [recommended, setRecommended] = useState([]);
  const [results, setResults] = useState([]);

  // fetch backend lists + recommended
  useEffect(() => {
    (async () => {
      try {
        const [d, p, l, r] = await Promise.all([
          apiGet('/cruises/destinations'),
          apiGet('/cruises/ports'),
          apiGet('/cruises/lines'),
          apiGet('/cruises/recommended'),
        ]);
        setDestinationsData(d?.destinations ?? []);
        setPortsData(p?.ports ?? []);
        setLinesData(l?.lines ?? []);
        setRecommended(r?.cruises ?? []);
      } catch (e) {
        setDestinationsData([]); setPortsData([]); setLinesData([]); setRecommended([]);
      }
    })();
  }, []);

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

  const selectionsCount =
    destination.length + port.length + lines.length + filters.classes.length + filters.duration.length +
    (filters.perks.pickup||filters.perks.wifi||filters.perks.shore||filters.perks.custom||filters.perks.dining ? 1 : 0);

  // Search -> backend
  const runSearch = async () => {
    try {
      const sortMap = { 'Recommended': 'rec', 'Cheapest': 'cheap', 'Fastest': 'fast', 'Early arrival': 'early' };
      const payload = {
        destinations: destination,  // slugs
        ports: port,                // codes
        date,
        lines,                      // ids
        filters,
        sort: sortMap[sortValue] || 'rec',
      };
      const data = await apiPost('/cruises/search', payload);
      setResults(data?.cruises || []);
      setResultsOpen(true);
    } catch (e) {
      setResults([]);
      setResultsOpen(true);
    }
  };

  // helpers to show counts
  const labelFromKeys = (keys, all, keyField) => {
    const set = new Set(keys);
    const names = all.filter((x) => set.has(x[keyField])).map((x) => x.name);
    return names.length ? `${names.length} selected` : null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cruises</Text>
        <View style={styles.headerRight}>
          <Ionicons name="boat-outline" size={18} color={TEXT} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            ['Cruises', 'boat-outline', true],
            ['Tours & Activities', 'map-outline', false],
            ['eSIM', 'phone-portrait-outline', false],
            ['Insurance', 'shield-checkmark-outline', false],
          ].map(([label, icon, active]) => (
            <View key={label} style={[styles.tabPill, active && styles.tabPillActive]}>
              <Ionicons name={icon} size={16} color={active ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
              <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Search card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.selectorRow} onPress={() => setDestOpen(true)}>
            <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>
              {labelFromKeys(destination, destinationsData, 'slug') || 'Select destination'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectorRow} onPress={() => setPortOpen(true)}>
            <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>
              {labelFromKeys(port, portsData, 'code') || 'Select departure port'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectorRow} onPress={() => setDateOpen(true)}>
            <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{date || 'Select date'}</Text>
            <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectorRow} onPress={() => setLinesOpen(true)}>
            <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>
              {labelFromKeys(lines, linesData, 'id') || 'All cruise lines'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.selectorRow, { marginBottom: 10 }]} onPress={() => setFiltersOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="funnel-outline" size={16} color={SUBTLE} style={{ marginRight: 8 }} />
              <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>
                Filters{selectionsCount ? ` • ${selectionsCount}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBar} onPress={runSearch}>
            <Text style={styles.primaryBarText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended cruises from backend */}
        <Text style={styles.sectionTitle}>Recommended Cruises</Text>
        <Text style={{ color: SUBTLE, marginTop: -6, paddingHorizontal: 16, fontFamily: 'Raleway_400Regular' }}>
          Discover our top cruise picks now
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {recommended.map((c) => (
            <View key={c.id} style={styles.recoCard}>
              <Image source={{ uri: c.img }} style={{ width: 220, height: 120 }} />
              <View style={{ padding: 10 }}>
                <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }} numberOfLines={1}>{c.title}</Text>
                <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{c.city}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>${Number(c.price).toFixed(2)}</Text>
                  <TouchableOpacity style={styles.buyBtn}><Text style={styles.buyBtnText}>Book now</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          {recommended.length === 0 && (
            <View style={[styles.recoCard, { width: 220, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: SUBTLE }}>No recommendations yet.</Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>

      {/* pickers — all from backend, store keys */}
      <MultiPickerModal
        open={destOpen}
        onClose={() => setDestOpen(false)}
        title="Select Destination"
        items={destinationsData}
        selected={destination}
        onSave={(keys) => { setDestination(keys); setDestOpen(false); }}
      />
      <MultiPickerModal
        open={portOpen}
        onClose={() => setPortOpen(false)}
        title="Select Departure Port"
        items={portsData}
        selected={port}
        onSave={(keys) => { setPort(keys); setPortOpen(false); }}
      />
      <MultiPickerModal
        open={linesOpen}
        onClose={() => setLinesOpen(false)}
        title="Select Cruise Line"
        items={linesData}
        selected={lines}
        onSave={(keys) => { setLines(keys); setLinesOpen(false); }}
      />

      {/* Date modal (single date) */}
      <Modal visible={dateOpen} animationType="slide" onRequestClose={() => setDateOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 8, fontFamily: 'Raleway_400Regular' }}>Select date</Text>
          </View>
          <Calendar
            style={{ backgroundColor: '#0E141C' }}
            onDayPress={(d) => setDate(d.dateString)}
            markedDates={date ? { [date]: { selected: true } } : {}}
            theme={calTheme}
          />
          <View style={{ padding: 16 }}>
            <TouchableOpacity style={styles.primaryBar} onPress={() => setDateOpen(false)}>
              <Text style={styles.primaryBarText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Filters */}
      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        values={filters}
        onSave={(v) => { setFilters(v); setFiltersOpen(false); }}
      />

      {/* Results */}
      <ResultsScreen
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        onOpenFilters={() => setFiltersOpen(true)}
        onSort={() => setSortOpen(true)}
        sortValue={sortValue}
        results={results}
        onPick={(item) => { setDetailItem(item); setDetailOpen(true); }}
      />
      <SortByModal open={sortOpen} onClose={() => setSortOpen(false)} value={sortValue} onSave={(v) => { setSortValue(v); setSortOpen(false); }} />
      <CruiseDetails open={detailOpen} onClose={() => setDetailOpen(false)} cruise={detailItem} />
    </SafeAreaView>
  );
}

/* --------------------------- Styles --------------------------- */
const RADIUS = 14;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E141C' },

  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: TEXT, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6, gap: 8 },
  tabPill: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, height: 32 },
  tabPillActive: { backgroundColor: TEXT, fontFamily: 'Raleway_400Regular' },
  tabPillText: { color: TEXT, fontSize: 12, marginRight: 8, fontFamily: 'Raleway_400Regular' },
  tabPillTextActive: { color: '#0E141C', fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  card: { backgroundColor: CARD_BG, borderRadius: RADIUS, marginTop: 12, marginHorizontal: 12, padding: 12, borderWidth: 1, borderColor: BORDER },

  selectorRow: { height: 48, borderRadius: 10, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 10, paddingHorizontal: 16, fontFamily: 'Raleway_400Regular' },

  primaryBar: { height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryBarText: { color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  flex1NoTop: { flex: 1, marginTop: 0 },

  // chips / pills
  classPill: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  classPillOn: { backgroundColor: TEXT, borderColor: TEXT, fontFamily: 'Raleway_400Regular' },
  classPillText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  classPillTextOn: { color: '#0E141C', fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },

  // checkbox rows
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkRowAir: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  checkLabel: { color: TEXT, fontSize: 13, marginLeft: 10, flex: 1, fontFamily: 'Raleway_400Regular' },

  checkbox: { width: 18, height: 18, borderRadius: 4, backgroundColor: '#1a2133', borderWidth: 1, borderColor: BORDER, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: ACCENT, borderColor: ACCENT },

  // toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel: { color: TEXT, fontSize: 13, fontFamily: 'Raleway_400Regular' },
  switch: { width: 50, height: 30, borderRadius: 16, backgroundColor: '#263149', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: ACCENT },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT, alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },

  priceCaps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cap: { width: '48%', backgroundColor: '#0E1523', borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 10 },
  capLabel: { color: SUBTLE, fontSize: 11, marginBottom: 4, fontFamily: 'Raleway_400Regular' },
  capValue: { color: TEXT, fontSize: 14, fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  // overlay sheets
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetSmall: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16, maxHeight: Math.min(height * 0.8, 520) },
  sheetLarge: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, maxHeight: Math.min(height * 0.9, 720) },
  sheetTitle: { color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 10, fontFamily: 'Raleway_400Regular' },

  // scroll padding so sticky bar never overlaps content
  sheetScroll: { paddingBottom: 96 },

  // sticky action bars for modals
  sheetActionRow: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 10 },
  filterBtns: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 10 },

  // action buttons
  clearBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1523' },
  clearBtnText: { color: SUBTLE, fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  searchField: { height: 44, borderRadius: 10, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, justifyContent: 'center', marginBottom: 10 },

  // results list
  resChip: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD_BG, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  resChipText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },

  resultCard: { marginHorizontal: 12, marginTop: 12, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  resultImg: { width: '100%', height: 150 },
  heartBtn: { position: 'absolute', top: 10, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: '#2b3d70', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  badgeText: { color: '#CDE1FF', fontSize: 10, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  strike: { color: SUBTLE, textDecorationLine: 'line-through', marginBottom: 2 },

  buyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: ACCENT },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Raleway_400Regular' },

  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#132146', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  ratingPillScore: { color: '#AEDAFF', fontWeight: '800', marginRight: 6, fontFamily: 'Raleway_400Regular' },
  ratingPillText: { color: '#AEDAFF', fontSize: 11, fontFamily: 'Raleway_400Regular' },

  // details
  detailCard: { backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, padding: 12, marginHorizontal: 12, marginTop: 10 },
  detailTitle: { color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: 'Raleway_400Regular' },
  detailBody: { color: SUBTLE, lineHeight: 20 },
  detailBullet: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  detailBulletText: { color: TEXT, marginLeft: 10, fontFamily: 'Raleway_400Regular' },

  similarCard: { width: 180, backgroundColor: CARD_BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, marginRight: 10, overflow: 'hidden' },
  detailFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#0E141C', flexDirection: 'row', alignItems: 'center' },

  // recommended row
  recoCard: { width: 220, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, marginRight: 12, overflow: 'hidden' },

  // Range slider visuals (center line + thumbs)
  rsWrap: { height: 44 },
  rsTrack: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: BORDER, borderRadius: 2, top: '50%', marginTop: -2 },
  rsRange: { position: 'absolute', height: 4, backgroundColor: ACCENT, borderRadius: 2, top: '50%', marginTop: -2 },
  rsThumb: { position: 'absolute', top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT },

  // radio styles (Sort modal)
  radioRowTop: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  radioOuterOn: { borderColor: ACCENT },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },

  groupTitle: { color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: 'Raleway_400Regular' },
});



