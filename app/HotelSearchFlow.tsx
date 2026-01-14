// HotelSearchFlow_updated.tsx
// Uses React Native Modals and Stripe SDK.
// Install: yarn add react-native-calendars @react-native-community/slider @stripe/stripe-react-native
// Icons via @expo/vector-icons; navigation via Expo Router.
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { api } from '../services/api';

// ---------------------------
// CONFIG
// ---------------------------
// Removed local API_BASE definition in favor of api service logic
// But we still need STRIPE_KEY
const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY || 'pk_test_...MISSING_KEY...';
// ---------------------------
// Safe-area shim (Android + iOS)
// ---------------------------
function SafeAreaX({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  if (Platform.OS === 'ios') {
    return <SafeAreaView style={[{ flex: 1 }, style]}>{children}</SafeAreaView>;
  }
  const topPad = StatusBar.currentHeight ?? 0;
  return <View style={[{ flex: 1, paddingTop: topPad }, style]}>{children}</View>;
}
// ---------------------------
// Theme / Helpers
// ---------------------------
const BLUE = '#0A84FF';
const BG = '#0C111A';
const CARD = '#121826';
const TEXT = '#E6EDF3';
const SUBTLE = '#9BA4B4';
const BORDER = '#1E293B';
const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function formatCell(d?: Date | null) { if (!d) return ''; return `${d.getDate()} ${monthNames[d.getMonth()]}, ${dayNames[d.getDay()]}`; }
function nightsBetween(a?: Date | null, b?: Date | null) { if (!a || !b) return 0; return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000)); }
// ---------------------------
// Types
// ---------------------------
type TabKey = 'Plane' | 'Hotels' | 'Train' | 'Bus' | 'Transfers' | 'Cruises' | 'Tours';
type Destination = { name: string; country: string; };
type Hotel = { id: string; title: string; price: number; rating: number; tags: string[]; distance: string; perks: string[]; img: string; };
type NearbyCard = { id: string; title: string; img: string; price: number; nights: string; distance: string; score: string; scoreText: string; badge: string; };
type LuxCard = { id: string; title: string; city: string; img: string; };
type Room = { id: string; name: string; bed: string; img: string; price: number; perks: string[]; tags?: string[]; };
// ---------------------------
// Top Tabs
// ---------------------------
const TopTabs = ({ active = 'Hotels', onTabPress }: { active?: TabKey; onTabPress?: (key: TabKey) => void; }) => {
  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'Plane', label: 'Plane Tickets', icon: 'airplane-outline' },
    { key: 'Hotels', label: 'Hotels', icon: 'bed-outline' },
    { key: 'Train', label: 'Train Tickets', icon: 'train-outline' },
    { key: 'Bus', label: 'Bus Tickets', icon: 'bus-outline' },
    { key: 'Transfers', label: 'Transfers', icon: 'swap-horizontal' },
    { key: 'Cruises', label: 'Cruises', icon: 'boat-outline' },
    { key: 'Tours', label: 'Tours', icon: 'map-outline' },
  ];
  return (
    <View style={{ paddingTop: 6, marginBottom: 6 }}>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <TouchableOpacity key={t.key} activeOpacity={0.8} style={[styles.tabPill, isActive && styles.tabPillActive]} onPress={() => onTabPress?.(t.key)}>
              <Ionicons name={t.icon} size={16} color={isActive ? '#0E141C' : TEXT} style={{ marginRight: 6 }} />
              <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
// ---------------------------
// Component Wrapper for Stripe
// ---------------------------
export default function HotelSearchFlowWrapper() {
  return (
    <StripeProvider
      publishableKey={STRIPE_KEY}
      merchantIdentifier="merchant.com.nuvia.travel" // optional, for Apple Pay
    >
      <HotelSearchFlow />
    </StripeProvider>
  );
}
// ---------------------------
// Root Screen
// ---------------------------
function HotelSearchFlow() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [destination, setDestination] = useState<string>((params.destination as string) || 'Paris');
  const [recent, setRecent] = useState<string[]>(['Berlin', 'Milan', 'Manchester City', 'Seychelles', 'Cape Town', 'Barcelona']);

  const [checkIn, setCheckIn] = useState<Date | null>(() => {
    if (params.checkIn) return new Date(params.checkIn as string);
    return addDays(new Date(), 1);
  });

  const [checkOut, setCheckOut] = useState<Date | null>(() => {
    if (params.checkOut) return new Date(params.checkOut as string);
    return addDays(new Date(), 7);
  });
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  // Showcase data from server
  const [nearby, setNearby] = useState<NearbyCard[]>([]);
  const [luxury, setLuxury] = useState<LuxCard[]>([]);
  const [loadingShowcase, setLoadingShowcase] = useState(true);
  // Modals
  const [destOpen, setDestOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortChoice, setSortChoice] = useState<'Recommended' | 'Cheapest' | 'Higher rating' | 'Closest to city center' | 'Newest listings'>('Recommended');
  // Hotel details modal
  const [hotelOpen, setHotelOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const onSearch = () => {
    if (destination && !recent.includes(destination)) setRecent([destination, ...recent].slice(0, 10));
    setShowResults(true);
  };
  useEffect(() => {
    (async () => {
      try {
        setLoadingShowcase(true);
        const json = await api.get('/showcase');
        setNearby(json.nearby || []);
        setLuxury(json.luxury || []);
      } catch (e) {
        console.warn('Failed to load showcase', e);
      } finally {
        setLoadingShowcase(false);
      }
    })();
  }, []);
  return (
    <SafeAreaX style={{ flex: 1, backgroundColor: BG }}>
      {/* Header with back button */}
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ color: TEXT, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' }}>Hotels</Text>
        <View style={{ width: 36 }} />
      </View>
      <TopTabs active="Hotels" />
      <View style={{ flex: 1 }}>
        {!showResults ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ padding: 16 }}>
              <View style={styles.cardWrap}>
                <TouchableOpacity onPress={() => setDestOpen(true)} activeOpacity={0.8} style={styles.stackRow}>
                  <Text style={styles.stackLabel}>Where to?</Text>
                  <Text style={styles.stackValue}>{destination}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCalOpen(true)} activeOpacity={0.8} style={styles.splitRow}>
                  <View style={styles.splitCol}>
                    <Text style={styles.stackLabel}>Check in time?</Text>
                    <Text style={styles.stackValue}>{formatCell(checkIn)}</Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.splitCol}>
                    <Text style={styles.stackLabel}>Check out time?</Text>
                    <Text style={styles.stackValue}>{formatCell(checkOut)}</Text>
                  </View>
                  <View style={styles.bottomHairline} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setGuestsOpen(true)} activeOpacity={0.8} style={styles.iconRow}>
                  <Text style={styles.leftIcon}>👥</Text>
                  <Text style={styles.boldRowTitle}>Number of guests</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setFiltersOpen(true)} activeOpacity={0.8} style={styles.filtersCard}>
                <Text style={styles.leftIcon}>⚙️</Text>
                <Text style={styles.boldRowTitle}>Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSearch} style={styles.searchBtn}>
                <Text style={styles.searchLabel}>Search</Text>
              </TouchableOpacity>
            </View>
            {loadingShowcase ? (
              <View style={{ padding: 16 }}><ActivityIndicator /></View>
            ) : (
              <>
                <HotelsNearbySection data={nearby} />
                <LuxuryHotelsSection data={luxury} />
              </>
            )}
          </ScrollView>
        ) : (
          <ResultsList
            destination={destination}
            checkIn={checkIn}
            checkOut={checkOut}
            sort={sortChoice}
            onBack={() => setShowResults(false)}
            onFilters={() => setFiltersOpen(true)}
            onSort={() => setSortOpen(true)}
            onOpenHotel={(h) => { setSelectedHotel(h); setHotelOpen(true); }}
          />
        )}
        <DestinationSearchModal open={destOpen} onClose={() => setDestOpen(false)} value={destination} onPick={(city) => { setDestination(city); setDestOpen(false); }} recent={recent} onClearRecent={() => setRecent([])} />
        <CalendarRangeModal open={calOpen} onClose={() => setCalOpen(false)} checkIn={checkIn} checkOut={checkOut} onSave={(a, b) => { setCheckIn(a); setCheckOut(b); setCalOpen(false); }} />
        <GuestsModal open={guestsOpen} onClose={() => setGuestsOpen(false)} adults={adults} children={children} onSave={(a, c) => { setAdults(a); setChildren(c); setGuestsOpen(false); }} />
        <FiltersModal open={filtersOpen} onClose={() => setFiltersOpen(false)} onApply={() => setFiltersOpen(false)} />
        <SortByModal open={sortOpen} selected={sortChoice} onClose={() => setSortOpen(false)} onSave={(choice) => { setSortChoice(choice); setSortOpen(false); }} />
        <HotelDetailsModal open={hotelOpen} onClose={() => setHotelOpen(false)} hotel={selectedHotel} checkIn={checkIn} checkOut={checkOut} adults={adults} children={children} recommended={nearby} />
      </View>
    </SafeAreaX>
  );
}
// ---------------------------
// Helpers (Fully Expanded)
// ---------------------------
function DestinationSearchModal({
  open, onClose, value, onPick, recent, onClearRecent
}: {
  open: boolean; onClose: () => void; value: string; onPick: (city: string) => void; recent: string[]; onClearRecent: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await api.get('/destinations', { q });
        setResults(data);
      } catch (e) {
        console.warn('destinations error', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaX style={{ backgroundColor: BG }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 12 }}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <View style={{ flex: 1, backgroundColor: '#ffffff09', borderRadius: 12, paddingHorizontal: 12, height: 42, justifyContent: 'center' }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Where are you going?"
              placeholderTextColor={SUBTLE}
              autoFocus
              style={{ color: TEXT }}
            />
          </View>
        </View>
        {!query ? (
          <ScrollView style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Recent Searches</Text>
              {recent.length ? (
                <TouchableOpacity onPress={onClearRecent}><Text style={{ color: BLUE }}>Clear All</Text></TouchableOpacity>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
              {recent.map((r) => (
                <ChipSmall key={r} label={r} removable onPress={() => onPick(r)} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <>
            {loading ? <View style={{ padding: 16 }}><ActivityIndicator /></View> : null}
            <FlatList
              data={results}
              keyExtractor={(i, index) => `${i.name}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => onPick(item.name)} style={styles.suggestionRow}>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: TEXT, fontSize: 16, fontWeight: '600', fontFamily: 'Raleway_400Regular' }}>{item.name}</Text>
                    <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{item.country}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#111827' }} />}
            />
          </>
        )}
      </SafeAreaX>
    </Modal>
  );
}
function ChipSmall({
  label, selected, onPress, removable
}: {
  label: string; selected?: boolean; onPress?: () => void; removable?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      backgroundColor: selected ? BLUE : '#0F172A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8,
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER,
    }}>
      <Text style={{ color: selected ? 'white' : TEXT, fontWeight: '600', fontFamily: 'Raleway_400Regular' }}>{label}</Text>
      {removable && <Text style={{ color: selected ? 'white' : SUBTLE, marginLeft: 6 }}>×</Text>}
    </TouchableOpacity>
  );
}
function CalendarRangeModal({
  open, onClose, checkIn, checkOut, onSave
}: {
  open: boolean; onClose: () => void; checkIn: Date | null; checkOut: Date | null; onSave: (a: Date | null, b: Date | null) => void;
}) {
  const [start, setStart] = useState<Date | null>(checkIn);
  const [end, setEnd] = useState<Date | null>(checkOut);
  const [activePick, setActivePick] = useState<'in' | 'out'>(() => (!checkIn ? 'in' : !checkOut ? 'out' : 'in'));
  const marked: Record<string, any> = useMemo(() => {
    const m: Record<string, any> = {};
    if (start) m[toISO(start)] = { selected: true, selectedColor: BLUE, selectedTextColor: 'white' };
    if (end) m[toISO(end)] = { ...(m[toISO(end)] || {}), selected: true, selectedColor: BLUE, selectedTextColor: 'white' };
    return m;
  }, [start, end]);
  const onDayPress = (d: any) => {
    const dt = new Date(d.dateString);
    if (activePick === 'in') {
      setStart(dt);
      if (!end) setActivePick('out');
    } else {
      setEnd(dt);
    }
  };
  const nights = nightsBetween(start, end);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaX style={{ backgroundColor: BG }}>
        <View style={{ padding: 16, flex: 1 }}>
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Select Dates</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <ChipSmall label={`Check-in${start ? `: ${formatCell(start)}` : ''}`} selected={activePick === 'in'} onPress={() => setActivePick('in')} />
            <ChipSmall label={`Check-out${end ? `: ${formatCell(end)}` : ''}`} selected={activePick === 'out'} onPress={() => setActivePick('out')} />
          </View>
          <Calendar
            markedDates={marked}
            onDayPress={onDayPress}
            firstDay={1}
            theme={{
              calendarBackground: CARD,
              dayTextColor: TEXT,
              monthTextColor: TEXT,
              textDisabledColor: '#475569',
              todayTextColor: BLUE,
              arrowColor: TEXT,
            }}
          />
          <View style={{ marginTop: 12, backgroundColor: '#0F172A', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: TEXT, fontFamily: 'Raleway_400Regular' }}>
              {(start || end)
                ? `Check-in ${start ? formatCell(start) : '—'} — Check-out ${end ? formatCell(end) : '—'}${nights ? ` • ${nights} night${nights !== 1 ? 's' : ''}` : ''}`
                : 'Select a check-in date and a check-out date'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: '#0F172A' }]}>
              <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!start || !end} onPress={() => onSave(start, end)} style={[styles.modalBtn, { opacity: (!start || !end) ? 0.6 : 1 }]}>
              <Text style={{ color: 'white', fontWeight: '800', fontFamily: 'Raleway_400Regular' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaX>
    </Modal>
  );
}
function GuestsModal({
  open, onClose, adults, children, onSave
}: {
  open: boolean; onClose: () => void; adults: number; children: number[]; onSave: (a: number, c: number[]) => void;
}) {
  const [a, setA] = useState(adults);
  const [kids, setKids] = useState<number[]>(children);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const quickAges = [8, 9, 10];
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaX style={{ backgroundColor: BG }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Guests</Text>
          <View style={styles.counterRow}>
            <View>
              <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Adults</Text>
              <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>18 years and older</Text>
            </View>
            <View style={styles.counterBtns}>
              <TouchableOpacity onPress={() => setA(Math.max(1, a - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
              <Text style={{ color: TEXT, fontSize: 18, width: 36, textAlign: 'center', fontFamily: 'Raleway_400Regular' }}>{a}</Text>
              <TouchableOpacity onPress={() => setA(a + 1)} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
          {kids.map((age, idx) => (
            <View key={idx} style={styles.childRow}>
              <Text style={{ color: TEXT, fontFamily: 'Raleway_400Regular' }}>Child</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{age} years</Text>
                <TouchableOpacity onPress={() => setKids(kids.filter((_, i) => i !== idx))}>
                  <Text style={{ color: SUBTLE }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!addChildOpen ? (
            <TouchableOpacity onPress={() => setAddChildOpen(true)} style={styles.addChildField}>
              <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>+ add child</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {quickAges.map(age => (
                <ChipSmall key={String(age)} label={`${age} years`} onPress={() => { setKids([...kids, age]); setAddChildOpen(false); }} />
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: '#0F172A' }]}>
              <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(a, kids)} style={styles.modalBtn}>
              <Text style={{ color: 'white', fontWeight: '800', fontFamily: 'Raleway_400Regular' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaX>
    </Modal>
  );
}
function FiltersModal({
  open, onClose, onApply
}: {
  open: boolean; onClose: () => void; onApply: () => void;
}) {
  const [types, setTypes] = useState<string[]>(['Hotel']);
  const [stars, setStars] = useState<number>(4);
  const [price, setPrice] = useState<number>(300);
  const [amenities, setAmenities] = useState<string[]>([]);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaX style={{ backgroundColor: BG }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Filters</Text>
          <Section title="Accommodation type">
            <RowWrap>
              {['Hotel', 'Apartment', 'Hostel', 'Resort', 'Guest house', 'Villa'].map(t => (
                <ChipSmall key={t} label={t} selected={types.includes(t)} onPress={() => toggle(types, setTypes, t)} />
              ))}
            </RowWrap>
          </Section>
          <Section title="Star rating">
            <RowWrap>
              {[1, 2, 3, 4, 5].map(s => (
                <ChipSmall key={String(s)} label={'★'.repeat(s)} selected={stars === s} onPress={() => setStars(s)} />
              ))}
            </RowWrap>
          </Section>
          <Section title="Services & amenities">
            <RowWrap>
              {['Free Wi-Fi', 'Parking', 'Swimming pool', 'Pet-friendly', 'Airport shuttle', 'Gym', 'Spa'].map(a => (
                <ChipSmall key={a} label={a} selected={amenities.includes(a)} onPress={() => toggle(amenities, setAmenities, a)} />
              ))}
            </RowWrap>
          </Section>
          <Section title="Price per night">
            <Text style={{ color: SUBTLE, marginBottom: 6, fontFamily: 'Raleway_400Regular' }}>${price}</Text>
            <Slider value={price} onValueChange={(v: number) => setPrice(v)} minimumValue={20} maximumValue={1000} step={10} minimumTrackTintColor={BLUE} thumbTintColor={BLUE} />
          </Section>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: '#0F172A' }]}>
              <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onApply(); }} style={styles.modalBtn}>
              <Text style={{ color: 'white', fontWeight: '800', fontFamily: 'Raleway_400Regular' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaX>
    </Modal>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}
function RowWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>;
}
function SortByModal({ open, selected, onClose, onSave }: { open: boolean; selected: any; onClose: () => void; onSave: (c: any) => void; }) {
  const [choice, setChoice] = useState(selected);
  const items = ['Recommended', 'Cheapest', 'Higher rating', 'Closest to city center', 'Newest listings'];
  useEffect(() => { setChoice(selected); }, [selected]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#121826', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
          <Text style={{ color: TEXT, fontWeight: '800', textAlign: 'center', marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Sort by</Text>
          {items.map(it => {
            const active = choice === it;
            return (
              <TouchableOpacity key={it} onPress={() => setChoice(it)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: active ? BLUE : '#475569', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  {active ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: BLUE }} /> : null}
                </View>
                <Text style={{ color: TEXT, fontFamily: 'Raleway_400Regular' }}>{it}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => onSave(choice)} style={[styles.modalBtn, { marginTop: 12 }]}>
            <Text style={{ color: 'white', fontWeight: '800', fontFamily: 'Raleway_400Regular' }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
function HotelDetailsModal({
  open, onClose, hotel, checkIn, checkOut, adults, children, recommended,
}: {
  open: boolean; onClose: () => void; hotel: Hotel | null; checkIn: Date | null; checkOut: Date | null; adults: number; children: number[]; recommended: NearbyCard[];
}) {
  const [roomsOpen, setRoomsOpen] = useState(false);
  if (!hotel) return null;
  const nights = nightsBetween(checkIn, checkOut);
  const total = nights > 0 ? (hotel.price * nights) : hotel.price;
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaX style={{ backgroundColor: BG }}>
        {/* Header */}
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' }} numberOfLines={1}>{hotel.title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Image carousel */}
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 220 }}>
            {[hotel.img, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200', 'https://images.unsplash.com/photo-1551776235-dde6d4829808?q=80&w=1200'].map((src, idx) => (
              <Image key={idx} source={{ uri: src }} style={{ width: Dimensions.get('window').width, height: 220 }} resizeMode="cover" />
            ))}
          </ScrollView>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12 }}>
                <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>Dates</Text>
                <Text style={{ color: TEXT, marginTop: 4, fontFamily: 'Raleway_400Regular' }}>{checkIn ? `${formatCell(checkIn)}` : '—'} — {checkOut ? `${formatCell(checkOut)}` : '—'} {nights ? `• ${nights} night${nights !== 1 ? 's' : ''}` : ''}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12 }}>
                <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>Guests</Text>
                <Text style={{ color: TEXT, marginTop: 4, fontFamily: 'Raleway_400Regular' }}>{adults} adult{adults !== 1 ? 's' : ''}{children.length ? `, ${children.length} child${children.length !== 1 ? 'ren' : ''}` : ''}</Text>
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 6, fontFamily: 'Raleway_400Regular' }}>About this place</Text>
              <Text style={{ color: SUBTLE, lineHeight: 20, fontFamily: 'Raleway_400Regular' }}>
                Discover comfort and style at {hotel.title}. Located {hotel.distance}, this property offers modern rooms, friendly service, and convenient access to local sights.
              </Text>
            </View>
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 8, fontFamily: 'Raleway_400Regular' }}>Services and amenities</Text>
              <View style={{ backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12 }}>
                {['Free Wi-Fi available', 'Parking on site', 'Air conditioning', '24h front desk'].map((t, i) => (
                  <View key={t} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#111827' }}>
                    <Ionicons name="checkmark-circle" size={16} color={BLUE} />
                    <Text style={{ color: TEXT, marginLeft: 8, fontFamily: 'Raleway_400Regular' }}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: TEXT, fontWeight: '800', fontSize: 18, fontFamily: 'Raleway_400Regular' }}>${total.toFixed(2)}</Text>
              <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{nights > 0 ? `${nights} nights` : 'per night'}</Text>
            </View>
            <TouchableOpacity style={styles.ctaBtnWide} onPress={() => setRoomsOpen(true)}>
              <Text style={{ color: 'white', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Choose room</Text>
            </TouchableOpacity>
          </View>
        </View>
        <AvailableRoomsModal
          open={roomsOpen}
          onClose={() => setRoomsOpen(false)}
          hotelId={hotel.id}
          hotelTitle={hotel.title}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={{ adults, children }}
        />
      </SafeAreaX>
    </Modal>
  );
}
// ---------------------------
// Avail/Booking Modal (Logic for Stripe)
// ---------------------------
function AvailableRoomsModal({
  open, onClose, hotelId, hotelTitle, checkIn, checkOut, guests
}: {
  open: boolean; onClose: () => void; hotelId: string; hotelTitle: string; checkIn: Date | null; checkOut: Date | null; guests: { adults: number, children: number[] }
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const router = useRouter();
  const [nights, setNights] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [booking, setBooking] = useState(false);
  // Stripe Hook
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  useEffect(() => {
    if (!open || !hotelId) return;
    (async () => {
      try {
        setLoading(true);
        const paramsObj: any = {};
        if (checkIn) paramsObj.checkIn = toISO(checkIn);
        if (checkOut) paramsObj.checkOut = toISO(checkOut);

        const json = await api.get(`/hotels/${hotelId}/rooms`, paramsObj);
        setRooms(json.rooms || []);
        setNights(json.nights || Math.max(1, nightsBetween(checkIn, checkOut)));
      } catch (e) {
        console.warn('rooms error', e);
        setRooms([]);
        setNights(Math.max(1, nightsBetween(checkIn, checkOut)));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, hotelId, checkIn?.toISOString(), checkOut?.toISOString()]);
  const handleBook = async (room: Room) => {
    try {
      setBooking(true);
      // 1. Create PaymentIntent on Backend
      const json = await api.post('/bookings', {
        type: 'hotel',
        itemId: hotelId,
        subId: room.id,
        price: room.price * nights,
        checkIn,
        checkOut,
        guests
      });
      if (!json.success || !json.clientSecret) {
        Alert.alert('Error', json.error || 'Could not initialize payment');
        setBooking(false);
        return;
      }
      // 2. Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Nuvia Travel',
        paymentIntentClientSecret: json.clientSecret,
        defaultBillingDetails: {
          name: 'Jane Doe',
        }
      });
      if (initError) {
        Alert.alert('Stripe Error', initError.message);
        setBooking(false);
        return;
      }
      // 3. Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        // User cancelled or failed
        Alert.alert('Payment did not succeed', paymentError.message);
      } else {
        // Success!
        console.log('Payment Success!', json);
        onClose();
        router.push({
          pathname: '/BookingSuccess',
          params: {
            bookingId: json.booking.id,
            hotelName: hotelTitle,
            dates: `${checkIn ? formatCell(checkIn) : ''} - ${checkOut ? formatCell(checkOut) : ''}`,
            price: (room.price * nightsBetween(checkIn, checkOut)).toFixed(2)
          }
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not complete booking sequence.');
      console.error(e);
    } finally {
      setBooking(false);
    }
  };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaX style={{ backgroundColor: BG }}>
        {/* Header */}
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' }}>Available rooms</Text>
          <View style={{ width: 36 }} />
        </View>
        {/* Hotel + dates summary */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{hotelTitle}</Text>
          <Text style={{ color: TEXT, fontWeight: '700', marginTop: 2, fontFamily: 'Raleway_400Regular' }}>
            {checkIn ? `${formatCell(checkIn)}` : '—'} — {checkOut ? `${formatCell(checkOut)}` : '—'} • {nights} night{nights !== 1 ? 's' : ''}
          </Text>
        </View>
        {loading ? (
          <View style={{ padding: 16 }}><ActivityIndicator /></View>
        ) : (
          <FlatList
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            data={rooms}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <RoomCard
                room={item}
                nights={nights}
                onBook={() => handleBook(item)}
                booking={booking}
              />
            )}
          />
        )}
        {booking && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={{ color: 'white', marginTop: 16, fontWeight: '700' }}>Processing...</Text>
          </View>
        )}
      </SafeAreaX>
    </Modal>
  );
}
function RoomCard({ room, nights, onBook, booking }: { room: Room; nights: number; onBook: () => void; booking: boolean }) {
  const total = room.price * nights;
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 14, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{room.name}</Text>
          <Text style={{ color: SUBTLE, marginTop: 4, fontFamily: 'Raleway_400Regular' }}>{room.bed}</Text>
        </View>
        <Image source={{ uri: room.img }} style={{ width: 120, height: 80, borderRadius: 10 }} />
      </View>
      {room.tags?.length ? (<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12 }}>{room.tags.map(t => (<View key={t} style={{ backgroundColor: '#1B2540', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ color: TEXT, fontSize: 12 }}>{t}</Text></View>))}</View>) : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>{room.perks.map((p) => (<View key={p} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}><Ionicons name="checkmark-circle" size={14} color={BLUE} /><Text style={{ color: TEXT, marginLeft: 8, fontFamily: 'Raleway_400Regular' }}>{p}</Text></View>))}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
        <View>
          <Text style={{ color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: 'Raleway_400Regular' }}>${total}</Text>
          <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>for {nights} night{nights !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.ctaBtn} onPress={onBook} disabled={booking}>
          <Text style={{ color: 'white', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{booking ? '...' : 'Pay & Book'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const HotelsNearbySection = ({ data }: { data: NearbyCard[] }) => {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
      <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Hotels near by</Text>
      <Text style={{ color: SUBTLE, marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Browse, find and book amazing hotels nearby</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.map(card => (
          <View key={card.id} style={styles.nearCard}>
            <View style={{ borderRadius: 14, overflow: 'hidden' }}>
              <Image source={{ uri: card.img }} style={{ width: 260, height: 150 }} />
              <View style={styles.badge}><Text style={styles.badgeText}>{card.badge}</Text></View>
              <View style={styles.heart}><Ionicons name="heart-outline" size={16} color={TEXT} /></View>
            </View>
            <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {[0, 1, 2, 3, 4].map(i => <Text key={i} style={{ color: '#FFD700', marginRight: 2, fontFamily: 'Raleway_400Regular' }}>★</Text>)}
                <Text style={{ color: SUBTLE, marginLeft: 6, fontFamily: 'Raleway_400Regular' }}>5 star hotel</Text>
              </View>
              <Text style={{ color: TEXT, fontWeight: '700', fontSize: 16, fontFamily: 'Raleway_400Regular' }}>{card.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="location-outline" size={12} color={SUBTLE} />
                <Text style={{ color: SUBTLE, marginLeft: 6, fontFamily: 'Raleway_400Regular' }}>{card.distance}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <View style={styles.scoreChip}><Text style={{ color: 'white', fontWeight: '800', fontFamily: 'Raleway_400Regular' }}>{card.score}</Text></View>
                <Text style={{ color: SUBTLE, marginLeft: 8, fontFamily: 'Raleway_400Regular' }}>{card.scoreText}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <View>
                  <Text style={{ color: TEXT, fontWeight: '800', fontSize: 18, fontFamily: 'Raleway_400Regular' }}>${card.price.toFixed(2)}</Text>
                  <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{card.nights}</Text>
                </View>
                <TouchableOpacity style={styles.ctaBtn}><Text style={{ color: 'white', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Book now</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
const LuxuryHotelsSection = ({ data }: { data: LuxCard[] }) => {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
      <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Luxury Hotels for you</Text>
      <Text style={{ color: SUBTLE, marginBottom: 12, fontFamily: 'Raleway_400Regular' }}>Check out our premium hotel options</Text>
      {data.map(card => (
        <View key={card.id} style={styles.luxCard}>
          <Image source={{ uri: card.img }} style={{ width: '100%', height: 150, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
          <View style={{ padding: 12 }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, fontFamily: 'Raleway_400Regular' }}>{card.title}</Text>
            <Text style={{ color: SUBTLE, marginTop: 2, fontFamily: 'Raleway_400Regular' }}>{card.city}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              {[0, 1, 2, 3, 4].map(i => <Text key={i} style={{ color: '#FFD700', marginRight: 2 }}>★</Text>)}
              <Text style={{ color: SUBTLE, marginLeft: 6, fontFamily: 'Raleway_400Regular' }}>5 star hotel</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 }}>
            <TouchableOpacity style={styles.whiteGhostBtn}><Text style={{ color: BG, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Book now</Text></TouchableOpacity>
            <TouchableOpacity style={styles.ctaBtnWide}><Text style={{ color: 'white', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>View all options</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};
function ResultsList({
  destination, checkIn, checkOut, sort, onBack, onFilters, onSort, onOpenHotel,
}: {
  destination: string; checkIn: Date | null; checkOut: Date | null; sort: 'Recommended' | 'Cheapest' | 'Higher rating' | 'Closest to city center' | 'Newest listings';
  onBack: () => void; onFilters: () => void; onSort: () => void; onOpenHotel: (h: Hotel) => void;
}) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const paramsObj: any = { destination, sort };
        if (checkIn) paramsObj.checkIn = toISO(checkIn);
        if (checkOut) paramsObj.checkOut = toISO(checkOut);

        const json = await api.get('/hotels', paramsObj);
        setHotels(json.hotels || []);
      } catch (e) {
        console.warn('hotels error', e);
        setHotels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [destination, checkIn?.toISOString(), checkOut?.toISOString(), sort]);
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>
            {destination}, {checkIn ? monthNames[checkIn.getMonth()] : ''} {checkIn?.getDate()} - {checkOut ? monthNames[checkOut.getMonth()] : ''} {checkOut?.getDate()}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
          <ChipSmall label="Filters" onPress={onFilters} />
          <ChipSmall label="Sort" onPress={onSort} />
          <ChipSmall label="Favorites" />
        </View>
        {loading ? (
          <View style={{ padding: 16 }}><ActivityIndicator /></View>
        ) : (
          <FlatList
            scrollEnabled={false}
            contentContainerStyle={{ padding: 16 }}
            data={hotels}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => <HotelCard item={item} onPress={() => onOpenHotel(item)} />}
          />
        )}
      </ScrollView>
    </View>
  );
}
function HotelCard({ item, onPress }: { item: Hotel; onPress?: () => void; }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.hotelCard}>
      <View style={{ overflow: 'hidden', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <Image source={{ uri: item.img }} style={{ height: 140, width: '100%' }} resizeMode="cover" />
        <View style={{ position: 'absolute', left: 8, top: 8, flexDirection: 'row', gap: 6 }}>
          {item.tags.map(t => (
            <View key={t} style={{ backgroundColor: BLUE, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ color: TEXT, fontWeight: '700', fontSize: 16, fontFamily: 'Raleway_400Regular' }} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text style={{ color: '#FFD700' }}>★</Text>
          <Text style={{ color: TEXT }}>{item.rating}</Text>
          <Text style={{ color: SUBTLE }}>· {item.distance}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {item.perks.map(p => (
            <View key={p} style={{ backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{p}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: TEXT, fontWeight: '800', fontSize: 18, fontFamily: 'Raleway_400Regular' }}>${item.price.toFixed(2)}</Text>
          <TouchableOpacity style={{ backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: 'white', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Book now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  cardWrap: { backgroundColor: BG, borderRadius: 20, padding: 12 },
  stackRow: { backgroundColor: '#ffffff09', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 0, borderColor: BORDER, marginBottom: 10 },
  stackLabel: { color: '#7C8BA0', fontSize: 12, marginBottom: 4 },
  stackValue: { color: TEXT, fontSize: 16, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  splitRow: { backgroundColor: '#ffffff09', borderRadius: 14, borderWidth: 0, borderColor: BORDER, marginBottom: 10, paddingHorizontal: 6, paddingTop: 10, paddingBottom: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start' },
  splitCol: { flex: 1, paddingHorizontal: 8 },
  verticalDivider: { position: 'absolute', top: 10, bottom: 14, left: '50%', width: 1, backgroundColor: '#334155' },
  bottomHairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: '#334155' },
  iconRow: { backgroundColor: '#ffffff09', borderRadius: 14, borderWidth: 0, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  boldRowTitle: { color: TEXT, fontSize: 16, fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  leftIcon: { color: '#93A7BE', marginRight: 8 },
  filtersCard: { backgroundColor: '#ffffff09', borderRadius: 16, borderWidth: 0, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 14, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: { backgroundColor: BLUE, borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  searchLabel: { color: 'white', fontSize: 16, fontWeight: '800', fontFamily: 'Raleway_400Regular' },
  modalBtn: { flex: 1, backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  counterBtns: { flexDirection: 'row', alignItems: 'center' },
  counterBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { color: TEXT, fontSize: 18, fontFamily: 'Raleway_400Regular' },
  addChildField: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER, marginTop: 8 },
  childRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111827' },
  hotelCard: { backgroundColor: CARD, borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6 },
  tabPill: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, height: 32, marginRight: 8 },
  tabPillActive: { backgroundColor: TEXT },
  tabPillText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  tabPillTextActive: { color: '#0E141C', fontWeight: '600', fontFamily: 'Raleway_400Regular' },
  nearCard: { width: 260, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginRight: 12, overflow: 'hidden' },
  badge: { position: 'absolute', left: 10, top: 10, backgroundColor: '#E7F0FF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#2563EB', fontWeight: '700', fontSize: 12, fontFamily: 'Raleway_400Regular' },
  heart: { position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  scoreChip: { backgroundColor: BLUE, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  luxCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginTop: 6 },
  whiteGhostBtn: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  ctaBtn: { backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  ctaBtnWide: { backgroundColor: BLUE, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
});