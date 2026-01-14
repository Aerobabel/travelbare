import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripDetailsModal({
  visible,
  onClose,
  selectedOffer,
  tripType,        // 'oneway' | 'round' | 'multi'
  legs = [],
  fromLabel,
  toLabel,
  onBuy,
  loading = false,
}) {
  const insets = useSafeAreaInsets();
  // ...
  // (inside return footer)
  <View style={S.footer}>
    <TouchableOpacity
      style={[S.buyBtn, loading && { opacity: 0.7 }]}
      onPress={loading ? null : onBuy}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={S.buyText}>Buy Ticket</Text>
      )}
    </TouchableOpacity>
  </View>
  if (!visible || !selectedOffer) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={onClose}
        hardwareAccelerated
      >
        <View style={S.modalRoot}>
          <View style={S.sheet}>
            <View style={[S.header, { marginTop: insets.top }]}>
              <TouchableOpacity onPress={onClose} style={S.headerBtn}>
                <Ionicons name="chevron-back" size={22} color="#E9EEF8" />
              </TouchableOpacity>
              <Text style={S.headerTitle}>Trip Details</Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={S.stateText}>No trip selected.</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const codeFrom = extractCode(fromLabel) || selectedOffer.airportFrom || '';
  const codeTo = extractCode(toLabel) || selectedOffer.airportTo || '';

  const raw = selectedOffer._raw || {};
  const itineraries = Array.isArray(raw.itineraries) && raw.itineraries.length
    ? raw.itineraries
    : buildFallbackItineraries(selectedOffer);

  const totalPrice = Math.round(Number(selectedOffer.price || 0)) || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
      hardwareAccelerated
    >
      <View style={S.modalRoot}>
        <View style={S.sheet}>
          {/* Header */}
          <View style={[S.header, { marginTop: insets.top }]}>
            <TouchableOpacity onPress={onClose} style={S.headerBtn}>
              <Ionicons name="chevron-back" size={22} color="#E9EEF8" />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Trip Details</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
            {itineraries.map((it, idx) => {
              const segs = it.segments || [];
              if (!segs.length) return null;

              const first = segs[0];
              const last = segs[segs.length - 1];

              const legLabel =
                itineraries.length === 1
                  ? 'Journey'
                  : idx === 0
                    ? 'Outbound'
                    : idx === 1 && tripType === 'round'
                      ? 'Return'
                      : `Leg ${idx + 1}`;

              const from = first.departure?.iataCode || '';
              const to = last.arrival?.iataCode || '';
              const totalDuration = formatIsoDuration(it.duration);
              const stops = Math.max(0, segs.length - 1);
              const viaCodes =
                stops > 0
                  ? segs.slice(0, -1).map((s) => s.arrival?.iataCode).filter(Boolean)
                  : [];

              return (
                <View key={`it_${idx}`} style={S.card}>
                  {/* Card header */}
                  <View style={S.cardHead}>
                    <MaterialCommunityIcons
                      name="airplane"
                      size={18}
                      color="#8A93A0"
                    />
                    <Text style={S.cardHeadText}>
                      {legLabel}: {from} – {to}
                    </Text>
                  </View>

                  {/* Summary line */}
                  <Text style={S.cardSubTop}>
                    {totalDuration}
                    {stops === 0
                      ? ' · Direct'
                      : ` · ${stops} stop${stops > 1 ? 's' : ''}${viaCodes.length
                        ? ` via ${viaCodes.join(', ')}`
                        : ''
                      }`}
                  </Text>

                  <View style={S.divider} />

                  {/* Segment timeline */}
                  {segs.map((seg, i) => {
                    const dep = seg.departure || {};
                    const arr = seg.arrival || {};
                    const depTime = formatTime(dep.at);
                    const arrTime = formatTime(arr.at);
                    const depDate = formatDate(dep.at);
                    const arrDate = formatDate(arr.at);
                    const dur = formatIsoDuration(seg.duration);
                    const carrier = seg.carrierCode || selectedOffer.airline || '';
                    const flightNum =
                      seg.number != null
                        ? `${carrier} ${seg.number}`
                        : carrier || 'Flight';

                    // Layover (to next segment)
                    let layoverLine = null;
                    if (i < segs.length - 1) {
                      const currentArr = new Date(
                        arr.at
                      );
                      const nextDep = new Date(
                        segs[i + 1].departure.at
                      );
                      const diffMin =
                        (nextDep - currentArr) /
                        60000;
                      if (diffMin > 0) {
                        layoverLine =
                          formatLayover(
                            diffMin,
                            arr.iataCode
                          );
                      }
                    }

                    return (
                      <View key={`seg_${idx}_${i}`} style={S.segmentBlock}>
                        {/* Row: times + route */}
                        <View style={S.segmentRow}>
                          <View style={S.timeCol}>
                            <Text style={S.timeMain}>{depTime}</Text>
                            <Text style={S.timeSub}>{depDate}</Text>
                          </View>

                          <View style={S.segmentMid}>
                            <View style={S.dot} />
                            <View style={S.line} />
                            <View style={S.dot} />
                          </View>

                          <View style={S.timeCol}>
                            <Text style={S.timeMain}>{arrTime}</Text>
                            <Text style={S.timeSub}>{arrDate}</Text>
                          </View>
                        </View>

                        {/* Route labels */}
                        <View style={S.segmentAirports}>
                          <Text style={S.airportCode}>{dep.iataCode}</Text>
                          <Text style={S.segmentMeta}>{dur}</Text>
                          <Text style={S.airportCode}>{arr.iataCode}</Text>
                        </View>

                        {/* Airline / flight */}
                        <Text style={S.segmentFlight}>
                          {flightNum}
                          {seg.aircraft?.code
                            ? ` · Aircraft ${seg.aircraft.code}`
                            : ''}
                        </Text>

                        {/* Layover info */}
                        {layoverLine && (
                          <Text style={S.layoverText}>{layoverLine}</Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Simple cabin/conditions placeholder */}
                  <View style={S.divider} />
                  <Text style={S.cabinTitle}>Fare conditions</Text>
                  <View style={{ gap: 4 }}>
                    <Text style={S.bullet}>• Cabin: Economy (from search)</Text>
                    <Text style={S.bullet}>• Sample: Hand luggage may vary by airline</Text>
                    <Text style={S.bullet}>• Exact rules shown on booking page</Text>
                  </View>
                </View>
              );
            })}

            {/* Multi-city manual legs summary (if no raw itineraries) */}
            {tripType === 'multi' && itineraries.length === 0 && legs.length > 0 && (
              <View style={S.card}>
                <View style={S.cardHead}>
                  <MaterialCommunityIcons name="airplane" size={18} color="#8A93A0" />
                  <Text style={S.cardHeadText}>Multi-city itinerary</Text>
                </View>
                {legs.map((l, i) => (
                  <View key={`m_${i}`} style={{ marginTop: 6 }}>
                    <Text style={S.segmentFlight}>
                      Leg {i + 1}: {(l.from || 'City A')} → {(l.to || 'City B')} on {l.date || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 12 }} />
            <Text style={S.totalText}>
              ${totalPrice} for 1 ticket
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={S.footer}>
            <TouchableOpacity
              style={[S.buyBtn, loading && { opacity: 0.7 }]}
              onPress={loading ? null : onBuy}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={S.buyText}>Buy Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* --------- helpers ---------- */

function extractCode(label) {
  if (!label) return null;
  const s = String(label).trim();
  const m1 = /\(([A-Z]{3})\)/i.exec(s);
  if (m1) return m1[1].toUpperCase();
  const parts = s.split(',').map((t) => t.trim());
  const last = parts[parts.length - 1] || s;
  if (/^[A-Za-z]{3}$/.test(last)) return last.toUpperCase();
  if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();
  return null;
}

// Fallback if _raw missing
function buildFallbackItineraries(offer) {
  if (!offer) return [];
  return [
    {
      duration: offer.duration || '',
      segments: [
        {
          departure: {
            iataCode: offer.airportFrom || '',
            at: dummyDateWithTime(offer.depart),
          },
          arrival: {
            iataCode: offer.airportTo || '',
            at: dummyDateWithTime(offer.arrive),
          },
          duration: offer.duration || '',
          carrierCode: offer.airline || '',
          number: '',
        },
      ],
    },
  ];
}

function dummyDateWithTime(timeStr) {
  if (!timeStr) return new Date().toISOString();
  // timeStr: "HH:MM"
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

function formatTime(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

function formatIsoDuration(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  const hours = h ? parseInt(h[1], 10) : 0;
  const mins = m ? parseInt(m[1], 10) : 0;
  if (!hours && !mins) return '';
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatLayover(mins, airportCode) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const dur =
    h && m
      ? `${h}h ${m}m`
      : h
        ? `${h}h`
        : `${m}m`;
  return `Layover ${dur} in ${airportCode || 'transfer airport'}`;
}

/* --------- styles ---------- */

const S = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#0E141C',
  },

  header: {
    height: 48,
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
    color: '#E9EEF8',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  stateText: {
    color: '#8A93A0',
  },

  card: {
    backgroundColor: '#121826',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#283142',
    padding: 14,
    marginBottom: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardHeadText: {
    color: '#E9EEF8',
    fontWeight: '700',
  },
  cardSubTop: {
    color: '#8A93A0',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#283142',
    marginVertical: 10,
  },

  segmentBlock: {
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeCol: {
    width: 72,
  },
  timeMain: {
    color: '#E9EEF8',
    fontSize: 15,
    fontWeight: '700',
  },
  timeSub: {
    color: '#8A93A0',
    fontSize: 10,
  },
  segmentMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F6BFF',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#283142',
    marginHorizontal: 4,
  },

  segmentAirports: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  airportCode: {
    color: '#E9EEF8',
    fontWeight: '700',
    fontSize: 12,
  },
  segmentMeta: {
    flex: 1,
    textAlign: 'center',
    color: '#8A93A0',
    fontSize: 10,
  },
  segmentFlight: {
    color: '#8A93A0',
    fontSize: 11,
    marginTop: 2,
  },
  layoverText: {
    color: '#FFB74D',
    fontSize: 11,
    marginTop: 4,
  },

  cabinTitle: {
    color: '#E9EEF8',
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 13,
  },
  bullet: {
    color: '#8A93A0',
    fontSize: 11,
  },

  totalText: {
    color: '#E9EEF8',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },

  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#283142',
    backgroundColor: '#0E141C',
  },
  buyBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2F6BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: {
    color: '#fff',
    fontWeight: '700',
  },
});
