// components/ResultsOverlay.jsx
import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResultsOverlay({
  offers = [],
  loading = false,
  titleText = '',
  onBack,
  onOpenDetails,
  onOpenPriceChart,
  onOpenFilters,
  onOpenPassengers,
}) {
  return (
    <SafeAreaView
      style={S.root}
      edges={['top', 'bottom', 'left', 'right']}
    >
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity
          onPress={onBack}
          style={S.headerBtn}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#E9EEF8"
          />
        </TouchableOpacity>
        <Text
          style={S.headerTitle}
          numberOfLines={1}
        >
          {titleText}
        </Text>
        <View style={S.headerSpacer} />
      </View>

      {/* Quick chips */}
      <View style={S.chipsRow}>
        <TouchableOpacity
          style={S.chip}
          onPress={onOpenFilters}
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color="#E9EEF8"
          />
          <Text style={S.chipText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.chip}>
          <Ionicons
            name="swap-vertical"
            size={14}
            color="#E9EEF8"
          />
          <Text style={S.chipText}>Sort by</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={S.chip}
          onPress={onOpenPassengers}
        >
          <Ionicons
            name="people"
            size={14}
            color="#E9EEF8"
          />
          <Text style={S.chipText}>
            Passengers
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={S.stateWrap}>
            <Text style={S.stateText}>
              Loading offers…
            </Text>
          </View>
        ) : !offers.length ? (
          <View style={S.stateWrap}>
            <Text style={S.stateText}>
              No offers found. Try different
              dates or airports.
            </Text>
          </View>
        ) : (
          offers.map((o) => (
            <TouchableOpacity
              key={o.id}
              activeOpacity={0.9}
              onPress={() =>
                onOpenDetails?.(o)
              }
              style={S.card}
            >
              <View style={S.row}>
                <Text style={S.time}>
                  {o.depart}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.airline}>
                    {o.airline ||
                      'Flight'}
                  </Text>
                  <Text style={S.meta}>
                    {o.duration}
                    {typeof o.stops ===
                      'number' &&
                      ` · ${
                        o.stops === 0
                          ? 'Direct'
                          : `${o.stops} stop${
                              o.stops >
                              1
                                ? 's'
                                : ''
                            }`
                      }`}
                  </Text>
                </View>
                <Text style={S.time}>
                  {o.arrive}
                </Text>
              </View>

              <View style={S.routeRow}>
                <Text style={S.apt}>
                  {o.airportFrom}
                </Text>
                <View
                  style={S.routeDivider}
                />
                <Text style={S.apt}>
                  {o.airportTo}
                </Text>
              </View>

              <View style={S.footer}>
                <TouchableOpacity
                  onPress={
                    onOpenPriceChart
                  }
                >
                  <Text style={S.price}>
                    from ${o.price}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={S.buyBtn}
                  onPress={() =>
                    onOpenDetails?.(o)
                  }
                >
                  <Text style={S.buyText}>
                    Buy ticket
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={S.chartBtn}
          onPress={onOpenPriceChart}
        >
          <Ionicons
            name="stats-chart"
            size={16}
            color="#E9EEF8"
          />
          <Text style={S.chartBtnText}>
            Price chart
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E141C' },

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
  headerSpacer: { width: 36 },

  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#283142',
    backgroundColor: '#121826',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chipText: {
    color: '#E9EEF8',
    fontSize: 12,
  },

  stateWrap: { padding: 16 },
  stateText: { color: '#8A93A0' },

  card: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#121826',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#283142',
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    color: '#E9EEF8',
    fontSize: 16,
    fontWeight: '700',
    width: 56,
    textAlign: 'center',
  },
  airline: {
    color: '#E9EEF8',
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: '#8A93A0',
    fontSize: 12,
    marginTop: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
    paddingHorizontal: 6,
  },
  apt: {
    color: '#8A93A0',
    fontSize: 12,
  },
  routeDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#283142',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  price: {
    color: '#E9EEF8',
    fontWeight: '700',
  },
  buyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2F6BFF',
  },
  buyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  chartBtn: {
    marginHorizontal: 12,
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#11214a',
    borderWidth: 1,
    borderColor: '#283142',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chartBtnText: {
    color: '#E9EEF8',
    fontWeight: '700',
  },
});
