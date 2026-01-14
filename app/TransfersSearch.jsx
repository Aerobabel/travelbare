// app/TransfersSearch.jsx
// Transfers flow — dark theme, cards, chips, and modals.
// Requires: expo, expo-router, react-native-calendars (+ your Raleway font loaded in the app)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------- API base ----------
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://travelapi-34zi.onrender.com';

async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    url.searchParams.set(k, String(v));
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
async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('apiPost failed', err);
    throw err;
  }
}

// ---------- theme / const ----------
const { height } = Dimensions.get('window');
const ACCENT = '#2F6BFF';
const TEXT = '#E9EEF8';
const SUBTLE = '#8A93A0';
const BORDER = '#283142';
const CARD_BG = '#121826';

const INITIAL_FILTERS = {
  price: [85, 900],
  freeWait: true,
  instant: true,
  guaranteed: true,
};

// quick hour/min data for wheel picker UI
const HOURS = Array.from({ length: 24 }, (_, i) => (i < 10 ? `0${i}` : `${i}`));
const MINS = ['00', '10', '20', '30', '40', '50'];

// ---------- RangeSlider ----------
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

// ---------- Helpers ----------
function Overlay({ onClose, children }) {
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        {/* Stop propagation inside the sheet */}
        <TouchableWithoutFeedback>{children}</TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ---------- Destination / Address Search ----------
function AddressModal({ open, onClose, onPick, initialQuery = '', recent, onClearRecent }) {
  const [query, setQuery] = useState(initialQuery);
  const CANDIDATES = [
    'SVO Airport, Terminal D',
    'Heathrow Airport, Terminal 3',
    "King's Cross Station",
    'Rue de Rivoli 27, Paris',
    'Radisson Blu Hotel',
    'Hotel Monceau, Paris',
  ];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CANDIDATES.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 12 }}>
            <Text style={{ color: TEXT, fontSize: 18, fontFamily: 'Raleway_400Regular' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, height: 42, justifyContent: 'center' }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Enter address, airport or hotel"
              placeholderTextColor={SUBTLE}
              autoFocus
              style={{ color: TEXT, fontFamily: 'Raleway_400Regular' }}
            />
          </View>
        </View>

        {!query ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Recent Searches</Text>
              {recent.length ? (
                <TouchableOpacity onPress={onClearRecent}>
                  <Text style={{ color: ACCENT, fontFamily: 'Raleway_400Regular' }}>Clear All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
              {recent.map((r, idx) => (
                <TouchableOpacity
                  key={`recent-${idx}-${r}`}
                  onPress={() => onPick(r)}
                  style={{ backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}
                >
                  <Text style={{ color: TEXT, fontWeight: '600', fontFamily: 'Raleway_400Regular' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {list.map((s, i) => (
              <TouchableOpacity key={`addr-${i}-${s}`} onPress={() => onPick(s)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <Text style={{ fontSize: 18, marginRight: 12, fontFamily: 'Raleway_400Regular' }}>📍</Text>
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '600', fontFamily: 'Raleway_400Regular' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Flight number search (server) ----------
function FlightNumberSearch({ open, onClose, onPick, onFindMyFlight }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const s = q.trim();
      if (!s) { setResults([]); return; }
      setLoading(true);
      try {
        // server expects ?no=
        const data = await apiGet('/transfers/flights', { no: s });
        if (!cancelled) setResults(data?.flights || []);
      } catch (e) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [q]);

  const notFound = !loading && q.trim().length > 0 && results.length === 0;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        {/* search bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 12 }}>
            <Text style={{ color: TEXT, fontSize: 18, fontFamily: 'Raleway_400Regular' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 18, paddingHorizontal: 12, height: 40, justifyContent: 'center' }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Enter your flight number"
              placeholderTextColor={SUBTLE}
              autoFocus
              style={{ color: TEXT }}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : notFound ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: SUBTLE, marginBottom: 14, fontFamily: 'Raleway_400Regular' }}>We didn't find a match</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onFindMyFlight}>
              <Ionicons name="search" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>Find my flight</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((f, i) => (
              <TouchableOpacity key={`flight-${i}-${f.no}-${f.time || ''}`} onPress={() => onPick(f)} style={styles.flightRow}>
                <Image source={{ uri: f.logo || 'https://upload.wikimedia.org/wikipedia/commons/1/17/Turkish_Airlines_logo_2019.png' }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{f.no} — {f.airline}</Text>
                  <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{f.from} → {f.to}</Text>
                </View>
                <Ionicons name="chevron-forward" color={SUBTLE} size={16} />
              </TouchableOpacity>
            ))}
            {!q && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <TouchableOpacity style={styles.primaryBtn} onPress={onFindMyFlight}>
                  <Text style={styles.primaryBtnText}>Find my flight</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function SelectAirportModal({ open, onClose, selected, onSave, airports }) {
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(selected || airports?.[0]?.code);
  useEffect(() => setPick(selected || airports?.[0]?.code), [selected, airports]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return airports || [];
    return (airports || []).filter((a) => a.name.toLowerCase().includes(s) || a.code.toLowerCase().includes(s));
  }, [q, airports]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 8, fontFamily: 'Raleway_400Regular' }}>Airport of origin</Text>
          <View style={{ backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12 }}>
            <TextInput placeholder="Enter departure airport" placeholderTextColor={SUBTLE} value={q} onChangeText={setQ} style={{ color: TEXT, height: 42 }} />
          </View>
        </View>
        <ScrollView>
          {(list || []).map((a, i) => (
            <TouchableOpacity key={`airport-${i}-${a.code}`} onPress={() => setPick(a.code)} style={styles.radioRow}>
              <View style={[styles.radioOuter, pick === a.code && styles.radioOuterOn]}>
                {pick === a.code && <View style={styles.radioInner} />}
              </View>
              <Text style={{ color: TEXT, flex: 1, fontFamily: 'Raleway_400Regular' }}>{a.name}</Text>
              <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{a.code}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ padding: 16 }}>
          <TouchableOpacity style={styles.primaryBar} onPress={() => onSave(pick)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SelectAirlinesModal({ open, onClose, selected = [], onSave, airlines }) {
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(selected);
  useEffect(() => setPick(selected), [selected]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = airlines || [];
    if (!s) return base;
    return base.filter((a) => a.name.toLowerCase().includes(s) || a.code.toLowerCase().includes(s));
  }, [q, airlines]);

  const toggle = (code) => {
    setPick((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 8, fontFamily: 'Raleway_400Regular' }}>Select airlines</Text>
          <View style={{ backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12 }}>
            <TextInput placeholder="Airlines name" placeholderTextColor={SUBTLE} value={q} onChangeText={setQ} style={{ color: TEXT, height: 42 }} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {(list || []).map((a, i) => (
            <TouchableOpacity key={`airline-${i}-${a.code}`} onPress={() => toggle(a.code)} style={styles.checkRowAir}>
              <View style={[styles.checkbox, pick.includes(a.code) && styles.checkboxOn]} />
              <Text style={{ color: TEXT, flex: 1, fontFamily: 'Raleway_400Regular' }}>{a.name}</Text>
              {a.price ? <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>${a.price}</Text> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ padding: 16 }}>
          <TouchableOpacity style={styles.primaryBar} onPress={() => onSave(pick)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function FindMyFlight({ open, onClose, airports, airlines }) {
  const [airport, setAirport] = useState('');
  const [airLinesPick, setAirLinesPick] = useState([]);
  const [airportModal, setAirportModal] = useState(false);
  const [airlinesModal, setAirlinesModal] = useState(false);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simplified finder (server only supports ?no=). We'll just show top flights:
  const search = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/transfers/flights'); // server returns some list
      const pool = data?.flights || [];
      // Locally filter by selected airport/airlines (best-effort)
      const filtered = pool.filter((f) => {
        const okAirport = airport ? (f.from === airport || f.to === airport) : true;
        const okAirline = airLinesPick.length ? airLinesPick.some((c) => f.airline?.toLowerCase().includes(c.toLowerCase())) : true;
        return okAirport && okAirline;
      });
      setFlights(filtered);
    } catch {
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); }, [airport, airLinesPick]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find my flight</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ padding: 12 }}>
          <TouchableOpacity style={styles.selectorRow} onPress={() => setAirportModal(true)}>
            <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{airport ? (airports.find((a) => a.code === airport)?.name || airport) : 'Select Airport of origin'}</Text>
            <Ionicons name="chevron-forward" color={SUBTLE} size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectorRow} onPress={() => setAirlinesModal(true)}>
            <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{airLinesPick.length ? `${airLinesPick.length} airlines` : 'Select Airline'}</Text>
            <Ionicons name="chevron-forward" color={SUBTLE} size={16} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : (
          <ScrollView>
            {(flights || []).map((f, i) => (
              <View key={`finder-${i}-${f.no}-${f.time || ''}`} style={styles.flightRow}>
                <Image source={{ uri: f.logo || 'https://upload.wikimedia.org/wikipedia/commons/1/17/Turkish_Airlines_logo_2019.png' }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{f.no} — {f.airline}</Text>
                  <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{f.from} → {f.to}</Text>
                </View>
                <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{f.time}</Text>
              </View>
            ))}
            {!flights.length && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>No flights match the filters.</Text>
              </View>
            )}
          </ScrollView>
        )}

        <SelectAirportModal
          open={airportModal}
          selected={airport}
          onSave={(v) => { setAirport(v); setAirportModal(false); }}
          onClose={() => setAirportModal(false)}
          airports={airports}
        />
        <SelectAirlinesModal
          open={airlinesModal}
          selected={airLinesPick}
          onSave={(v) => { setAirLinesPick(v); setAirlinesModal(false); }}
          onClose={() => setAirlinesModal(false)}
          airlines={airlines}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Passengers & Luggage ----------
function PassengersModal({ open, onClose, value, onSave }) {
  const [state, setState] = useState(value);
  useEffect(() => setState(value), [value]);
  const inc = (k, d) => setState((s) => ({ ...s, [k]: Math.max(0, (s[k] || 0) + d) }));

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Overlay onClose={onClose}>
        <View style={styles.sheetLarge}>
          <Text style={styles.sheetTitle}>Passengers and luggages</Text>

          {[
            { k: 'adult', label: 'Adult', sub: '18 years and older' },
            { k: 'booster', label: 'Booster', sub: 'From 120–150 cm (22–36 kg)' },
            { k: 'child', label: 'Child', sub: 'From 7 to 12 years old (15–36 kg)' },
            { k: 'toddler', label: 'Toddler', sub: 'From 1 to 3 years old (9–18 kg)' },
            { k: 'infant', label: 'Infants', sub: 'Under 1 year old' },
            { k: 'bags', label: 'Luggage pieces', sub: 'Select number of bags' },
          ].map((row) => (
            <View key={`pax-${row.k}`} style={styles.paxRow}>
              <View>
                <Text style={styles.paxLabel}>{row.label}</Text>
                <Text style={styles.paxSub}>{row.sub}</Text>
              </View>
              <View style={styles.paxControls}>
                <TouchableOpacity style={styles.paxBtn} onPress={() => inc(row.k, -1)}><Text style={styles.paxBtnText}>–</Text></TouchableOpacity>
                <Text style={styles.paxCount}>{state[row.k] || 0}</Text>
                <TouchableOpacity style={styles.paxBtn} onPress={() => inc(row.k, 1)}><Text style={styles.paxBtnText}>+</Text></TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Child seats provided by passenger</Text>
            <SwitchMini value={!!state.childSeat} onToggle={() => setState((s) => ({ ...s, childSeat: !s.childSeat }))} />
          </View>

          <TouchableOpacity style={styles.primaryBar} onPress={() => onSave(state)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Overlay>
    </Modal>
  );
}

function SwitchMini({ value, onToggle }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={[styles.switch, value && styles.switchOn]}>
      <View style={[styles.knob, value && styles.knobOn]} />
    </TouchableOpacity>
  );
}

// ---------- Service Class (local list) ----------
function ServiceClassModal({ open, onClose, selected, onSave }) {
  const options = [
    { k: 'eco',  name: 'Economy',  price: 85,  eta: '≈ 18 mins', img: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=600&q=60' },
    { k: 'comf', name: 'Comfort',  price: 200, eta: '≈ 30 mins', img: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=600&q=60' },
    { k: 'prem', name: 'Premium',  price: 300, eta: '≈ 20 mins', img: 'https://images.unsplash.com/photo-1549921296-3a6b3e63c31f?w=600&q=60' },
    { k: 'biz',  name: 'Business', price: 800, eta: '≈ 10 mins', img: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=60' },
  ];
  const [pick, setPick] = useState(selected || 'prem');
  useEffect(() => setPick(selected || 'prem'), [selected]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Overlay onClose={onClose}>
        <View style={styles.sheetLarge}>
          <Text style={styles.sheetTitle}>Service Class</Text>
          {options.map((o) => (
            <TouchableOpacity key={`svc-${o.k}`} onPress={() => setPick(o.k)} style={styles.serviceRow}>
              <Image source={{ uri: o.img }} style={{ width: 64, height: 36, borderRadius: 8, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{o.name}</Text>
                <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>Pickup within {o.eta}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>from ${o.price}</Text>
                <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>12:30</Text>
              </View>
              <View style={[styles.radioOuter, pick === o.k && styles.radioOuterOn]}>
                {pick === o.k && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.primaryBar} onPress={() => onSave(pick)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Overlay>
    </Modal>
  );
}

// ---------- Filters ----------
function FiltersModal({ open, onClose, values, onSave }) {
  const [v, setV] = useState(values);
  useEffect(() => setV(values), [values]);
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Overlay onClose={onClose}>
        <View style={styles.sheetSmall}>
          <Text style={styles.sheetTitle}>Filters</Text>

          <Text style={styles.groupTitle}>Price range</Text>
          <View style={styles.priceCaps}>
            <View style={styles.cap}><Text style={styles.capLabel}>Minimum</Text><Text style={styles.capValue}>${v.price[0]}</Text></View>
            <View style={styles.cap}><Text style={styles.capLabel}>Maximum</Text><Text style={styles.capValue}>${v.price[1]}</Text></View>
          </View>
          <RangeSlider min={0} max={1000} step={5} values={v.price} onChange={(vals) => setV((s) => ({ ...s, price: vals }))} />

          <View style={{ height: 12 }} />
          {[
            { k: 'freeWait', label: 'Free waiting time' },
            { k: 'instant', label: 'Instant confirmation' },
            { k: 'guaranteed', label: 'Guaranteed car model' },
          ].map((t) => (
            <View key={`flt-${t.k}`} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t.label}</Text>
              <SwitchMini value={!!v[t.k]} onToggle={() => setV((s) => ({ ...s, [t.k]: !s[t.k] }))} />
            </View>
          ))}

          <View style={styles.filterBtns}>
            <TouchableOpacity style={styles.clearBtn} onPress={() => setV(INITIAL_FILTERS)}>
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBar} onPress={() => onSave(v)}>
              <Text style={styles.primaryBarText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Overlay>
    </Modal>
  );
}

// ---------- Date & Time picker ----------
function DateTimeModal({ open, onClose, date, onSave }) {
  const [selected, setSelected] = useState(date || null);
  const [hh, setHh] = useState('12');
  const [mm, setMm] = useState('10');

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

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Overlay onClose={onClose}>
        <View style={styles.sheetLarge}>
          <Text style={styles.sheetTitle}>Select Date and Time</Text>
          <Calendar
            style={{ backgroundColor: '#0E141C' }}
            onDayPress={(d) => setSelected(d.dateString)}
            markedDates={selected ? { [selected]: { selected: true } } : {}}
            theme={calTheme}
          />

          {/* Wheel-like time pickers */}
          <View style={styles.timeBlock}>
            <View style={styles.timeWheel}>
              <ScrollView showsVerticalScrollIndicator={false} snapToInterval={36} decelerationRate="fast">
                {HOURS.map((h) => (
                  <TouchableOpacity key={`h-${h}`} style={styles.timeItem} onPress={() => setHh(h)}>
                    <Text style={[styles.timeText, hh === h && styles.timeTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={{ color: TEXT, marginHorizontal: 8, fontSize: 18, fontFamily: 'Raleway_400Regular' }}>:</Text>
            <View style={styles.timeWheel}>
              <ScrollView showsVerticalScrollIndicator={false} snapToInterval={36} decelerationRate="fast">
                {MINS.map((m) => (
                  <TouchableOpacity key={`m-${m}`} style={styles.timeItem} onPress={() => setMm(m)}>
                    <Text style={[styles.timeText, mm === m && styles.timeTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <Text style={{ color: SUBTLE, textAlign: 'center', marginBottom: 8, fontFamily: 'Raleway_400Regular' }}>Choose a pickup time</Text>

          <TouchableOpacity style={styles.primaryBar} onPress={() => onSave({ date: selected, time: `${hh}:${mm}` })}>
            <Text style={styles.primaryBarText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </Overlay>
    </Modal>
  );
}

// ---------- Sort By ----------
function SortByModal({ open, onClose, value, onSave }) {
  const [v, setV] = useState(value || 'rec');
  const OPTS = [
    { k: 'rec', label: 'Recommended' },
    { k: 'cheap', label: 'Cheapest' },
    { k: 'early', label: 'Early arrival' },
    { k: 'fast', label: 'Fastest' },
  ];
  useEffect(() => setV(value || 'rec'), [value]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Overlay onClose={onClose}>
        <View style={[styles.sheetSmall, { paddingBottom: 20 }]}>
          <Text style={styles.sheetTitle}>Sort by</Text>
          {OPTS.map((o) => (
            <TouchableOpacity key={`sort-${o.k}`} style={styles.radioRow} onPress={() => setV(o.k)}>
              <View style={[styles.radioOuter, v === o.k && styles.radioOuterOn]}>
                {v === o.k && <View style={styles.radioInner} />}
              </View>
              <Text style={{ color: TEXT, fontFamily: 'Raleway_400Regular' }}>{o.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.primaryBar, { marginTop: 10 }]} onPress={() => onSave(v)}>
            <Text style={styles.primaryBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Overlay>
    </Modal>
  );
}

// ---------- Results & Details ----------
function ResultRow({ item, onPress }) {
  return (
    <TouchableOpacity onPress={() => onPress(item)} style={styles.resultCard} activeOpacity={0.9}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{item.vendor}</Text>
        <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>{item.klass}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <Ionicons name="car-outline" color={TEXT} size={16} />
        <Text style={{ color: TEXT, marginLeft: 6, fontFamily: 'Raleway_400Regular' }}>${item.price}</Text>
        <View style={{ width: 16 }} />
        <Ionicons name="time-outline" color={TEXT} size={16} />
        <Text style={{ color: TEXT, marginLeft: 6, fontFamily: 'Raleway_400Regular' }}>{item.dur}</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.ratingPill}>
          <Text style={{ color: TEXT, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>{item.rating}</Text>
          <Text style={{ color: SUBTLE, fontSize: 10, marginLeft: 4, fontFamily: 'Raleway_400Regular' }}>{`(${item.reviews})`}</Text>
          <Ionicons name="chevron-forward" color={SUBTLE} size={12} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
        {item.tags.map((t, i) => (
          <View key={`tag-${item.id}-${i}`} style={[styles.badge, i === 0 && styles.badgePrimary]}>
            <Text style={[styles.badgeText, i === 0 && styles.badgeTextPrimary]} numberOfLines={1}>{t}</Text>
          </View>
        ))}
      </ScrollView>
    </TouchableOpacity>
  );
}

function ResultsList({
  open,
  onClose,
  summary,
  offers,
  onPick,
  onOpenFilters,
  onOpenSort,
  onOpenClass,
  loading,
}) {
  if (!open) return null;
  return (
    <View style={styles.resultsLayer} pointerEvents="auto">
      <SafeAreaView style={{ flex: 1 }}>
        {/* header row w/ summary chips */}
        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <View style={styles.summaryRow}>
            <TouchableOpacity onPress={onClose} style={{ paddingRight: 8 }}>
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <View style={styles.summaryPill}><Text numberOfLines={1} style={styles.summaryPillText}>{summary.route}</Text></View>
              <View style={styles.summaryPill}><Text numberOfLines={1} style={styles.summaryPillText}>{summary.when}</Text></View>
            </ScrollView>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity onPress={onOpenFilters} style={styles.resChip}><Ionicons name="funnel-outline" size={14} color={TEXT} /><Text style={styles.resChipText}>Filters</Text></TouchableOpacity>
            <TouchableOpacity onPress={onOpenSort} style={styles.resChip}><Ionicons name="swap-vertical" size={14} color={TEXT} /><Text style={styles.resChipText}>Sort by</Text></TouchableOpacity>
            <TouchableOpacity onPress={onOpenClass} style={styles.resChip}><Ionicons name="car-outline" size={14} color={TEXT} /><Text style={styles.resChipText}>Class</Text></TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {offers.map((o, i) => <ResultRow key={`offer-${i}-${o.id}-${o.vendor}`} item={o} onPress={onPick} />)}
            {offers.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 24 }}>
                <Text style={{ color: SUBTLE, fontFamily: 'Raleway_400Regular' }}>No offers found for your search.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function TransferDetails({ open, onClose, offer }) {
  if (!open || !offer) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback>
            <View style={{ flex: 1, backgroundColor: '#0E141C' }}>
              <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="chevron-back" size={22} color={TEXT} />
                </TouchableOpacity>
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' }}>Transfer Details</Text>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="car-outline" color={TEXT} size={18} />
                  <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>{offer.vendor}</Text>
                </View>
                <Text style={{ color: SUBTLE, marginTop: 4, fontFamily: 'Raleway_400Regular' }}>{offer.pickup} - {offer.to}</Text>

                {/* Timeline */}
                <View style={{ marginTop: 16, paddingLeft: 8 }}>
                  <TimelineRow label="Airport Pick-up" value={offer.pickup} time={offer.pickupAt} active />
                  <TimelineRow label="Free waiting time ends" value="" time={offer.freeWaitEnds} />
                  <TimelineRow label={"Passenger's drop off"} value={offer.to} time={offer.dropAt} end />
                </View>

                {/* Comfort bullets */}
                <Text style={{ color: TEXT, fontWeight: '700', marginTop: 16, marginBottom: 6, fontFamily: 'Raleway_400Regular' }}>Comfort</Text>
                {(offer.comfort || [
                  { ok: true, t: 'Instant confirmation' },
                  { ok: true, t: 'Free waiting time' },
                  { ok: true, t: 'Flexible Cancellation Policy' },
                  { ok: false, t: 'Child Safety Seats' },
                  { ok: false, t: '24/7 Availability' },
                ]).map((b, i) => (
                  <View key={`comfort-${i}-${b.t}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name={b.ok ? 'checkmark-circle' : 'close-circle'} size={16} color={b.ok ? '#2ecc71' : '#6b7280'} />
                    <Text style={{ color: TEXT, marginLeft: 8 }}>{b.t}</Text>
                  </View>
                ))}

                <Text style={{ color: TEXT, fontWeight: '700', marginTop: 6, fontFamily: 'Raleway_400Regular' }}>${offer.price}</Text>
              </ScrollView>

              <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#0E141C' }}>
                <TouchableOpacity style={{ height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>Book transfer now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function TimelineRow({ label, value, time, active, end }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
      <View style={{ width: 18, alignItems: 'center' }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? ACCENT : '#94a3b8', marginTop: 4 }} />
        {!end && <View style={{ width: 1, height: 30, backgroundColor: '#2d3748', marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{label}</Text>
        {!!value && <Text style={{ color: SUBTLE, fontSize: 12 }}>{value}</Text>}
        <Text style={{ color: TEXT, fontWeight: '700', marginTop: 2, fontFamily: 'Raleway_400Regular' }}>{time}</Text>
      </View>
    </View>
  );
}

// ---------- Booking screen ----------
function BookingScreen({ open, onClose, onFindTransfers }) {
  const [forMe, setForMe] = useState(true);
  const [agree, setAgree] = useState(false);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E141C' }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* radio */}
          <TouchableOpacity style={styles.radioRowTop} onPress={() => setForMe(true)}>
            <View style={[styles.radioOuter, forMe && styles.radioOuterOn]}>{forMe && <View style={styles.radioInner} />}</View>
            <Text style={{ color: TEXT, fontWeight: '600', fontFamily: 'Raleway_400Regular' }}>I'm the main passenger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioRowTop} onPress={() => setForMe(false)}>
            <View style={[styles.radioOuter, !forMe && styles.radioOuterOn]}>{!forMe && <View style={styles.radioInner} />}</View>
            <Text style={{ color: TEXT, fontFamily: 'Raleway_400Regular' }}>This booking is for another person</Text>
          </TouchableOpacity>

          {/* fields */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>{forMe ? 'Your full name' : "Passenger's full name"}</Text>
            <View style={styles.inputField}><TextInput placeholder={forMe ? 'Enter your full name' : "Enter passenger's full name"} placeholderTextColor={SUBTLE} style={{ color: TEXT }} /></View>

            <Text style={styles.fieldLabel}>{forMe ? 'Your email address' : "Passenger's email address"}</Text>
            <View style={styles.inputField}><TextInput placeholder={forMe ? 'Enter your email address' : "Enter passenger's email address"} placeholderTextColor={SUBTLE} style={{ color: TEXT }} keyboardType="email-address" /></View>

            <Text style={styles.fieldLabel}>{forMe ? 'Your phone number' : "Passenger's phone number"}</Text>
            <View style={styles.inputField}><TextInput placeholder="+7 912 345-67-89" placeholderTextColor={SUBTLE} style={{ color: TEXT }} keyboardType="phone-pad" /></View>
          </View>

          {/* agree */}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }} onPress={() => setAgree(!agree)}>
            <View style={[styles.checkbox, agree && styles.checkboxOn, { marginRight: 10 }]} />
            <Text style={{ color: TEXT }}>I agree to receive status updates via email & sms</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBar, { marginTop: 18 }]} onPress={onFindTransfers}>
            <Text style={styles.primaryBarText}>Find transfer</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Main ----------
export default function TransfersSearch() {
  const router = useRouter();

  const [mode, setMode] = useState('flight'); // 'flight' | 'pickup'
  const [from, setFrom] = useState('SVO Airport, Terminal D');
  const [to, setTo] = useState('');
  const [passengers, setPassengers] = useState({ adult: 1, booster: 0, child: 0, toddler: 0, infant: 0, bags: 1, childSeat: false });
  const [serviceClass, setServiceClass] = useState('prem');
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // datasets
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);

  // overlays
  const [addrOpen, setAddrOpen] = useState({ open: false, which: 'from' });
  const [paxOpen, setPaxOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const [fltrOpen, setFltrOpen] = useState(false);
  const [dtOpen, setDtOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const [flightFinderOpen, setFlightFinderOpen] = useState(false);
  const [flightSearchOpen, setFlightSearchOpen] = useState(false);

  const [recent, setRecent] = useState(['Melitopol Airport MHP', 'Manchester Piccadilly Station', 'SVO Airport, Terminal D']);

  const [pickupDate, setPickupDate] = useState({ date: null, time: null });
  const [flightNo, setFlightNo] = useState('');
  const [departureDate, setDepartureDate] = useState(null);

  // results & details & sort
  const [resultsOpen, setResultsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState('rec');
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickedOffer, setPickedOffer] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // preload airports & airlines
  useEffect(() => {
    (async () => {
      try {
        const [a1, a2] = await Promise.all([
          apiGet('/transfers/airports'),
          apiGet('/transfers/airlines'),
        ]);
        setAirports(a1?.airports || []);
        setAirlines(a2?.airlines || []);
      } catch {
        Alert.alert('Network', 'Failed to load airports/airlines');
      }
    })();
  }, []);

  const openAddr = (which) => setAddrOpen({ open: true, which });
  const onPickAddr = (val) => {
    if (addrOpen.which === 'from') setFrom(val); else setTo(val);
    setAddrOpen({ open: false, which: 'from' });
  };

  const summary = {
    route: (from && to) ? `${from.split(',')[0]} → ${to.split(',')[0]}` : 'Route',
    when: mode === 'pickup'
      ? (pickupDate.date ? `${pickupDate.date}, ${pickupDate.time}` : 'Select date & time')
      : (departureDate || 'Select date'),
  };

  const sortedOffers = useMemo(() => {
    let arr = [...offers];
    if (sortValue === 'cheap') arr.sort((a, b) => a.price - b.price);
    if (sortValue === 'fast') arr.sort((a, b) => (a.durationMin || 0) - (b.durationMin || 0));
    if (sortValue === 'early') arr.sort((a, b) => String(a.pickupAt || '').localeCompare(String(b.pickupAt || '')));
    return arr;
  }, [offers, sortValue]);

  const onContinue = () => setBookingOpen(true);

  const searchTransfers = async () => {
    setOffersLoading(true);
    try {
      const payload = {
        mode,
        from,
        to,
        pickup: mode === 'pickup' ? (pickupDate.date ? { date: pickupDate.date, time: pickupDate.time } : undefined) : undefined,
        flight: mode === 'flight' ? (flightNo ? { no: flightNo, departureDate } : undefined) : undefined,
        passengers,
        serviceClass,
        filters,
        sort: sortValue,
      };
      const data = await apiPost('/transfers/search', payload);
      setOffers(data?.offers || []);
      setResultsOpen(true);
    } catch (e) {
      setOffers([]);
      setResultsOpen(true);
    } finally {
      setOffersLoading(false);
    }
  };

  const onFindTransfers = () => {
    setBookingOpen(false);
    searchTransfers();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfers</Text>
        <View style={styles.headerRight}>
          <Ionicons name="bookmark-outline" size={18} color={TEXT} />
          <Ionicons name="share-social-outline" size={18} color={TEXT} style={{ marginLeft: 12 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* top chips row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTabsRow}>
          {[
            { key: 'bus', label: 'Bus Tickets', icon: 'bus-outline' },
            { key: 'car', label: 'Car Rentals', icon: 'car-outline' },
            { key: 'transfers', label: 'Transfers', icon: 'swap-horizontal' },
            { key: 'cr', label: 'Cruises', icon: 'boat-outline' },
          ].map((t, i) => (
            <View key={`tab-${t.key}`} style={[styles.topTab, i === 2 && styles.topTabActive]}>
              <Ionicons name={t.icon} size={14} color={i === 2 ? '#0E141C' : TEXT} />
              <Text style={[styles.topTabText, i === 2 && styles.topTabTextActive]}>{t.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* mode switch */}
        <View style={styles.segmentRow}>
          <TouchableOpacity onPress={() => setMode('flight')} style={[styles.segment, mode === 'flight' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'flight' && styles.segmentTextActive]}>By flight number</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('pickup')} style={[styles.segment, mode === 'pickup' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'pickup' && styles.segmentTextActive]}>By pick-up time</Text>
          </TouchableOpacity>
        </View>

        {/* search card */}
        <View style={styles.card}>
          {mode === 'flight' ? (
            <>
              <Text style={styles.labelSmall}>Arrival flight number</Text>
              <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => setFlightSearchOpen(true)}>
                <Text style={styles.inputText}>{flightNo || 'eg CX123'}</Text>
              </TouchableOpacity>

              <View style={{ height: 10 }} />
              <Text style={styles.labelSmall}>Where to?</Text>
              <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => openAddr('to')}>
                <Text style={styles.inputText}>{to || 'Destination address'}</Text>
              </TouchableOpacity>

              <View style={{ height: 10 }} />
              <Text style={styles.labelSmall}>Departure date?</Text>
              <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => setDtOpen(true)}>
                <Text style={styles.inputText}>{departureDate || 'Select date'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.labelSmall}>From</Text>
              <View style={{ position: 'relative' }}>
                <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => openAddr('from')}>
                  <Text style={styles.inputText} numberOfLines={1}>{from || 'Pickup location'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.swapBtn} onPress={() => [setFrom(to), setTo(from)]}>
                  <Ionicons name="swap-vertical" size={18} color={TEXT} />
                </TouchableOpacity>
              </View>

              <View style={{ height: 10 }} />
              <Text style={styles.labelSmall}>Where to?</Text>
              <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => openAddr('to')}>
                <Text style={styles.inputText}>{to || 'Destination address'}</Text>
              </TouchableOpacity>

              <View style={{ height: 10 }} />
              <Text style={styles.labelSmall}>When?</Text>
              <TouchableOpacity style={styles.inputRow} activeOpacity={0.9} onPress={() => setDtOpen(true)}>
                <Text style={styles.inputText}>{pickupDate.date ? `${pickupDate.date} · ${pickupDate.time}` : 'Select date & time'}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* passengers */}
          <View style={{ height: 10 }} />
          <Text style={styles.labelSmall}>Passengers</Text>
          <TouchableOpacity style={styles.inputRow} onPress={() => setPaxOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people" size={18} color={SUBTLE} />
              <Text style={{ color: TEXT, marginLeft: 8, fontFamily: 'Raleway_400Regular' }}>
                {passengers.adult} adult · {passengers.child} child · {passengers.bags} bag
              </Text>
            </View>
          </TouchableOpacity>

          {/* service class + filters row */}
          <View style={styles.duoRow}>
            <TouchableOpacity style={styles.duoField} onPress={() => setSvcOpen(true)}>
              <Ionicons name="car-outline" color={SUBTLE} size={16} />
              <Text style={styles.duoText}>Service Class</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.duoField} onPress={() => setFltrOpen(true)}>
              <Ionicons name="funnel-outline" color={SUBTLE} size={16} />
              <Text style={styles.duoText}>Filters</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBar} onPress={onContinue}>
            <Text style={styles.primaryBarText}>Continue</Text>
          </TouchableOpacity>
        </View>

        {/* activities */}
        <Text style={styles.sectionTitle}>Recommended Activities Nearby</Text>
        <Text style={{ color: SUBTLE, marginTop: -6, paddingHorizontal: 16, fontFamily: 'Raleway_400Regular' }}>Find amazing tours and experiences close to you</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {[
            { id: 1, title: 'Exploring Art at the Louvre Museum', city: 'Paris, France', price: 250, img: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?q=80&w=1400&auto=format&fit=crop' },
            { id: 2, title: 'Sightseeing in Paris', city: 'Paris, France', price: 500, img: 'https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=1400&auto=format&fit=crop' }
          ].map((a) => (
            <View key={`act-${a.id}`} style={styles.activityCard}>
              <Image source={{ uri: a.img }} style={{ width: 220, height: 120 }} />
              <View style={{ padding: 10 }}>
                <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }} numberOfLines={1}>{a.title}</Text>
                <Text style={{ color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>{a.city}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' }}>${a.price.toFixed(2)}</Text>
                  <TouchableOpacity style={styles.buyBtn}><Text style={styles.buyBtnText}>Buy tickets</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Modals */}
      <AddressModal open={addrOpen.open} onClose={() => setAddrOpen({ open: false, which: 'from' })} onPick={onPickAddr} recent={recent} onClearRecent={() => setRecent([])} />
      <PassengersModal open={paxOpen} onClose={() => setPaxOpen(false)} value={passengers} onSave={(v) => { setPassengers(v); setPaxOpen(false); }} />
      <ServiceClassModal open={svcOpen} onClose={() => setSvcOpen(false)} selected={serviceClass} onSave={(v) => { setServiceClass(v); setSvcOpen(false); }} />
      <FiltersModal open={fltrOpen} onClose={() => setFltrOpen(false)} values={filters} onSave={(v) => { setFilters(v); setFltrOpen(false); }} />
      <DateTimeModal open={dtOpen} onClose={() => setDtOpen(false)} date={pickupDate.date} onSave={(v) => { if (mode === 'pickup') setPickupDate(v); else setDepartureDate(v.date); setDtOpen(false); }} />

      {/* Booking */}
      <BookingScreen open={bookingOpen} onClose={() => setBookingOpen(false)} onFindTransfers={onFindTransfers} />

      {/* Flights search */}
      <FlightNumberSearch
        open={flightSearchOpen}
        onClose={() => setFlightSearchOpen(false)}
        onPick={(f) => { setFlightNo(f.no); setFlightSearchOpen(false); }}
        onFindMyFlight={() => { setFlightSearchOpen(false); setFlightFinderOpen(true); }}
      />
      <FindMyFlight
        open={flightFinderOpen}
        onClose={() => setFlightFinderOpen(false)}
        airports={airports}
        airlines={airlines}
      />

      {/* RESULTS layer */}
      <ResultsList
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        summary={summary}
        offers={sortedOffers}
        onPick={(o) => { setPickedOffer(o); setDetailOpen(true); }}
        onOpenFilters={() => setFltrOpen(true)}
        onOpenSort={() => setSortOpen(true)}
        onOpenClass={() => setSvcOpen(true)}
        loading={offersLoading}
      />
      <SortByModal open={sortOpen} onClose={() => setSortOpen(false)} value={sortValue} onSave={(v) => { setSortValue(v); setSortOpen(false); }} />
      <TransferDetails open={detailOpen} onClose={() => setDetailOpen(false)} offer={pickedOffer} />
    </SafeAreaView>
  );
}

// ---------------- Styles ----------------
const RADIUS = 14;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E141C' },

  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: TEXT, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', fontFamily: 'Raleway_400Regular' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  scrollContent: { paddingBottom: 24 },

  topTabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6, gap: 8 },
  topTab: { flexDirection: 'row', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, height: 32, gap: 6 },
  topTabActive: { backgroundColor: TEXT },
  topTabText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  topTabTextActive: { color: '#0E141C', fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  segmentRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 8, backgroundColor: '#0E1523', borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: CARD_BG },
  segmentText: { color: SUBTLE, fontSize: 12, fontFamily: 'Raleway_400Regular' },
  segmentTextActive: { color: TEXT, fontWeight: '600', fontFamily: 'Raleway_400Regular' },

  card: { backgroundColor: CARD_BG, borderRadius: RADIUS, marginTop: 12, marginHorizontal: 12, padding: 12, borderWidth: 1, borderColor: BORDER },
  labelSmall: { color: SUBTLE, fontSize: 11, marginBottom: 6, fontFamily: 'Raleway_400Regular' },
  inputRow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, justifyContent: 'center' },
  inputText: { color: TEXT, fontSize: 15, fontFamily: 'Raleway_400Regular' },
  swapBtn: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C2740', alignItems: 'center', justifyContent: 'center', borderColor: BORDER, borderWidth: 1 },

  duoRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  duoField: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  duoText: { color: TEXT, fontFamily: 'Raleway_400Regular' },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 10, paddingHorizontal: 16 },
  activityCard: { width: 220, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, marginRight: 12, overflow: 'hidden' },
  buyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: ACCENT },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Raleway_400Regular' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

  sheetSmall: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16 },
  sheetLarge: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16, maxHeight: Math.min(height * 0.9, 720) },
  sheetTitle: { color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 10, fontFamily: 'Raleway_400Regular' },

  // passengers rows
  paxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginVertical: 6 },
  paxLabel: { color: TEXT, fontSize: 15 },
  paxSub: { color: SUBTLE, fontSize: 11, marginTop: 2 },
  paxControls: { flexDirection: 'row', alignItems: 'center' },
  paxBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A3247', justifyContent: 'center', alignItems: 'center' },
  paxBtnText: { color: '#fff', fontSize: 20, lineHeight: 20, fontFamily: 'Raleway_400Regular' },
  paxCount: { color: TEXT, fontSize: 16, marginHorizontal: 12, fontFamily: 'Raleway_400Regular' },

  timeBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  timeWheel: { width: 64, height: 132, borderRadius: 12, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  timeItem: { height: 36, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: SUBTLE, fontSize: 16, fontFamily: 'Raleway_400Regular' },
  timeTextActive: { color: TEXT, fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  radioRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  radioRowTop: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  radioOuterOn: { borderColor: ACCENT },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },

  checkbox: { width: 18, height: 18, borderRadius: 4, backgroundColor: '#1a2133', borderWidth: 1, borderColor: BORDER },
  checkboxOn: { backgroundColor: ACCENT, borderColor: ACCENT },

  primaryBar: { height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryBarText: { color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' },
  primaryBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  selectorRow: { height: 48, borderRadius: 10, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },

  priceCaps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cap: { width: '48%', backgroundColor: '#0E1523', borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 10 },
  capLabel: { color: SUBTLE, fontSize: 11, marginBottom: 4, fontFamily: 'Raleway_400Regular' },
  capValue: { color: TEXT, fontSize: 14, fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel: { color: TEXT, fontSize: 13 },

  switch: { width: 50, height: 30, borderRadius: 16, backgroundColor: '#263149', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: ACCENT },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT, alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },

  flightRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },

  // results list
  resultsLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0E141C', zIndex: 20, elevation: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryPill: { paddingHorizontal: 10, height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD_BG, justifyContent: 'center' },
  summaryPillText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },

  resChip: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD_BG, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  resChipText: { color: TEXT, fontSize: 12, fontFamily: 'Raleway_400Regular' },

  resultCard: { marginHorizontal: 12, marginTop: 10, backgroundColor: CARD_BG, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER, padding: 12 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f1a2e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#0E1523', borderWidth: 1, borderColor: BORDER },
  badgePrimary: { backgroundColor: '#163777', borderColor: '#163777' },
  badgeText: { color: SUBTLE, fontSize: 11, fontFamily: 'Raleway_400Regular' },
  badgeTextPrimary: { color: '#fff', fontWeight: '700', fontFamily: 'Raleway_400Regular' },

  // inputs in Booking
  fieldLabel: { color: SUBTLE, fontSize: 12, marginTop: 10, marginBottom: 6, fontFamily: 'Raleway_400Regular' },
  inputField: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#0E1523', paddingHorizontal: 12, justifyContent: 'center' },

  // range slider visuals
  rsWrap: { height: 40, justifyContent: 'center' },                       // taller wrap
  rsTrack: { position: 'absolute', left: 0, right: 0, top: 18, height: 4, backgroundColor: BORDER, borderRadius: 2 }, // track at y=18
  rsRange: { position: 'absolute', top: 18, height: 4, backgroundColor: ACCENT, borderRadius: 2 },
  rsThumb: { position: 'absolute', top: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: TEXT }, // thumb center aligns with track
  rsThumbActive: { transform: [{ scale: 1.05 }] },
});


