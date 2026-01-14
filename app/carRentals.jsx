// app/CarRentals.jsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
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
const APP_FONT = 'Raleway_400Regular';
const RADIUS = 14;

// ---------- global top tabs ----------
const TOP_TABS = [
  { key: 'Plane',     label: 'Plane Tickets', icon: 'airplane-outline' },
  { key: 'Hotels',    label: 'Hotels',        icon: 'bed-outline' },
  { key: 'Train',     label: 'Train Tickets', icon: 'train-outline' },
  { key: 'Bus',       label: 'Bus Tickets',   icon: 'bus-outline' },
  { key: 'Transfers', label: 'Transfers',     icon: 'swap-horizontal' },
  { key: 'Cruises',   label: 'Cruises',       icon: 'boat-outline' },
  { key: 'Tours',     label: 'Tours',         icon: 'map-outline' },
  { key: 'Car',       label: 'Car Rentals',   icon: 'car-outline' }, // <-- highlighted
];

// ---------- dummy data ----------
const CITY_BANK = [
  'SKQ Airport, Terminal D',
  'SKQ Airport, Terminal C',
  'Manchester Airport',
  'Heathrow Airport, T5',
  'Charles de Gaulle, T2',
  'Berlin Brandenburg, T1',
];

const CARS = [
  {
    id: 'c1',
    title: 'Fiat 500',
    type: 'or similar | Saloon',
    price: 13.0,
    features: ['Manual control', 'Air conditioning'],
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1b?q=80&w=1600&auto=format&fit=crop',
    ],
    badge: 'Guest Favourite',
  },
  {
    id: 'c2',
    title: 'Renault Clio',
    type: 'or similar | Saloon',
    price: 14.32,
    features: ['Manual control', 'Air conditioning', 'Bluetooth sound system'],
    images: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1b?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?q=80&w=1600&auto=format&fit=crop',
    ],
    badge: 'Good Choice',
  },
];

// ---------- small utils ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = [0, 10, 20, 30, 40, 50];

// ---------- One-ended price slider ----------
function PriceSlider({ min = 15, max = 3000, value, onChange }) {
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
function LocationModal({ open, onClose, onPick, label = 'Pickup point' }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    if (!q.trim()) return CITY_BANK;
    const L = q.trim().toLowerCase();
    return CITY_BANK.filter((c) => c.toLowerCase().includes(L));
  }, [q]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, marginTop:35 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
        <View style={styles.searchBar}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={`Search ${label.toLowerCase()}`}
              placeholderTextColor={SUBTLE}
              autoFocus
              style={{ color: TEXT, fontSize: 16, fontFamily: APP_FONT }}
            />
          </View>
        </View>

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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Time Wheel ----------
function TimeWheel({ open, onClose, hour, minute, onChange }) {
  if (!open) return null;
  return (
    <Pressable style={styles.timeOverlay} onPress={onClose}>
      <Pressable style={styles.timeWheel} onPress={() => {}}>
        <Text style={styles.timeWheelTitle}>Pick a time</Text>
        <View style={styles.wheelRow}>
          <FlatList
            data={hours}
            keyExtractor={(i) => `h-${i}`}
            showsVerticalScrollIndicator={false}
            style={{ height: 180, width: 80 }}
            contentContainerStyle={{ paddingVertical: 60 }}
            getItemLayout={(_, index) => ({ length: 36, offset: 36 * index, index })}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.wheelItem} onPress={() => onChange(item, minute)}>
                <Text style={[styles.wheelText, item === hour && styles.wheelTextActive]}>{pad2(item)}</Text>
              </TouchableOpacity>
            )}
          />
          <Text style={[styles.wheelText, { opacity: 0.6, width: 12 }]}>:</Text>
          <FlatList
            data={minutes}
            keyExtractor={(i) => `m-${i}`}
            showsVerticalScrollIndicator={false}
            style={{ height: 180, width: 80 }}
            contentContainerStyle={{ paddingVertical: 60 }}
            getItemLayout={(_, index) => ({ length: 36, offset: 36 * index, index })}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.wheelItem} onPress={() => onChange(hour, item)}>
                <Text style={[styles.wheelText, item === minute && styles.wheelTextActive]}>{pad2(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Pressable>
    </Pressable>
  );
}

// ---------- Date + Time Modal ----------
function DateModal({ open, onClose, date, setDate, time, setTime }) {
  const [wheelOpen, setWheelOpen] = useState(false);

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

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.calContainer} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Select Date and Time</Text>
          <Calendar
            style={styles.calendar}
            onDayPress={(d) => setDate(d.dateString)}
            markedDates={{ [date]: { selected: true } }}
            theme={calTheme}
            hideExtraDays={false}
          />
          <TouchableOpacity style={styles.pickupRow} onPress={() => setWheelOpen(true)}>
            <Text style={styles.pickupLabel}>Pickup Time</Text>
            <View style={styles.pickupPill}>
              <Text style={styles.pickupPillText}>{pad2(time.h)}:{pad2(time.m)}</Text>
              <Ionicons name="chevron-down" size={14} color={TEXT} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
            <Text style={styles.applyBtnText}>Confirm</Text>
          </TouchableOpacity>

          <TimeWheel
            open={wheelOpen}
            onClose={() => setWheelOpen(false)}
            hour={time.h}
            minute={time.m}
            onChange={(h, m) => setTime({ h, m })}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- Filters Sheet ----------
function FiltersSheet({ open, onClose, onApply, initial }) {
  const [sel, setSel] = useState(initial);
  const toggle = (group, key) => setSel((s) => ({ ...s, [group]: { ...s[group], [key]: !s[group][key] } }));

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.filterSheet} onPress={() => {}}>
          <View style={styles.filterHeaderBar} />
          <Text style={styles.sheetTitle}>Filters</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Vehicle type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['family', 'Family car', 'car-outline'],
                  ['sedan', 'Sedan', 'car-sport-outline'],
                  ['suv', 'SUV', 'car-outline'],
                ].map(([k, label, icon]) => {
                  const active = sel.types[k];
                  return (
                    <TouchableOpacity key={k} onPress={() => toggle('types', k)} style={[styles.pill, active && styles.pillActive]}>
                      <Ionicons name={icon} size={14} color={active ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupTitle}>Features</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['auto', 'Automatic transmission', 'cog-outline'],
                  ['manual', 'Manual control', 'swap-vertical-outline'],
                  ['ac', 'Air conditioning', 'snow-outline'],
                  ['bt', 'Bluetooth sound system', 'musical-notes-outline'],
                ].map(([k, label, icon]) => {
                  const active = sel.features[k];
                  return (
                    <TouchableOpacity key={k} onPress={() => toggle('features', k)} style={[styles.pill, active && styles.pillActive]}>
                      <Ionicons name={icon} size={14} color={active ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupTitle}>Minimum age of the primary driver</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[18, 19, 20, 21, 22, 23].map((a) => {
                  const active = sel.age === a;
                  return (
                    <TouchableOpacity key={a} onPress={() => setSel((s) => ({ ...s, age: a }))} style={[styles.pill, active && styles.pillActive]}>
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{a} years</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupTitle}>Price range</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.sliderCap}>Minimum</Text>
                <Text style={styles.sliderCap}>Maximum</Text>
              </View>
              <PriceSlider min={15} max={3000} value={sel.price} onChange={(v) => setSel((s) => ({ ...s, price: v }))} />
              <Text style={{ color: TEXT, alignSelf: 'flex-end', marginTop: 6, fontFamily: APP_FONT }}>${sel.price}</Text>
            </View>

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

// ---------- Results ----------
function ResultsOverlay({ visible, onClose, items, onOpenDetails, headerText }) {
  if (!visible) return null;
  return (
    <View style={styles.resultsOverlay}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={onClose} style={styles.topLeftBtn}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{headerText}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {items.map((x) => (
            <TouchableOpacity key={x.id} activeOpacity={0.9} onPress={() => onOpenDetails(x)} style={styles.cardExp}>
              <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                <Image source={{ uri: x.images[0] }} style={{ width: '100%', height: 160 }} />
                <View style={styles.badge}><Text style={styles.badgeText}>{x.badge}</Text></View>
                <TouchableOpacity style={styles.heartBtn}><Ionicons name="heart-outline" size={16} color={TEXT} /></TouchableOpacity>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.expTitle}>{x.title}</Text>
                <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: APP_FONT }}>{x.type}</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {x.features.map((f) => (
                    <View key={f} style={styles.featureChip}>
                      <Text style={styles.featureChipText}>{f}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <View>
                    <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>${x.price.toFixed(2)}</Text>
                    <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: APP_FONT }}>1 day</Text>
                  </View>
                  <TouchableOpacity style={styles.buyBtn}><Text style={styles.buyBtnText}>Book now</Text></TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------- Details with carousel ----------
function DetailsSheet({ open, onClose, item, dateLabel }) {
  if (!open) return null;
  return (
    <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View style={styles.topbar}>
            <TouchableOpacity onPress={onClose} style={styles.topLeftBtn}>
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>{item?.title ?? 'Car'}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: '100%', height: 230 }}>
              {item?.images?.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={{ width, height: 230 }} />
              ))}
            </ScrollView>

            <View style={{ padding: 14 }}>
              <Text style={[styles.expTitle, { fontSize: 20 }]}>{item?.title}</Text>
              <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: APP_FONT }}>{item?.type}</Text>

              <View style={[styles.cardBox, { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={{ color: TEXT, fontFamily: APP_FONT }}>{dateLabel}</Text>
                <Ionicons name="time-outline" size={16} color={SUBTLE} />
              </View>

              <View style={[styles.cardBox, { marginTop: 12 }]}>
                <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: APP_FONT }}>Features</Text>
                {item?.features?.map((f) => (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
                    <Text style={{ color: SUBTLE, fontFamily: APP_FONT }}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.cardBox, { marginTop: 12 }]}>
                <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: APP_FONT }}>Offers for you</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={styles.offerPill}><Text style={styles.offerPillText}>Free cancellation</Text></View>
                  <View style={styles.offerPill}><Text style={styles.offerPillText}>Pay at pickup</Text></View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>
                ${(item?.price ?? 0).toFixed(2)} <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: APP_FONT }}>/ day</Text>
              </Text>
              <TouchableOpacity style={[styles.buyBtn, { paddingHorizontal: 18, height: 48, borderRadius: 12 }]}>
                <Text style={styles.buyBtnText}>Book now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Main ----------
export default function CarRentals() {
  const router = useRouter();

  const [majorTab, setMajorTab] = useState('Cars'); // Cars | Trucks
  const [pickup, setPickup] = useState('SKQ Airport, Terminal D');
  const [returnPoint, setReturnPoint] = useState('');
  const [locOpen, setLocOpen] = useState(false);
  const [locWhich, setLocWhich] = useState('pickup');

  const [dateOpen, setDateOpen] = useState(false);
  const [date, setDate] = useState('2025-06-12');
  const [time, setTime] = useState({ h: 12, m: 10 });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const initialFilters = {
    types: { family: true, sedan: false, suv: false },
    features: { auto: false, manual: true, ac: true, bt: false },
    age: 18,
    price: 3000,
  };
  const [filters, setFilters] = useState(initialFilters);

  const headerDateText = `${date} • ${pad2(time.h)}:${pad2(time.m)}`;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Added header with chevron back and title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Car Rentals</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        
        {/* Global nav tabs (Car Rentals highlighted) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}
        >
          {TOP_TABS.map((t) => {
            const active = t.key === 'Car';
            return (
              <TouchableOpacity key={t.key} activeOpacity={0.9} style={[styles.topTab, active && styles.topTabActive]}>
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={active ? '#0E141C' : TEXT}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.topTabText, active && styles.topTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Major switch: Cars / Trucks */}
        <View style={styles.majorSwitch}>
          {['Cars', 'Trucks'].map((label, i) => {
            const active = majorTab === label;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setMajorTab(label)}
                style={[styles.majorBtn, active && styles.majorBtnActive, i === 0 && { borderTopRightRadius: 0, borderBottomRightRadius: 0 }, i === 1 && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
              >
                <Text style={[styles.majorBtnText, active && styles.majorBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Card */}
        <View style={styles.card}>
          {/* Pickup */}
          <View style={styles.labeledInput}>
            <Text style={styles.labelSmall}>Pickup point</Text>
            <TouchableOpacity
              style={styles.inputRow}
              activeOpacity={0.9}
              onPress={() => {
                setLocWhich('pickup');
                setLocOpen(true);
              }}
            >
              <Text style={styles.inputText}>{pickup}</Text>
              <TouchableOpacity
                onPress={() => {
                  const a = pickup;
                  setPickup(returnPoint || a);
                  setReturnPoint(a);
                }}
                style={styles.swapBtn}
              >
                <Ionicons name="swap-vertical" size={18} color={TEXT} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Return */}
          <View style={[styles.labeledInput, { marginTop: 10 }]}>
            <Text style={styles.labelSmall}>Return point?</Text>
            <TouchableOpacity
              style={styles.inputRow}
              activeOpacity={0.9}
              onPress={() => {
                setLocWhich('return');
                setLocOpen(true);
              }}
            >
              <Text style={styles.inputText}>{returnPoint || '—'}</Text>
            </TouchableOpacity>
          </View>

          {/* When */}
          <View style={[styles.labeledInput, { marginTop: 10 }]}>
            <Text style={styles.labelSmall}>When?</Text>
            <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => setDateOpen(true)}>
              <Text style={styles.inputText}>{headerDateText}</Text>
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

          {/* CTA */}
          <TouchableOpacity style={styles.searchBtn} onPress={() => setResultsOpen(true)}>
            <Text style={styles.searchBtnText}>Show offers</Text>
          </TouchableOpacity>
        </View>

        {/* Nearby */}
        <Text style={styles.sectionTitle}>Available cars and trucks nearby</Text>
        <Text style={{ color: SUBTLE, paddingHorizontal: 16, marginTop: -6, marginBottom: 8, fontFamily: APP_FONT }}>
          The perfect vehicles for your next trip
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {CARS.map((x) => (
            <View key={x.id} style={styles.thumbCard}>
              <Image source={{ uri: x.images[0] }} style={styles.thumbImg} />
              <View style={styles.badgeSm}><Text style={styles.badgeText}>{x.badge}</Text></View>
              <View style={{ padding: 10 }}>
                <Text style={styles.expTitle}>{x.title}</Text>
                <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: APP_FONT }}>{x.type}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {x.features.slice(0, 2).map((f) => (
                    <View key={f} style={styles.featureChip}>
                      <Text style={styles.featureChipText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <View>
                    <Text style={{ color: TEXT, fontWeight: '700', fontFamily: APP_FONT }}>${x.price.toFixed(2)}</Text>
                    <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: APP_FONT }}>1 day</Text>
                  </View>
                  <TouchableOpacity style={styles.buyBtn}><Text style={styles.buyBtnText}>Book now</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Modals */}
      <LocationModal
        open={locOpen}
        onClose={() => setLocOpen(false)}
        onPick={(c) => (locWhich === 'pickup' ? setPickup(c) : setReturnPoint(c))}
        label={locWhich === 'pickup' ? 'Pickup point' : 'Return point'}
      />
      <DateModal open={dateOpen} onClose={() => setDateOpen(false)} date={date} setDate={setDate} time={time} setTime={setTime} />
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} onApply={setFilters} initial={initialFilters} />

      <ResultsOverlay
        visible={resultsOpen}
        onClose={() => setResultsOpen(false)}
        items={CARS}
        onOpenDetails={(x) => {
          setSelected(x);
          setDetailsOpen(true);
        }}
        headerText={`${pickup}  •  ${date}  ${pad2(time.h)}:${pad2(time.m)}`}
      />

      <DetailsSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        item={selected}
        dateLabel={`${date}  ${pad2(time.h)}:${pad2(time.m)}`}
      />
    </SafeAreaView>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: TEXT, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', fontFamily: APP_FONT },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  // global nav tabs (top row)
  topTab: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, height: 32, marginRight: 8, backgroundColor: '#0E1523' },
  topTabActive: { backgroundColor: TEXT, borderColor: TEXT },
  topTabText: { color: TEXT, fontSize: 12, fontFamily: APP_FONT },
  topTabTextActive: { color: '#0E141C', fontWeight: '700', fontFamily: APP_FONT },

  // major Cars/Trucks switch
  majorSwitch: { flexDirection: 'row', marginHorizontal: 12, marginTop: 6, borderRadius: 12, overflow: 'hidden', borderColor: BORDER, borderWidth: 1, backgroundColor: '#0E1523' },
  majorBtn: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  majorBtnActive: { backgroundColor: '#1B2333' },
  majorBtnText: { color: TEXT, fontSize: 13, fontFamily: APP_FONT },
  majorBtnTextActive: { color: TEXT, fontWeight: '700', fontFamily: APP_FONT },

  card: { backgroundColor: CARD_BG, borderRadius: RADIUS, marginTop: 12, marginHorizontal: 12, padding: 12, borderWidth: 1, borderColor: BORDER },
  labeledInput: {},
  labelSmall: { color: SUBTLE, fontSize: 11, marginBottom: 6, fontFamily: APP_FONT },
  inputRow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, justifyContent: 'center' },
  inputText: { color: TEXT, fontSize: 15, fontFamily: APP_FONT },
  swapBtn: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C2740', alignItems: 'center', justifyContent: 'center', borderColor: BORDER, borderWidth: 1 },

  searchBtn: { height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontFamily: APP_FONT },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 10, paddingHorizontal: 16, fontFamily: APP_FONT },

  thumbCard: { width: 260, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, marginRight: 12, overflow: 'hidden' },
  thumbImg: { width: '100%', height: 140 },

  badgeSm: { position: 'absolute', left: 10, top: 10, backgroundColor: '#ffffffdd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badge: { position: 'absolute', left: 10, top: 10, backgroundColor: '#ffffffdd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, zIndex: 2 },
  badgeText: { color: '#0E141C', fontWeight: '700', fontSize: 11, fontFamily: APP_FONT },

  featureChip: { backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  featureChipText: { color: SUBTLE, fontSize: 12, fontFamily: APP_FONT },

  buyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: ACCENT },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: APP_FONT },

  cardExp: { backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 12 },
  expTitle: { color: TEXT, fontWeight: '700', marginTop: 4, fontFamily: APP_FONT },

  heartBtn: { position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },

  resultsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BG, zIndex: 20, elevation: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  calContainer: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingBottom: 24, maxHeight: Math.min(height * 0.9, 720) },
  calendar: { backgroundColor: BG },
  sheetTitle: { color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 10, fontFamily: APP_FONT },

  pickupRow: { marginHorizontal: 16, marginTop: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickupLabel: { color: TEXT, fontFamily: APP_FONT },
  pickupPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  pickupPillText: { color: TEXT, fontFamily: APP_FONT },

  filterSheet: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8, paddingBottom: 24, maxHeight: Math.min(height * 0.9, 720) },
  filterHeaderBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A3247', marginTop: 6, marginBottom: 6 },
  group: { borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  groupTitle: { color: SUBTLE, fontSize: 12, marginBottom: 10, fontFamily: APP_FONT },

  pill: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, height: 34, backgroundColor: '#0E1523' },
  pillActive: { backgroundColor: TEXT, borderColor: TEXT },
  pillText: { color: TEXT, fontSize: 12, fontFamily: APP_FONT },
  pillTextActive: { color: '#0E141C', fontWeight: '700', fontFamily: APP_FONT },

  sliderCap: { color: SUBTLE, fontSize: 12, fontFamily: APP_FONT },

  clearBtn: { height: 48, flex: 1, borderRadius: 12, backgroundColor: '#1a2133', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexDirection: 'row', gap: 8 },
  clearBtnText: { color: TEXT, fontWeight: '600', fontFamily: APP_FONT },
  applyBtn: { backgroundColor: ACCENT, borderRadius: 8, padding: 14, marginHorizontal: 16, marginTop: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontFamily: APP_FONT },

  // slider visuals
  rsWrap: { height: 44, justifyContent: 'center' },
  rsTrack: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: BORDER, borderRadius: 2 },
  rsRange: { position: 'absolute', height: 4, backgroundColor: ACCENT, borderRadius: 2 },
  rsThumb: { position: 'absolute', marginTop:17, width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT },
  rsThumbActive: { transform: [{ scale: 1.05 }] },

  // topbar reused
  topbar: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop:30 },
  topLeftBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: APP_FONT },

  // details
  cardBox: { backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12 },
  offerPill: { backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  offerPillText: { color: TEXT, fontFamily: APP_FONT },

  // time wheel overlay
  timeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  timeWheel: { width: 240, backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, alignItems: 'center' },
  timeWheelTitle: { color: TEXT, fontWeight: '700', marginBottom: 8, fontFamily: APP_FONT },
  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  wheelItem: { height: 36, alignItems: 'center', justifyContent: 'center' },
  wheelText: { color: SUBTLE, fontSize: 18, fontFamily: APP_FONT },
  wheelTextActive: { color: TEXT, fontWeight: '700' },

  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
});
