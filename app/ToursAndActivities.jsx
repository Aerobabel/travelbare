// app/ToursAndActivities.jsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    PanResponder,
    Pressable,
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
const ACCENT = '#2F6BFF';
const TEXT = '#E9EEF8';
const SUBTLE = '#8A93A0';
const BORDER = '#283142';
const CARD_BG = '#121826';
const BG = '#0E141C';
const RADIUS = 14;
const APP_FONT = 'Raleway_400Regular';

// ---------- dummy data ----------
const CITY_BANK = [
  'Paris, France',
  'Amsterdam, Netherlands',
  'Rome, Italy',
  'London, United Kingdom',
  'Prague, Czechia',
  'Barcelona, Spain',
  'Vienna, Austria',
];

const EXPERIENCES = [
  {
    id: 'x1',
    title: 'Exploring Art at the Louvre Museum',
    city: 'Paris, France',
    badge: 'Guest Favourite',
    tag: 'Heritage Activity',
    rating: 4.8,
    reviews: 2522,
    price: 250,
    length: '1 day · 1 guest',
    cover:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1470&auto=format&fit=crop',
  },
  {
    id: 'x2',
    title: 'Sightseeing at the Eiffel Tower',
    city: 'Paris, France',
    badge: 'Guest Favourite',
    tag: 'Guided Tour',
    rating: 4.9,
    reviews: 4310,
    price: 500,
    length: '1 day · 1 guest',
    cover:
      'https://images.unsplash.com/photo-1522098543979-ffc7f79d7f6b?q=80&w=1470&auto=format&fit=crop',
  },
  {
    id: 'x3',
    title: 'Culinary Tour of French Cuisine',
    city: 'Paris, France',
    badge: 'Top Rated',
    tag: 'Food & Drink',
    rating: 4.7,
    reviews: 1389,
    price: 350,
    length: '1 day · 1 guest',
    cover:
      'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?q=80&w=1470&auto=format&fit=crop',
  },
];

// ---------- small utils ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- PriceSlider ----------
function PriceSlider({ min = 25, max = 950, value, onChange }) {
  const [trackW, setTrackW] = useState(0);
  const [active, setActive] = useState(false);

  const posFromVal = (v) => ((clamp(v, min, max) - min) / (max - min)) * trackW;
  const valFromPos = (x) =>
    clamp(min + ((max - min) * clamp(x, 0, trackW)) / Math.max(1, trackW), min, max);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setActive(true),
        onPanResponderMove: (_, g) => onChange(Math.round(valFromPos(posFromVal(value) + g.dx))),
        onPanResponderRelease: () => setActive(false),
      }),
    [trackW, value]
  );

  return (
    <View
      style={styles.rsWrap}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderStart={(e) => onChange(Math.round(valFromPos(e.nativeEvent.locationX)))}
    >
      <View style={styles.rsTrack} />
      <View style={[styles.rsRange, { left: 0, right: trackW ? trackW - posFromVal(value) : 0 }]} />
      <View
        style={[styles.rsThumb, { left: trackW ? posFromVal(value) - 12 : 0, top: -8 }, active && styles.rsThumbActive]}
        {...pan.panHandlers}
      />
    </View>
  );
}

// ---------- Location Modal ----------
function LocationModal({ open, onClose, onPick, recent }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const L = q.trim().toLowerCase();
    return CITY_BANK.filter((c) => c.toLowerCase().includes(L));
  }, [q]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: BORDER,
              backgroundColor: '#0F172A',
              paddingHorizontal: 12,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search city"
              placeholderTextColor={SUBTLE}
              autoFocus
              style={{ color: TEXT, fontSize: 16, fontFamily: APP_FONT }}
            />
          </View>
        </View>

        {q ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {results.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  onPick(c);
                  onClose();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <Ionicons name="location-outline" size={18} color={SUBTLE} style={{ marginRight: 10 }} />
                <Text style={{ color: TEXT, fontSize: 16, fontFamily: APP_FONT }}>{c}</Text>
              </TouchableOpacity>
            ))}
            {!results.length && (
              <Text style={{ color: SUBTLE, paddingHorizontal: 16, paddingTop: 12, fontFamily: APP_FONT }}>
                No matches
              </Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 10, fontFamily: APP_FONT }}>
              Recent Searches
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {recent.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    onPick(c);
                    onClose();
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: '#0F172A',
                    borderColor: BORDER,
                    borderWidth: 1,
                    borderRadius: 18,
                  }}
                >
                  <Text style={{ color: TEXT, fontWeight: '600', fontFamily: APP_FONT }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Filters Sheet (tap outside to close) ----------
function FiltersSheet({ open, onClose, onApply, initial }) {
  const [sel, setSel] = useState(initial);
  const toggleTag = (group, key) =>
    setSel((s) => ({ ...s, [group]: { ...s[group], [key]: !s[group][key] } }));

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      {/* Outer Pressable closes on outside tap */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Inner sheet; stop propagation */}
        <Pressable style={styles.filterSheet} onPress={() => {}}>
          <View style={styles.filterHeaderBar} />
          <Text style={styles.sheetTitle}>Filters</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Tours & experiences */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Tours & experiences</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['outdoor', 'Outdoor & sport activities', 'bicycle-outline'],
                  ['culture', 'Cultural experiences', 'color-palette-outline'],
                  ['massages', 'Massages', 'leaf-outline'],
                  ['water', 'Water activities', 'water-outline'],
                  ['adventure', 'Adventure', 'compass-outline'],
                  ['wellness', 'Wellness', 'heart-outline'],
                ].map(([k, label, icon]) => {
                  const active = sel.tours[k];
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => toggleTag('tours', k)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Ionicons name={icon} size={14} color={active ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Attraction tickets */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Attraction tickets</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['theme', 'Theme parks', 'sparkles-outline'],
                  ['indoor', 'Indoor games', 'game-controller-outline'],
                  ['museums', 'Museums', 'library-outline'],
                  ['waterpark', 'Water parks', 'boat-outline'],
                  ['cable', 'Cable cars', 'trail-sign-outline'],
                  ['historical', 'Historical sites', 'school-outline'],
                  ['zoo', 'Zoos & aquariums', 'paw-outline'],
                  ['events', 'Events & shows', 'mic-outline'],
                  ['gardens', 'Parks & gardens', 'leaf-outline'],
                  ['decks', 'Observation decks', 'eye-outline'],
                ].map(([k, label, icon]) => {
                  const active = sel.attractions[k];
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => toggleTag('attractions', k)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Ionicons name={icon} size={14} color={active ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time of day */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Time of day</Text>
              {['Morning', 'Afternoon', 'Evening & night'].map((t) => {
                const checked = sel.times[t];
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSel((s) => ({ ...s, times: { ...s.times, [t]: !checked } }))}
                    style={styles.checkRow}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={checked ? 'checkbox-outline' : 'square-outline'}
                      size={18}
                      color={checked ? ACCENT : SUBTLE}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.checkLabel}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Price range */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Price range</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.sliderCap}>Minimum</Text>
                <Text style={styles.sliderCap}>Maximum</Text>
              </View>
              <PriceSlider min={25} max={950} value={sel.price} onChange={(v) => setSel((s) => ({ ...s, price: v }))} />
              <Text style={{ color: TEXT, alignSelf: 'flex-end', marginTop: 6, fontFamily: APP_FONT }}>
                ${sel.price}
              </Text>
            </View>

            {/* Language */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Language</Text>
              {['English', 'French', 'Spanish', 'Italian', 'German'].map((t) => {
                const checked = sel.lang[t];
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSel((s) => ({ ...s, lang: { ...s.lang, [t]: !checked } }))}
                    style={styles.checkRow}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={checked ? 'checkbox-outline' : 'square-outline'}
                      size={18}
                      color={checked ? ACCENT : SUBTLE}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.checkLabel}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Toggles */}
            <View style={styles.group}>
              {[
                ['pickup', 'Hotel pickup included'],
                ['child', 'Child-friendly'],
                ['noFees', 'No extra booking fees'],
                ['custom', 'Customizable itinerary'],
                ['licensed', 'Licensed operator'],
                ['private', 'Private guide'],
              ].map(([k, label]) => {
                const on = sel.toggles[k];
                return (
                  <View key={k} style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>{label}</Text>
                    <TouchableOpacity
                      onPress={() => setSel((s) => ({ ...s, toggles: { ...s.toggles, [k]: !on } }))}
                      style={[styles.switch, on && styles.switchOn]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.knob, on && styles.knobOn]} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.filterBtns}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => setSel(initial)}>
                <Ionicons name="refresh" size={16} color={TEXT} />
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  onApply(sel);
                  onClose();
                }}
              >
                <Text style={styles.applyBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- Results Overlay ----------
function ResultsOverlay({ visible, onClose, items, onOpenDetails, headerText }) {
  if (!visible) return null;
  return (
    <View style={styles.resultsOverlay}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text
            style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: APP_FONT }}
          >
            {headerText}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {items.map((x) => (
            <TouchableOpacity key={x.id} activeOpacity={0.9} onPress={() => onOpenDetails(x)} style={styles.cardExp}>
              <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                <Image source={{ uri: x.cover }} style={{ width: '100%', height: 160 }} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{x.badge}</Text>
                </View>
                <TouchableOpacity style={styles.heartBtn}>
                  <Ionicons name="heart-outline" size={16} color={TEXT} />
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.smallTag}>{x.tag}</Text>
                <Text style={styles.expTitle} numberOfLines={2}>
                  {x.title}
                </Text>
                <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: APP_FONT }}>{x.city}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <View style={styles.ratingPill}>
                    <Text style={{ color: '#0E141C', fontWeight: '700', fontFamily: APP_FONT }}>{x.rating}</Text>
                  </View>
                  <Text style={{ color: SUBTLE, marginLeft: 6, fontFamily: APP_FONT }}>
                    Exceptional · ({x.reviews} reviews)
                  </Text>
                </View>

                <View
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}
                >
                  <View>
                    <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>
                      ${x.price.toFixed(2)}
                    </Text>
                    <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: APP_FONT }}>{x.length}</Text>
                  </View>
                  <TouchableOpacity style={styles.buyBtn}>
                    <Text style={styles.buyBtnText}>Buy tickets</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------- Details Sheet (safe area applied to content) ----------
function DetailsSheet({ open, onClose, item }) {
  return (
    <SafeAreaView>
    <Modal
      visible={open}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      hardwareAccelerated
    >
      {/* Dim overlay (no safe area here) */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* Content container gets the safe area */}
        <View style={{ flex: 1, backgroundColor: BG }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header comfortably below iOS status bar */}
            <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop:32 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </TouchableOpacity>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 16,
                  fontWeight: '700',
                  flex: 1,
                  textAlign: 'center',
                  fontFamily: APP_FONT,
                }}
              >
                Experience
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Image source={{ uri: item?.cover }} style={{ width: '100%', height: 220 }} />
              <View style={{ padding: 14 }}>
                <Text style={styles.smallTag}>{item?.tag || 'Experience'}</Text>
                <Text style={[styles.expTitle, { fontSize: 18, marginTop: 6 }]}>{item?.title}</Text>
                <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: APP_FONT }}>{item?.city}</Text>

                <View style={[styles.cardBox, { marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name="information-circle-outline" size={16} color={SUBTLE} />
                    <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>About the experience</Text>
                  </View>
                  <Text style={{ color: SUBTLE, lineHeight: 20, fontFamily: APP_FONT }}>
                    Visit iconic sights with a licensed guide. Explore hidden corners, enjoy priority
                    entry and learn fun facts. Small group options available.
                  </Text>
                </View>

                <View style={[styles.cardBox, { marginTop: 12 }]}>
                  <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: APP_FONT }}>
                    What’s included
                  </Text>
                  {['Priority entrance', 'Photo-friendly spots', 'Professional guide', 'Headset for groups'].map((t) => (
                    <View key={t} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
                      <Text style={{ color: SUBTLE, fontFamily: APP_FONT }}>{t}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.cardBox, { marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>Reviews</Text>
                    <Text style={{ color: SUBTLE, fontFamily: APP_FONT }}>{item?.reviews} total</Text>
                  </View>
                  {[
                    ['Guide & service', 4.9],
                    ['Organization', 4.8],
                    ['Value for money', 4.6],
                  ].map(([lab, val]) => (
                    <View key={lab} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
                      <Text style={{ color: SUBTLE, fontFamily: APP_FONT }}>{lab}</Text>
                      <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>{val}</Text>
                    </View>
                  ))}
                </View>

                <Text
                  style={{ color: TEXT, fontWeight: '700', marginTop: 14, marginBottom: 8, fontFamily: APP_FONT }}
                >
                  Similar Experiences
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {EXPERIENCES.slice(1).map((x) => (
                    <View key={x.id} style={styles.similarCard}>
                      <Image
                        source={{ uri: x.cover }}
                        style={{ width: '100%', height: 92, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                      />
                      <View style={{ padding: 10 }}>
                        <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }} numberOfLines={1}>
                          {x.title}
                        </Text>
                        <Text style={{ color: SUBTLE, fontSize: 12, marginTop: 2, fontFamily: APP_FONT }}>
                          {x.city}
                        </Text>
                        <Text style={{ color: TEXT, marginTop: 6, fontFamily: APP_FONT }}>${x.price.toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>
                  ${(item?.price ?? 0).toFixed(2)}
                </Text>
                <TouchableOpacity style={[styles.buyBtn, { paddingHorizontal: 18, height: 48, borderRadius: 12 }]}>
                  <Text style={styles.buyBtnText}>Get tickets</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
}

// ---------- Main ----------
export default function ToursAndActivities() {
  const router = useRouter();

  const [location, setLocation] = useState('Paris, France');
  const [date, setDate] = useState('12 Jun, Su');
  const [recent, setRecent] = useState(['Paris, France', 'Rome, Italy', 'Amsterdam, Netherlands']);

  const [locOpen, setLocOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const initialFilters = {
    tours: { outdoor: false, culture: false, massages: false, water: true, adventure: false, wellness: false },
    attractions: {
      theme: false,
      indoor: false,
      museums: false,
      waterpark: false,
      cable: false,
      historical: false,
      zoo: true,
      events: false,
      gardens: false,
      decks: false,
    },
    times: { Morning: false, Afternoon: true, 'Evening & night': false },
    price: 860,
    lang: { English: true, French: false, Spanish: false, Italian: false, German: false },
    toggles: { pickup: true, child: true, noFees: true, custom: false, licensed: true, private: false },
  };
  const [filters, setFilters] = useState(initialFilters);

  const calTheme = {
    backgroundColor: BG,
    calendarBackground: BG,
    textSectionTitleColor: SUBTLE,
    selectedDayBackgroundColor: ACCENT,
    selectedDayTextColor: '#fff',
    todayTextColor: '#FF5A5F',
    dayTextColor: TEXT,
    textDisabledColor: '#4A5463',
    arrowColor: TEXT,
    monthTextColor: TEXT,
  };

  const openResults = () => setResultsOpen(true);
  const openDetails = (item) => {
    setSelected(item);
    setDetailsOpen(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tours & Activities</Text>
        <View style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={20} color={TEXT} />
          <Ionicons name="ellipsis-vertical" size={18} color={TEXT} style={{ marginLeft: 12 }} />
        </View>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Top tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {[
            ['Transfers', 'swap-horizontal'],
            ['Cruises', 'boat-outline'],
            ['Tours & Activities', 'map-outline'],
          ].map(([label, icon]) => {
            const active = label === 'Tours & Activities';
            return (
              <TouchableOpacity key={label} activeOpacity={0.8} style={[styles.tabPill, active && styles.tabPillActive]}>
                <Ionicons name={icon} size={16} color={active ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
                <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Card */}
        <View style={styles.card}>
          {/* Location */}
          <View style={styles.labeledInput}>
            <Text style={styles.labelSmall}>Location</Text>
            <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => setLocOpen(true)}>
              <Text style={styles.inputText}>{location}</Text>
            </TouchableOpacity>
          </View>

          {/* Activity Date */}
          <View style={[styles.labeledInput, { marginTop: 10 }]}>
            <Text style={styles.labelSmall}>Activity date</Text>
            <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => setCalOpen(true)}>
              <Text style={styles.inputText}>{date}</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <TouchableOpacity
            style={[styles.inputRow, { marginTop: 10, height: 48, flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => setFiltersOpen(true)}
          >
            <Ionicons name="options-outline" size={18} color={SUBTLE} />
            <Text style={{ color: TEXT, marginLeft: 8, fontFamily: APP_FONT }}>Filters</Text>
          </TouchableOpacity>

          {/* Search */}
          <TouchableOpacity style={styles.searchBtn} onPress={openResults}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Section */}
        <Text style={styles.sectionTitle}>Best Experiences</Text>
        <Text style={{ color: SUBTLE, paddingHorizontal: 16, marginTop: -6, marginBottom: 8, fontFamily: APP_FONT }}>
          Browse, find and book cool activities
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {EXPERIENCES.map((x) => (
            <View key={x.id} style={styles.thumbCard}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => openDetails(x)}>
                <Image source={{ uri: x.cover }} style={styles.thumbImg} />
                <View style={styles.badgeSm}>
                  <Text style={styles.badgeText}>{x.badge}</Text>
                </View>
                <View style={{ padding: 10 }}>
                  <Text style={styles.smallTag}>{x.tag}</Text>
                  <Text style={styles.thumbTitle} numberOfLines={2}>
                    {x.title}
                  </Text>
                  <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: APP_FONT }}>{x.city}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <View style={styles.ratingPill}>
                      <Text style={{ color: '#0E141C', fontWeight: '700', fontFamily: APP_FONT }}>{x.rating}</Text>
                    </View>
                    <Text style={{ color: SUBTLE, marginLeft: 6, fontFamily: APP_FONT }}>
                      Exceptional · ({x.reviews} reviews)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <View>
                      <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>
                        ${x.price.toFixed(2)}
                      </Text>
                      <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: APP_FONT }}>{x.length}</Text>
                    </View>
                    <TouchableOpacity style={styles.buyBtn}>
                      <Text style={styles.buyBtnText}>Buy tickets</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Modals */}
      <LocationModal
        open={locOpen}
        onClose={() => setLocOpen(false)}
        onPick={(c) => {
          setLocation(c);
          setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 8));
        }}
        recent={recent}
      />

      {/* Calendar - outside tap closes */}
      <Modal visible={calOpen} animationType="slide" transparent onRequestClose={() => setCalOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setCalOpen(false)}>
          <Pressable style={styles.calContainer} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Select Date</Text>
            <Calendar
              style={styles.calendar}
              onDayPress={(d) => setDate(d.dateString)}
              markedDates={{ [date]: { selected: true } }}
              theme={calTheme}
              hideExtraDays={false}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={() => setCalOpen(false)}>
              <Text style={styles.applyBtnText}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} onApply={setFilters} initial={initialFilters} />

      <ResultsOverlay
        visible={resultsOpen}
        onClose={() => setResultsOpen(false)}
        items={EXPERIENCES}
        onOpenDetails={(x) => {
          setSelected(x);
          setDetailsOpen(true);
        }}
        headerText={`${location || 'Anywhere'} · ${date || 'Any date'}`}
      />

      <DetailsSheet open={detailsOpen} onClose={() => setDetailsOpen(false)} item={selected} />
    </SafeAreaView>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: TEXT, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', fontFamily: APP_FONT },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6 },
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
  tabPillText: { color: TEXT, fontSize: 12, fontFamily: APP_FONT },
  tabPillTextActive: { color: '#0E141C', fontWeight: '600', fontFamily: APP_FONT },

  // Card
  card: { backgroundColor: CARD_BG, borderRadius: RADIUS, marginTop: 12, marginHorizontal: 12, padding: 12, borderWidth: 1, borderColor: BORDER },
  labeledInput: {},
  labelSmall: { color: SUBTLE, fontSize: 11, marginBottom: 6, fontFamily: APP_FONT },
  inputRow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, justifyContent: 'center' },
  inputText: { color: TEXT, fontSize: 15, fontFamily: APP_FONT },

  // Buttons
  searchBtn: { height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontFamily: APP_FONT },

  // Section
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 10, paddingHorizontal: 16, fontFamily: APP_FONT },

  // Thumbs
  thumbCard: { width: 260, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, marginRight: 12, overflow: 'hidden' },
  thumbImg: { width: '100%', height: 140 },
  thumbTitle: { color: TEXT, fontWeight: '700', marginTop: 6, fontFamily: APP_FONT },

  // Badges
  badgeSm: { position: 'absolute', left: 10, top: 10, backgroundColor: '#ffffffdd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badge: { position: 'absolute', left: 10, top: 10, backgroundColor: '#ffffffdd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, zIndex: 2 },
  badgeText: { color: '#0E141C', fontWeight: '700', fontSize: 11, fontFamily: APP_FONT },

  ratingPill: { backgroundColor: TEXT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Buy
  buyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: ACCENT },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: APP_FONT },

  // Results card
  cardExp: { backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 12 },
  smallTag: { color: SUBTLE, fontSize: 12, fontFamily: APP_FONT },
  expTitle: { color: TEXT, fontWeight: '700', marginTop: 4, fontFamily: APP_FONT },

  heartBtn: { position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },

  // Results overlay
  resultsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG, zIndex: 20, elevation: 20 },

  // Overlay base
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

  // Filters sheet
  filterSheet: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8, paddingBottom: 24, maxHeight: Math.min(height * 0.9, 720) },
  filterHeaderBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A3247', marginTop: 6, marginBottom: 6 },
  sheetTitle: { color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 10, fontFamily: APP_FONT },

  group: { borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  groupTitle: { color: SUBTLE, fontSize: 12, marginBottom: 10, fontFamily: APP_FONT },

  pill: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, height: 34, backgroundColor: '#0E1523' },
  pillActive: { backgroundColor: TEXT, borderColor: TEXT },
  pillText: { color: TEXT, fontSize: 12, fontFamily: APP_FONT },
  pillTextActive: { color: '#0E141C', fontWeight: '700', fontFamily: APP_FONT },

  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkLabel: { color: TEXT, fontSize: 13, flex: 1, fontFamily: APP_FONT },

  sliderCap: { color: SUBTLE, fontSize: 12, fontFamily: APP_FONT },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel: { color: TEXT, fontSize: 13, fontFamily: APP_FONT },
  switch: { width: 50, height: 30, borderRadius: 16, backgroundColor: '#263149', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: ACCENT },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT, alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },

  filterBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16 },
  clearBtn: { height: 48, flex: 1, borderRadius: 12, backgroundColor: '#1a2133', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexDirection: 'row', gap: 8 },
  clearBtnText: { color: TEXT, fontWeight: '600', fontFamily: APP_FONT },
  applyBtn: { backgroundColor: ACCENT, borderRadius: 8, padding: 14, marginHorizontal: 16, marginTop: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontFamily: APP_FONT },

  // Calendar sheet
  calContainer: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden', maxHeight: width * 1.2 },
  calendar: { backgroundColor: BG },

  // slider visuals
  rsWrap: { height: 44, justifyContent: 'center' },
  rsTrack: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: BORDER, borderRadius: 2 },
  rsRange: { position: 'absolute', height: 4, backgroundColor: ACCENT, borderRadius: 2 },
  rsThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT },
  rsThumbActive: { transform: [{ scale: 1.05 }] },

  // details boxes
  cardBox: { backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12 },
  similarCard: {
    width: 160,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 10,
    overflow: 'hidden',
  },
});
