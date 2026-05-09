// app/TripDetails.jsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, LayoutAnimation, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import PaymentSheet from '../components/PaymentSheet';
import RouteMap from '../components/RouteMap';
import { useTheme } from '../context/ThemeContext';

const EDIT_PLAN_STORAGE_KEY = 'travel_edit_plan_context';
const EDIT_PLAN_PROMPT_STORAGE_KEY = 'travel_edit_plan_prompt';
const EDIT_PLAN_RETURN_STORAGE_KEY = 'travel_edit_plan_return_context';

const ICON_MAP = {
  // Activity / Sites
  activity: "camera-outline",
  museum: "color-palette-outline",
  park: "leaf-outline",
  beach: "water-outline",
  hiking: "walk-outline",
  landmark: "map-outline",
  tour: "flag-outline",

  // Food
  food: "restaurant-outline",
  restaurant: "restaurant-outline",
  cafe: "cafe-outline",
  bar: "beer-outline",
  lunch: "pizza-outline",
  dinner: "wine-outline",
  breakfast: "cafe-outline",

  // Transport
  flight: "airplane-outline",
  travel: "car-outline",
  transport: "bus-outline",
  transit: "subway-outline",
  car: "car-outline",
  taxi: "car-outline",
  transfer: "car-outline",

  // Stay
  hotel: "bed-outline",
  stay: "bed-outline",
  accommodation: "business-outline",
  resort: "key-outline",
};

// Helper: safe weather icon
const getSafeWeatherIcon = (rawIcon) => {
  if (!rawIcon) return "partly-sunny-outline";
  const str = String(rawIcon).toLowerCase();

  // Pass through if valid outline
  if (str.includes('sunny-outline') || str.includes('rainy-outline') || str.includes('cloudy-outline') || str.includes('partly-sunny-outline')) return str;

  // Map known keywords
  if (str.includes("sun") && !str.includes('partly')) return "sunny-outline";
  if (str.includes("partly")) return "partly-sunny-outline";
  if (str.includes("cloud")) return "cloudy-outline";
  if (str.includes("rain")) return "rainy-outline";
  if (str.includes("snow")) return "snow-outline";
  if (str.includes("thunder")) return "thunderstorm-outline";

  // Handle emojis
  if (str.includes("☀️")) return "sunny-outline";
  if (str.includes("☁️")) return "cloudy-outline";
  if (str.includes("🌧️")) return "rainy-outline";

  return "partly-sunny-outline";
};

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isValidCoordinate = (latitude, longitude) =>
  latitude !== null &&
  longitude !== null &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const hasCoordinates = (event) =>
  isValidCoordinate(toNumber(event?.latitude), toNumber(event?.longitude));

const eventSearchText = (event) =>
  [event?.type, event?.icon, event?.title, event?.details, event?.provider]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const isTransferEvent = (event) => {
  const text = eventSearchText(event);
  return event?.type === 'transfer' ||
    event?.icon === 'transfer' ||
    /\btransfer\b|\btaxi\b|\bchauffeur\b|\bdriver\b|\bshuttle\b|\bferry\b|\bboat\b|\bhotel to airport\b|\bto airport\b|\bfrom airport\b/.test(text);
};

const isFlightEvent = (event) => {
  const text = eventSearchText(event);
  if (isTransferEvent(event)) return false;
  return event?.type === 'flight' ||
    event?.icon === 'flight' ||
    /\bflight\b/.test(text) ||
    /\bairways?\b|\bairlines?\b/.test(text);
};

const isGroundRouteStop = (event) =>
  hasCoordinates(event) &&
  !isFlightEvent(event) &&
  event?.coordinateConfidence !== 'city_level';

const previousGroundRouteStop = (events = [], index = 0) => {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (isGroundRouteStop(events[i])) return events[i];
  }
  return null;
};

const eventIdSet = (events = []) =>
  new Set(events.map((event, index) => event?.id || `event-${index}`));

const filterGroundRouteLegs = (legs = [], stops = []) => {
  const ids = eventIdSet(stops);
  return legs.filter((leg) => {
    const distanceMeters = toNumber(leg?.distanceMeters) || 0;
    const connectsVisibleStops = ids.has(leg?.fromEventId) && ids.has(leg?.toEventId);
    return connectsVisibleStops && distanceMeters > 0 && distanceMeters < 50000;
  });
};

const fullTripRoute = (plan) => ({
  events: (plan?.itinerary || []).flatMap((day) => day.events || []).filter(isGroundRouteStop),
  legs: (plan?.itinerary || []).flatMap((day) => {
    const stops = (day.events || []).filter(isGroundRouteStop);
    return filterGroundRouteLegs(day.routeLegs || [], stops);
  }),
  bounds: plan?.mapBounds,
});

const routeForDay = (day, fallbackPlan = null) => {
  const events = (day?.events || []).filter(isGroundRouteStop);
  const legs = filterGroundRouteLegs(day?.routeLegs || [], events);

  if (events.length || legs.length) {
    return {
      events,
      legs,
      bounds: day?.mapBounds || null,
    };
  }

  return fallbackPlan ? fullTripRoute(fallbackPlan) : null;
};

const routeForEvent = (day, event, prevEvent) => {
  if (!isGroundRouteStop(event)) return null;
  const leg = (day?.routeLegs || []).find((item) => item.toEventId === event?.id);
  if (leg && prevEvent && isGroundRouteStop(prevEvent)) {
    return {
      events: [prevEvent, event].filter(hasCoordinates),
      legs: [leg],
      bounds: null,
    };
  }

  if (prevEvent && hasCoordinates(prevEvent) && hasCoordinates(event)) {
    return {
      start: [prevEvent.longitude, prevEvent.latitude],
      end: [event.longitude, event.latitude],
    };
  }

  if (hasCoordinates(event)) {
    return { start: [event.longitude, event.latitude] };
  }

  return null;
};

const googleMapsUrlForEvent = (event) => {
  if (isFlightEvent(event)) return null;
  if (event?.googleMapsUrl) return event.googleMapsUrl;

  const latitude = toNumber(event?.latitude);
  const longitude = toNumber(event?.longitude);
  const label = [event?.title, event?.address].filter(Boolean).join(', ');

  const params = new URLSearchParams();
  if (label) params.set('query', label);
  if (event?.placeId && label) params.set('query_place_id', event.placeId);

  if (!params.has('query') && latitude !== null && longitude !== null) {
    params.set('query', `${latitude},${longitude}`);
  }

  if (!params.has('query')) return null;
  return `https://www.google.com/maps/search/?api=1&${params.toString()}`;
};

const formatShortDate = (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr || '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const normalizeDurationText = (value = '') =>
  String(value || '').trim().replace(/\s+/g, '');

const extractDurationFromDetails = (details = '') => {
  const text = String(details || '');
  const match = text.match(/(?:total\s+duration|duration)\s*(?:about|approx(?:imately)?)?\s*([0-9]{1,2}\s*h(?:\s*[0-9]{1,2}\s*m)?)/i);
  return match?.[1] ? normalizeDurationText(match[1]) : '';
};

const isGenericEventDuration = (duration = '') => {
  const normalized = normalizeDurationText(duration).toLowerCase();
  return normalized === '1h' || normalized === '2h' || normalized === '1hour' || normalized === '2hours';
};

const displayDurationForEvent = (event) => {
  if (isFlightEvent(event)) {
    return extractDurationFromDetails(event?.details) || normalizeDurationText(event?.duration) || 'Flight';
  }
  const duration = normalizeDurationText(event?.duration);
  if (!duration || isGenericEventDuration(duration)) return '';
  return duration;
};

const displayTitleForEvent = (event) => {
  if (isTransferEvent(event) && /flight\s*(?:segment|return segment)/i.test(String(event?.title || ''))) {
    return 'Private transfer to airport';
  }
  return event?.title || '';
};

const allTripEvents = (plan) =>
  (plan?.itinerary || []).flatMap((day) =>
    (day.events || []).map((event) => ({ ...event, dayDate: day.date, dayLabel: day.day }))
  );

const eventTimeValue = (event) => {
  const raw = String(event?.time || '');
  const [hour, minute] = raw.split(':').map((part) => Number(part));
  if (!Number.isFinite(hour)) return 9999;
  return hour * 60 + (Number.isFinite(minute) ? minute : 0);
};

const selectedTripDay = (plan, selectedDate) =>
  (plan?.itinerary || []).find((day) => day.date === selectedDate) ||
  (plan?.itinerary || [])[0] ||
  null;

const nextMeaningfulEvent = (day) =>
  [...(day?.events || [])]
    .sort((a, b) => eventTimeValue(a) - eventTimeValue(b))
    .find((event) => !isFlightEvent(event)) ||
  (day?.events || [])[0] ||
  null;

const bookingUrlForItem = (item) => {
  const raw = String(item?.booking_url || item?.bookingUrl || '').trim();
  if (!raw || raw === '#') return '';
  return raw;
};

const bookingStatusForItem = (item) => {
  if (bookingUrlForItem(item)) return { label: 'Ready', tone: 'blue' };
  const confidence = item?.sourceConfidence?.confidence;
  if (confidence === 'high') return { label: 'Check', tone: 'neutral' };
  return { label: 'Needs link', tone: 'warn' };
};

const bookingIconForItem = (item) => {
  const text = [item?.item, item?.provider, item?.details].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('flight')) return 'airplane-outline';
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation')) return 'bed-outline';
  if (text.includes('transfer') || text.includes('taxi')) return 'car-outline';
  if (text.includes('insurance')) return 'shield-checkmark-outline';
  if (text.includes('tour') || text.includes('ticket') || text.includes('excursion')) return 'ticket-outline';
  return 'bag-check-outline';
};

const buildMemorySignals = (plan) => {
  const signals = [];
  const neighborhoods = plan?.travelIntel?.neighborhoods || [];
  if (neighborhoods[0]?.name) signals.push(`Base cluster: ${neighborhoods[0].name}`);
  if ((plan?.costBreakdown || []).some((item) => /seafood|crab|restaurant/i.test(`${item.item} ${item.details}`))) {
    signals.push('Food-led itinerary');
  }
  if (allTripEvents(plan).some((event) => eventTimeValue(event) >= 22 * 60)) {
    signals.push('Late-night transfer care');
  }
  if (allTripEvents(plan).some((event) => /cruise|boat|sandbank|snorkel|beach/i.test(eventSearchText(event)))) {
    signals.push('Water experiences');
  }
  if (plan?.planQuality?.score) signals.push(`Quality target ${plan.planQuality.score}/100`);
  return signals.slice(0, 5);
};

const openExternal = (url) => {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
};

const sourceLabel = (sourceConfidence = {}) => {
  const confidence = sourceConfidence.confidence || 'medium';
  const source = sourceConfidence.source || sourceConfidence.category || 'source';
  return `${confidence} - ${source.replace(/_/g, ' ')}`;
};

const InlineChip = ({ icon, text, tone = 'neutral' }) => {
  const { colors, theme } = useTheme();
  const bg = tone === 'blue'
    ? 'rgba(62, 111, 255, 0.16)'
    : tone === 'warn'
      ? 'rgba(245, 158, 11, 0.16)'
    : theme === 'dark' ? '#101620' : '#F3F4F6';
  const chipColor = tone === 'blue'
    ? '#3E6FFF'
    : tone === 'warn'
      ? '#F59E0B'
      : colors.textSecondary;
  return (
    <View style={[styles.inlineChip, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={chipColor} /> : null}
      <Text style={[styles.inlineChipText, { color: chipColor }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
};

const PlanInsights = ({ plan, onOpenMap }) => {
  const { colors, theme } = useTheme();
  const quality = plan?.planQuality;
  const travelIntel = plan?.travelIntel || {};
  const neighborhoods = travelIntel.neighborhoods || [];

  if (!quality && !travelIntel.weather && !plan?.routeSummary) return null;

  return (
    <View style={styles.insightsWrap}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onOpenMap}
        style={[styles.insightRow, { backgroundColor: theme === 'dark' ? '#171E27' : '#F8FAFC', borderColor: colors.cardBorder }]}
      >
        <View style={styles.insightIcon}>
          <Ionicons name="map-outline" size={20} color="#3E6FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.insightTitle, { color: colors.text }]}>Route intelligence</Text>
          <Text style={[styles.insightText, { color: colors.textSecondary }]} numberOfLines={2}>
            {plan.routeSummary || 'Map-ready route with enriched stops'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.insightChips}>
        {quality ? <InlineChip icon="shield-checkmark-outline" text={`Quality ${quality.score}/100`} tone="blue" /> : null}
        {plan.exactPlaceCount ? <InlineChip icon="location-outline" text={`${plan.exactPlaceCount} exact places`} /> : null}
        {travelIntel.weather?.summary ? <InlineChip icon="partly-sunny-outline" text={travelIntel.weather.summary} /> : null}
        {travelIntel.visa?.status ? <InlineChip icon="document-text-outline" text={`Visa: ${travelIntel.visa.status.replace(/_/g, ' ')}`} /> : null}
        {neighborhoods[0]?.name ? <InlineChip icon="trail-sign-outline" text={neighborhoods[0].name} /> : null}
      </View>
    </View>
  );
};

const InformationView = ({ plan, selectedDate, setSelectedDate }) => {
  const { colors, theme } = useTheme();
  const selectedDayData = plan.itinerary.find((day) => day.date === selectedDate);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <>
      <FlatList
        horizontal
        data={plan.itinerary}
        keyExtractor={(item) => item.date}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelector}
        renderItem={({ item }) => {
          const dateParts = item.day ? item.day.split(' ') : [];
          const month = dateParts[0] || 'N/A';
          const dayNum = dateParts[1] || '';
          const isActive = item.date === selectedDate;

          return (
            <TouchableOpacity
              style={[
                styles.dayChip,
                { backgroundColor: theme === 'light' ? (isActive ? '#3E6FFF' : '#F3F4F6') : (isActive ? '#1C222C' : '#1C222C') },
                theme === 'light' && !isActive && { borderWidth: 1, borderColor: '#ccc' },
                theme === 'dark' && !isActive && { backgroundColor: '#1C222C' },
                theme === 'dark' && isActive && { backgroundColor: 'transparent' }
              ]}
              onPress={() => setSelectedDate(item.date)}
            >
              {/* Top Half (Month) - Blue when active */}
              <View style={[
                styles.dayChipMonthContainer,
                { backgroundColor: isActive ? '#0066FF' : (theme === 'dark' ? '#2A3441' : 'transparent') }
              ]}>
                <Text style={[
                  styles.dayChipMonthText,
                  { color: isActive ? '#fff' : colors.textTertiary }
                ]}>
                  {month}
                </Text>
              </View>
              {/* Bottom Half (Day) - Dark/Transparent */}
              <View style={[
                styles.dayChipDayContainer,
                { backgroundColor: isActive ? (theme === 'dark' ? '#1C222C' : 'transparent') : 'transparent' }
              ]}>
                <Text style={[
                  styles.dayChipDayText,
                  { color: isActive ? (theme === 'dark' ? '#fff' : '#fff') : colors.text }
                ]}>
                  {dayNum}
                </Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />
      <View style={styles.eventList}>
        {selectedDayData?.events.map((event, index) => (
          <React.Fragment key={index}>
            <ExpandableEventItem
              event={event}
              prevEvent={previousGroundRouteStop(selectedDayData.events, index)}
              day={selectedDayData}
              expanded={expandedIndex === index}
              onToggle={() => toggleExpand(index)}
            />
          </React.Fragment>
        ))}
      </View>
      {selectedDayData?.routeSummary ? (
        <View style={[styles.dayRouteSummary, { backgroundColor: theme === 'dark' ? '#101620' : '#F8FAFC', borderColor: colors.cardBorder }]}>
          <Ionicons name="git-branch-outline" size={18} color="#3E6FFF" />
          <Text style={[styles.dayRouteText, { color: colors.textSecondary }]}>{selectedDayData.routeSummary}</Text>
        </View>
      ) : null}
    </>
  );
};

const ExpandableEventItem = ({ event, prevEvent, day, expanded, onToggle }) => {
  const { colors, theme } = useTheme();
  const leg = (day?.routeLegs || []).find((item) => item.toEventId === event?.id);
  const mapRoute = routeForEvent(day, event, prevEvent);
  const openingHours = Array.isArray(event.openingHours) ? event.openingHours.slice(0, 2) : [];
  const googleMapsUrl = googleMapsUrlForEvent(event);
  const displayDuration = displayDurationForEvent(event);
  const isFlight = isFlightEvent(event);
  const iconName = isTransferEvent(event)
    ? 'car-outline'
    : ICON_MAP[event.icon] || ICON_MAP[event.type] || 'ellipse-outline';

  return (
    <View style={{ marginBottom: 10 }}>
      {/* Timeline */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 24, width: 2, alignItems: 'center' }}>
        <View style={{ width: 2, flex: 1, backgroundColor: theme === 'dark' ? '#1E2A3A' : '#E5E7EB' }} />
      </View>
      <View style={{ position: 'absolute', top: 20, left: 19, width: 12, height: 12, borderRadius: 6, backgroundColor: theme === 'dark' ? '#1E2A3A' : '#E5E7EB', zIndex: 1 }} />

      <TouchableOpacity activeOpacity={0.8} onPress={onToggle} style={{ marginLeft: 48 }}>
        <View style={[
          styles.eventCard,
          { backgroundColor: colors.card },
          theme === 'light' ? {
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
          } : {
            backgroundColor: '#171E27', // Glassy look for dark
            borderWidth: 1,
            borderColor: '#2A3441'
          }
        ]}>
          <View style={[styles.eventIconContainer, { backgroundColor: theme === 'dark' ? '#101620' : '#F3F4F6' }]}>
            <Ionicons name={iconName} size={24} color="#3E6FFF" />
          </View>
          <View style={styles.eventDetails}>
            <Text style={[styles.eventTime, { color: colors.text }]}>{event.time}</Text>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{displayTitleForEvent(event)}</Text>
            <Text
              style={[styles.eventSubtext, { color: colors.textSecondary }]}
              numberOfLines={isFlight ? 4 : 2}
            >
              {event.details}
            </Text>
            <View style={styles.eventMetaRow}>
              {event.rating ? <InlineChip icon="star" text={`${event.rating}`} /> : null}
              {event.neighborhood ? <InlineChip icon="trail-sign-outline" text={event.neighborhood} /> : null}
              {event.openNow !== undefined && event.openNow !== null ? <InlineChip icon="time-outline" text={event.openNow ? 'Open now' : 'Hours vary'} /> : null}
            </View>
          </View>
          {displayDuration ? (
            <Text style={[styles.eventDuration, { color: colors.textTertiary }]}>{displayDuration}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.eventExpansion, { marginLeft: 48 }]}>
          {event.photoUrl ? <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} /> : null}
          {leg && mapRoute ? (
            <View style={[styles.routeLegPill, { backgroundColor: theme === 'dark' ? '#101620' : '#F3F4F6' }]}>
              <Ionicons name={leg.mode === 'walking' ? 'walk-outline' : leg.mode === 'transit' ? 'subway-outline' : 'car-outline'} size={16} color="#3E6FFF" />
              <Text style={[styles.routeLegText, { color: colors.textSecondary }]}>
                {leg.durationText} - {leg.distanceText} - {leg.mode}
              </Text>
            </View>
          ) : null}
          {event.address ? <Text style={[styles.eventExpandedText, { color: colors.textSecondary }]}>{event.address}</Text> : null}
          {openingHours.map((line) => (
            <Text key={line} style={[styles.eventExpandedText, { color: colors.textTertiary }]}>{line}</Text>
          ))}
          {googleMapsUrl ? (
            <TouchableOpacity style={styles.googleMapsButton} onPress={() => openExternal(googleMapsUrl)}>
              <Ionicons name="navigate-outline" size={16} color="#fff" />
              <Text style={styles.googleMapsText}>Open in Google Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Map expansion */}
      {expanded && mapRoute && (
        <View style={[styles.eventMapContainer, { borderColor: colors.cardBorder, marginLeft: 48 }]}>
          <RouteMap
            route={mapRoute}
            theme={theme}
          />
        </View>
      )}
    </View>
  );
};

const WhatIncludedView = ({ plan, formatPrice, onPurchase }) => {
  const { colors, theme } = useTheme();

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    // If it's already a short time string (e.g. "10:30"), return as is
    if (dateStr.length <= 5 && dateStr.includes(':')) return dateStr;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (_e) {
      return dateStr;
    }
  };

  return (
    <View style={styles.includedList}>
      {plan.costBreakdown.map((item, index) => {
        const isFlight = item.item.toLowerCase().includes('flight') || item.item.toLowerCase().includes('fly tickets');
        // Disable hotel action as requested
        const isActionable = isFlight; // || isHotel;

        // Use real raw data if available
        const flightData = (isFlight && item.raw) ? item.raw : null;
        const hasRichFlightData = !!flightData;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.includedItem,
              { backgroundColor: colors.card },
              isActionable && styles.cntActionable,
              theme === 'light' && { borderWidth: 1, borderColor: isActionable ? '#3E6FFF' : colors.cardBorder, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
              theme === 'dark' && { backgroundColor: '#171E27', borderWidth: 1, borderColor: '#2A3441' }
            ]}
            activeOpacity={isActionable ? 0.7 : 1}
            onPress={() => isActionable && onPurchase(item)}
          >
            {item.iconType === 'date' ? (
              <View style={[styles.includedIconDate, { backgroundColor: theme === 'dark' ? '#101620' : '#F3F4F6', }]}>
                <Text style={[styles.includedDateMonth, { color: theme === 'light' ? '#fff' : '#94A3B8', backgroundColor: '#3E6FFF', paddingHorizontal: 6, borderRadius: 4, overflow: 'hidden', fontSize: 10, paddingVertical: 2 }]}>{item.iconValue.split(' ')[0]}</Text>
                <Text style={[styles.includedDateDay, { color: colors.text }]}>{item.iconValue.split(' ')[1]}</Text>
              </View>
            ) : item.iconType === 'icon' ? (
              <View style={[styles.includedIconDate, { backgroundColor: theme === 'dark' ? '#101620' : '#F3F4F6', }]}>
                <Ionicons name={item.iconValue || 'ellipse'} size={24} color={colors.text} />
              </View>
            ) : (
              <View style={[styles.includedIconImageWrapper, { backgroundColor: theme === 'dark' ? 'transparent' : '#F3F4F6', borderRadius: 12 }]}>
                <Image source={{ uri: item.iconValue }} style={styles.includedIconImage} />
              </View>
            )}

            <View style={styles.includedDetails}>
              {hasRichFlightData ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingRight: 12 }}>
                    <Text style={[styles.includedItemTitle, { color: colors.text }]}>Fly Tickets</Text>
                    <Text style={[styles.includedItemTitle, { color: colors.text, opacity: 0.8 }]}>
                      {flightData.airline ? flightData.airline.split(/[\/\?,(]/)[0].trim() : ''}
                    </Text>
                  </View>

                  {/* Row 1: Times and Duration */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, gap: 12, paddingRight: 12 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Raleway-Bold', color: colors.text }}>
                      {formatTime(flightData.depart || flightData.departTime)} - {formatTime(flightData.arrive || flightData.arriveTime)}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Raleway-Regular', color: colors.textSecondary }}>
                      {item.details}
                    </Text>
                  </View>

                  {/* Row 2: Route and Layover/Extra Info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2, gap: 12, paddingRight: 12 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Raleway-SemiBold', color: colors.textTertiary }}>
                      {flightData.origin}   {flightData.destination}
                    </Text>
                    {/* Check specifically for layover field */}
                    {flightData.layover && (
                      <Text style={{ fontSize: 12, fontFamily: 'Raleway-Regular', color: colors.textTertiary, flex: 1 }}>
                        {flightData.layover}
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.includedItemTitle, { color: colors.text }]}>{item.item}</Text>
                  {item.provider && <Text style={[styles.includedItemProvider, { color: colors.textSecondary }]}>{item.provider}</Text>}
                  <Text style={[styles.includedItemDetails, { color: colors.textTertiary }]}>{item.details}</Text>
                </>
              )}

              {item.sourceConfidence ? (
                <View style={styles.includedConfidenceRow}>
                  <InlineChip icon="shield-checkmark-outline" text={sourceLabel(item.sourceConfidence)} />
                </View>
              ) : null}

              {isActionable && !hasRichFlightData && (
                <Text style={styles.actionLinkText}>
                  {isFlight ? 'Search Flights →' : 'Check Availability →'}
                </Text>
              )}
            </View>
            <Text style={[styles.includedItemPrice, { color: colors.text }]}>{formatPrice(item.price)}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  );
};

const OSQuickAction = ({ icon, label, onPress, tone = 'default' }) => {
  const { colors, theme } = useTheme();
  const bg = tone === 'primary' ? '#3E6FFF' : theme === 'dark' ? '#101620' : '#F3F4F6';
  const fg = tone === 'primary' ? '#fff' : colors.text;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.osQuickAction, { backgroundColor: bg, borderColor: colors.cardBorder }]}>
      <Ionicons name={icon} size={17} color={fg} />
      <Text style={[styles.osQuickActionText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
};

const TripOSView = ({ plan, selectedDate, onOpenMap, onOpenLink, formatPrice }) => {
  const { colors, theme } = useTheme();
  const [osCommand, setOsCommand] = React.useState(null);
  const day = selectedTripDay(plan, selectedDate);
  const nextEvent = nextMeaningfulEvent(day);
  const travelIntel = plan?.travelIntel || {};
  const bookingItems = Array.isArray(plan?.costBreakdown) ? plan.costBreakdown : [];
  const readyCount = bookingItems.filter((item) => bookingUrlForItem(item)).length;
  const memorySignals = buildMemorySignals(plan);
  const safetyWarnings = travelIntel.safety?.warnings || [];
  const emergencyNumber = travelIntel.safety?.emergencyNumber;
  const dayEvents = [...(day?.events || [])].sort((a, b) => eventTimeValue(a) - eventTimeValue(b));
  const foodEvent = dayEvents.find((event) => /dinner|restaurant|lunch|cafe|food|crab|seafood/i.test(eventSearchText(event)));
  const transferEvent = dayEvents.find((event) => /transfer|taxi|car|ferry|boat|transit/i.test(eventSearchText(event)) && !isFlightEvent(event));
  const transferItems = bookingItems.filter((item) => /transfer|taxi|car|ferry|boat/i.test(`${item.item || ''} ${item.provider || ''} ${item.details || ''}`));
  const visa = travelIntel.visa || plan?.visa || {};
  const nextEventUrl = googleMapsUrlForEvent(nextEvent);

  const eventLine = (event) => {
    if (!event) return '';
    const when = event.time ? `${event.time} - ` : '';
    const where = event.address || event.details || '';
    return `${when}${event.title || 'Untitled stop'}${where ? `\n${where}` : ''}`;
  };

  const showCommand = (command) => setOsCommand(command);

  const openNearby = () => {
    if (nextEventUrl) {
      onOpenLink(nextEventUrl);
      return;
    }
    showCommand({
      icon: 'location-outline',
      title: 'Nearby',
      body: nextEvent ? eventLine(nextEvent) : 'No mapped stop is available for this day yet.',
      chips: ['Current day', 'Map target pending'],
    });
  };

  const showHelp = () => showCommand({
    icon: 'warning-outline',
    title: 'Trip help',
    body: safetyWarnings[0] || travelIntel.safety?.summary || 'No major route risks are flagged for this plan.',
    chips: [emergencyNumber ? `Emergency ${emergencyNumber}` : 'Safety ready', travelIntel.weather?.summary ? 'Weather checked' : 'Weather pending'],
  });

  const showMemory = () => showCommand({
    icon: 'sparkles-outline',
    title: 'Nuvia memory',
    body: memorySignals.length ? memorySignals.join('\n') : 'Preference profile is ready for this trip.',
    chips: ['Trip profile', 'Local view'],
  });

  const showDinner = () => showCommand({
    icon: 'restaurant-outline',
    title: 'Food plan',
    body: foodEvent ? eventLine(foodEvent) : 'No food stop is scheduled on this day yet.',
    chips: foodEvent?.rating ? [`Rating ${foodEvent.rating}`] : ['Today'],
    link: googleMapsUrlForEvent(foodEvent),
    linkLabel: 'Open map',
  });

  const showSwap = () => showCommand({
    icon: 'swap-horizontal-outline',
    title: 'Swap control',
    body: 'Structural trip changes stay behind the footer Edit flow, so this operating view does not regenerate your plan accidentally.',
    chips: ['Trip unchanged', 'Edit from footer'],
  });

  const showTransfer = () => showCommand({
    icon: 'car-outline',
    title: 'Transfers',
    body: transferEvent
      ? eventLine(transferEvent)
      : transferItems.length
        ? transferItems.map((item) => `${item.item || item.provider || 'Transfer'} - ${bookingStatusForItem(item).label}`).join('\n')
        : 'No transfer requirement is flagged for this day yet.',
    chips: [`${transferItems.length} booking rows`, transferEvent ? 'Timed stop found' : 'Plan scan'],
    link: googleMapsUrlForEvent(transferEvent),
    linkLabel: 'Open map',
  });

  const showVisa = () => showCommand({
    icon: 'document-text-outline',
    title: 'Documents',
    body: visa.summary || visa.details || visa.status?.replace(/_/g, ' ') || 'No visa or document warning is attached to this trip.',
    chips: [visa.status ? visa.status.replace(/_/g, ' ') : 'No warning', plan?.country || 'Destination'],
  });

  return (
    <View style={styles.osWrap}>
      <View style={[styles.osHeroBand, { backgroundColor: theme === 'dark' ? '#101620' : '#F8FAFC', borderColor: colors.cardBorder }]}>
        <View style={styles.osHeroTop}>
          <View style={styles.osHeroIcon}>
            <Ionicons name="compass-outline" size={22} color="#3E6FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.osHeroTitle, { color: colors.text }]}>Trip command</Text>
            <Text style={[styles.osHeroText, { color: colors.textSecondary }]} numberOfLines={2}>
              {nextEvent ? `${nextEvent.time || ''} ${nextEvent.title}`.trim() : plan?.routeSummary || 'Plan is ready to operate'}
            </Text>
          </View>
          <InlineChip icon="bag-check-outline" text={`${readyCount}/${bookingItems.length || 0} ready`} tone={readyCount === bookingItems.length ? 'blue' : 'warn'} />
        </View>
        <View style={styles.osQuickGrid}>
          <OSQuickAction icon="map-outline" label="Route" onPress={onOpenMap} tone="primary" />
          <OSQuickAction
            icon="sparkles-outline"
            label="Change"
            onPress={() => showCommand({
              icon: 'sparkles-outline',
              title: 'Change control',
              body: 'Structural trip changes stay behind the footer Edit flow. This keeps Trip OS focused on operating the plan you already selected.',
              chips: ['Trip unchanged', 'Edit from footer'],
            })}
          />
          <OSQuickAction icon="location-outline" label="Nearby" onPress={openNearby} />
          <OSQuickAction icon="warning-outline" label="Help" onPress={showHelp} />
        </View>
      </View>

      {osCommand ? (
        <View style={[styles.osCommandPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.osCommandHeader}>
            <View style={styles.osCommandIcon}>
              <Ionicons name={osCommand.icon || 'compass-outline'} size={18} color="#3E6FFF" />
            </View>
            <Text style={[styles.osCommandTitle, { color: colors.text }]} numberOfLines={1}>{osCommand.title}</Text>
            <TouchableOpacity onPress={() => setOsCommand(null)} style={styles.osCommandClose}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.osCommandText, { color: colors.textSecondary }]}>{osCommand.body}</Text>
          {Array.isArray(osCommand.chips) && osCommand.chips.length ? (
            <View style={styles.osSignalWrap}>
              {osCommand.chips.filter(Boolean).map((chip) => (
                <InlineChip key={chip} icon="checkmark-circle-outline" text={chip} />
              ))}
            </View>
          ) : null}
          {osCommand.link ? (
            <TouchableOpacity onPress={() => onOpenLink(osCommand.link)} style={styles.osCommandButton}>
              <Ionicons name="open-outline" size={15} color="#fff" />
              <Text style={styles.osCommandButtonText}>{osCommand.linkLabel || 'Open'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.osSection}>
        <View style={styles.osSectionHeader}>
          <Text style={[styles.osSectionTitle, { color: colors.text }]}>Booking readiness</Text>
          <Text style={[styles.osSectionMeta, { color: colors.textTertiary }]}>{formatPrice(plan?.price || 0)}</Text>
        </View>
        {bookingItems.slice(0, 6).map((item, index) => {
          const status = bookingStatusForItem(item);
          const url = bookingUrlForItem(item);
          return (
            <View key={`${item.item || 'booking'}-${index}`} style={[styles.osBookingRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.osBookingIcon}>
                <Ionicons name={bookingIconForItem(item)} size={18} color="#3E6FFF" />
              </View>
              <View style={styles.osBookingContent}>
                <Text style={[styles.osBookingTitle, { color: colors.text }]} numberOfLines={1}>{item.item || item.provider || 'Booking item'}</Text>
                <Text style={[styles.osBookingSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.provider || item.details || 'Provider pending'}</Text>
              </View>
              <InlineChip icon={url ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={status.label} tone={status.tone} />
              {url ? (
                <TouchableOpacity onPress={() => onOpenLink(url)} style={styles.osTinyButton}>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.osTwoCol}>
        <View style={[styles.osPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#3E6FFF" />
          <Text style={[styles.osPanelTitle, { color: colors.text }]}>Risk</Text>
          <Text style={[styles.osPanelText, { color: colors.textSecondary }]} numberOfLines={4}>
            {safetyWarnings[0] || travelIntel.safety?.summary || 'No major route risks flagged.'}
          </Text>
          {emergencyNumber ? <InlineChip icon="call-outline" text={emergencyNumber} /> : null}
        </View>
        <View style={[styles.osPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="cloudy-night-outline" size={20} color="#3E6FFF" />
          <Text style={[styles.osPanelTitle, { color: colors.text }]}>Weather</Text>
          <Text style={[styles.osPanelText, { color: colors.textSecondary }]} numberOfLines={4}>
            {travelIntel.weather?.summary || plan?.weather?.summary || 'Weather data will refresh when available.'}
          </Text>
          {travelIntel.weather?.averageTempC ? <InlineChip icon="thermometer-outline" text={`${travelIntel.weather.averageTempC}C avg`} /> : null}
        </View>
      </View>

      <View style={styles.osSection}>
        <View style={styles.osSectionHeader}>
          <Text style={[styles.osSectionTitle, { color: colors.text }]}>Nuvia memory</Text>
          <TouchableOpacity onPress={showMemory}>
            <Text style={styles.osLinkText}>Tune</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.osSignalWrap}>
          {(memorySignals.length ? memorySignals : ['Preference profile ready']).map((signal) => (
            <InlineChip key={signal} icon="sparkles-outline" text={signal} />
          ))}
        </View>
      </View>

      <View style={styles.osSection}>
        <Text style={[styles.osSectionTitle, { color: colors.text }]}>In-trip moves</Text>
        <View style={styles.osMoveGrid}>
          <OSQuickAction icon="restaurant-outline" label="Dinner" onPress={showDinner} />
          <OSQuickAction icon="swap-horizontal-outline" label="Swap stop" onPress={showSwap} />
          <OSQuickAction icon="car-outline" label="Transfer" onPress={showTransfer} />
          <OSQuickAction icon="document-text-outline" label="Visa" onPress={showVisa} />
        </View>
      </View>
    </View>
  );
};

const RouteIntelligenceModal = ({ visible, plan, selectedDate, setSelectedDate, onClose, topInset }) => {
  const { colors, theme } = useTheme();
  const routeDays = plan?.itinerary || [];
  const initialIndex = Math.max(0, routeDays.findIndex((day) => day.date === selectedDate));
  const [activeRouteDayIndex, setActiveRouteDayIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (!visible) return;
    setActiveRouteDayIndex(initialIndex);
  }, [initialIndex, visible]);

  const selectedDay = routeDays[activeRouteDayIndex] || routeDays[0] || null;
  const mappedStops = (selectedDay?.events || []).filter(isGroundRouteStop);
  const routeLegs = filterGroundRouteLegs(selectedDay?.routeLegs || [], mappedStops);
  const mapRoute = mappedStops.length
    ? { events: mappedStops, legs: [], bounds: null, connectMarkers: true, numberedMarkers: true }
    : routeForDay(selectedDay, plan);
  const quality = plan?.planQuality;
  const selectedDateLabel = formatShortDate(selectedDay?.date);
  const routeSummaryText = routeLegs.length
    ? `${routeLegs.length} mapped movements between places`
    : mappedStops.length
      ? `${mappedStops.length} mapped places for this day`
      : 'No ground route available yet';

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={[styles.mapModalRoot, { backgroundColor: colors.background }]}>
        <RouteMap
          key={`route-intel-map-${activeRouteDayIndex}-${mappedStops.length}`}
          route={mapRoute}
          theme={theme}
        />

        <View style={[styles.mapModalHeader, { paddingTop: topInset + 8 }]}>
          <TouchableOpacity onPress={onClose} style={[styles.mapCloseButton, { backgroundColor: colors.card }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.mapHeaderTitleWrap}>
            <Text style={[styles.mapHeaderTitle, { color: colors.text }]}>Route intelligence</Text>
            <Text style={[styles.mapHeaderSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {selectedDay ? `${selectedDateLabel} - mapped places, not flight path` : plan?.location}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.routeIntelPanel, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeDayTabs}>
            {routeDays.map((day, index) => {
              const isActive = index === activeRouteDayIndex;
              return (
                <TouchableOpacity
                  key={`${day.date || 'day'}-${index}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveRouteDayIndex(index);
                    if (day.date) setSelectedDate(day.date);
                  }}
                  style={[
                    styles.routeDayTab,
                    {
                      backgroundColor: isActive ? '#3E6FFF' : theme === 'dark' ? '#101620' : '#F3F4F6',
                      borderColor: isActive ? '#3E6FFF' : colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.routeDayTabText, { color: isActive ? '#fff' : colors.text }]}>
                    {day.day || formatShortDate(day.date)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.routeSummaryBlock}>
            <Text style={[styles.routeSummaryTitle, { color: colors.text }]} numberOfLines={1}>
              {routeSummaryText}
            </Text>
            <View style={styles.routeMetricRow}>
              <InlineChip icon="location-outline" text={`${mappedStops.length} mapped stops`} />
              <InlineChip icon="git-branch-outline" text={`${routeLegs.length} route legs`} />
              {quality?.score ? <InlineChip icon="shield-checkmark-outline" text={`Quality ${quality.score}/100`} tone="blue" /> : null}
            </View>
          </View>

          <ScrollView style={styles.routeStopList} showsVerticalScrollIndicator={false}>
            {mappedStops.length === 0 ? (
              <Text style={[styles.routeEmptyText, { color: colors.textSecondary }]}>No mapped stops yet</Text>
            ) : null}
            {mappedStops.map((event, index) => {
              const leg = routeLegs.find((item) => item.toEventId === event?.id);
              return (
                <View key={`${event.id || event.title}-${index}`} style={styles.routeStopRow}>
                  <View style={styles.routeStopMarkerWrap}>
                    <View style={styles.routeStopMarker}>
                      <Text style={styles.routeStopMarkerText}>{index + 1}</Text>
                    </View>
                    {index < mappedStops.length - 1 ? (
                      <View style={[styles.routeStopLine, { backgroundColor: colors.cardBorder }]} />
                    ) : null}
                  </View>
                  <View style={styles.routeStopContent}>
                    {leg ? (
                      <Text style={[styles.routeLegMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        {leg.durationText || leg.duration || ''}{leg.distanceText ? ` - ${leg.distanceText}` : ''}{leg.mode ? ` - ${leg.mode}` : ''}
                      </Text>
                    ) : null}
                    <Text style={[styles.routeStopTime, { color: colors.textTertiary }]}>{event.time}</Text>
                    <Text style={[styles.routeStopTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
                    <Text style={[styles.routeStopDetails, { color: colors.textSecondary }]} numberOfLines={2}>
                      {event.address || event.details}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function TripDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const plan = params.plan ? JSON.parse(params.plan) : null;
  const { colors, theme } = useTheme();
  const topInset = Platform.OS === 'android' ? 24 : 44;

  const [selectedDate, setSelectedDate] = useState(plan?.itinerary?.[0]?.date);
  const [activeTab, setActiveTab] = useState('Information');
  const [mapVisible, setMapVisible] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  React.useEffect(() => {
    if (params.openPayment === 'true') {
      setShowPaymentSheet(true);
    }
  }, [params.openPayment]);

  const handlePurchaseItem = (item) => {
    const title = item.item.toLowerCase();
    let checkIn = null;
    let checkOut = null;
    if (plan.dateRange && plan.dateRange.includes(' to ')) {
      const parts = plan.dateRange.split(' to ');
      checkIn = parts[0];
      checkOut = parts[1];
    }
    const destination = plan.location;

    if (title.includes('flight')) {
      router.push({
        pathname: '/FlightSearch',
        params: {
          to: destination,
          departDate: checkIn,
          returnDate: checkOut,
          from: 'Istanbul, IST'
        }
      });
    } else if (title.includes('hotel') || title.includes('stay') || title.includes('accommodation')) {
      // Hotel search disabled as requested
      // router.push({
      //   pathname: '/HotelSearchFlow',
      //   params: {
      //     destination: destination,
      //     checkIn: checkIn,
      //     checkOut: checkOut
      //   }
      // });
    }
  };

  const handleEditPlan = async (initialPrompt = '') => {
    try {
      await AsyncStorage.setItem(EDIT_PLAN_STORAGE_KEY, JSON.stringify(plan));
      await AsyncStorage.setItem(EDIT_PLAN_RETURN_STORAGE_KEY, JSON.stringify(plan));
      if (initialPrompt) {
        await AsyncStorage.setItem(EDIT_PLAN_PROMPT_STORAGE_KEY, initialPrompt);
      } else {
        await AsyncStorage.removeItem(EDIT_PLAN_PROMPT_STORAGE_KEY);
      }
    } catch (_e) {
      // Editing can still open without cached context.
    }

    router.push({
      pathname: '/(tabs)',
      params: {
        editTrip: 'true',
        editToken: Date.now().toString(),
      },
    });
  };

  if (!plan) return null;

  const formatPrice = (value) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value); }
    catch { return `$${Number(value || 0).toFixed(2)}`; }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header - Not Absolute */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1C222C' },
              theme === 'dark' && { borderWidth: 1, borderColor: '#334155' }
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={[
            styles.headerPill,
            { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1C222C' },
            theme === 'dark' && { borderWidth: 1, borderColor: '#334155' }
          ]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{plan.location}, {plan.country}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.headerBtn,
              { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1C222C' },
              theme === 'dark' && { borderWidth: 1, borderColor: '#334155' }
            ]}
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Main Image - Card Style */}
        <Image source={{ uri: plan.image }} style={styles.mainImage} />

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.locationTitle, { color: colors.text }]}>{plan.location}, {plan.country}</Text>
            {plan.weather && <View style={styles.weatherChip}><Ionicons name={getSafeWeatherIcon(plan.weather.icon)} size={16} color={colors.textSecondary} /><Text style={[styles.weatherText, { color: colors.textSecondary }]}>{plan.weather.temp}°C</Text></View>}
          </View>
          <Text style={[styles.dateRange, { color: colors.textTertiary }]}>{plan.dateRange}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{plan.description}</Text>
          <PlanInsights plan={plan} onOpenMap={() => setMapVisible(true)} />

          <View style={[styles.tabContainerStyle, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1C222C' }]}>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'Information' && { backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F1722', shadowOpacity: theme === 'light' ? 0.1 : 0 }]}
              onPress={() => setActiveTab('Information')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'Information' && { color: colors.text, fontFamily: 'Raleway-Bold' }]}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'Trip OS' && { backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F1722', shadowOpacity: theme === 'light' ? 0.1 : 0 }]}
              onPress={() => setActiveTab('Trip OS')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'Trip OS' && { color: colors.text, fontFamily: 'Raleway-Bold' }]}>Trip OS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'What included' && { backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F1722', shadowOpacity: theme === 'light' ? 0.1 : 0 }]}
              onPress={() => setActiveTab('What included')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'What included' && { color: colors.text, fontFamily: 'Raleway-Bold' }]}>Bookings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'Information' ? (
          <InformationView plan={{ ...plan, onOpenMap: () => setMapVisible(true) }} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        ) : activeTab === 'Trip OS' ? (
          <TripOSView
            plan={plan}
            selectedDate={selectedDate}
            onOpenMap={() => setMapVisible(true)}
            onOpenLink={openExternal}
            formatPrice={formatPrice}
          />
        ) : (
          <WhatIncludedView plan={plan} formatPrice={formatPrice} onPurchase={handlePurchaseItem} />
        )}

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.divider }]}>
        <View style={styles.footerPriceSection}>
          <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>Total price:</Text>
          <Text style={[styles.priceValue, { color: colors.text }]}>
            {plan.currency || '$'} {formatPrice(plan.price).replace('$', '')}
          </Text>
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme === 'dark' ? '#1C222C' : '#FFFFFF', borderColor: colors.cardBorder }]}
            onPress={() => handleEditPlan()}
          >
            <Text style={[styles.editButtonText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => setShowPaymentSheet(true)}
          >
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RouteIntelligenceModal
        visible={mapVisible}
        plan={plan}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onClose={() => setMapVisible(false)}
        topInset={topInset}
      />

      {showPaymentSheet && (
        <PaymentSheet
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          plan={plan}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 180 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: 'Raleway-Bold' },

  mainImage: {
    width: '92%',
    height: 240,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },

  infoContainer: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  locationTitle: { fontSize: 24, fontFamily: 'Raleway-Bold' },
  weatherChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  weatherText: { fontSize: 14, fontFamily: 'Raleway-Regular' },
  dateRange: { fontSize: 14, marginBottom: 8, fontFamily: 'Raleway-Regular' },
  description: { fontSize: 14, lineHeight: 22, fontFamily: 'Raleway-Regular' },

  insightsWrap: {
    marginTop: 16,
    gap: 10,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(62, 111, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: { fontSize: 14, fontFamily: 'Raleway-Bold' },
  insightText: { fontSize: 12, lineHeight: 17, fontFamily: 'Raleway-Regular', marginTop: 2 },
  insightChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: '100%',
  },
  inlineChipText: { fontSize: 11, fontFamily: 'Raleway-Regular', maxWidth: 220 },

  tabContainerStyle: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    marginVertical: 20,
    overflow: 'hidden',
  },
  tabStyle: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  tabTextStyle: {
    color: '#94A3B8',
    fontSize: 15,
    fontFamily: 'Raleway-Regular',
  },

  daySelector: { paddingHorizontal: 16, paddingVertical: 10 },
  dayChip: {
    width: 50,
    height: 70,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipMonthContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  dayChipMonthText: {
    fontSize: 12,
    fontFamily: 'Raleway-Regular'
  },
  dayChipDayContainer: {
    width: '100%',
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  dayChipDayText: {
    fontSize: 18,
    fontFamily: 'Raleway-Bold',
  },

  eventList: { paddingHorizontal: 16, marginTop: 20 },
  eventItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  timelineContainer: { alignItems: 'center', marginRight: 10, width: 48 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: 18, left: 18, zIndex: 1 },
  timelineLine: { width: 2, height: '150%', position: 'absolute', top: 18, left: 23 },
  eventCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 12
  },
  eventIconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventDetails: { flex: 1 },
  eventTime: { fontSize: 16, fontFamily: 'Raleway-Bold' },
  eventTitle: { fontSize: 16, fontFamily: 'Raleway-Bold', marginTop: 2 },
  eventSubtext: { fontSize: 13, marginTop: 4, fontFamily: 'Raleway-Regular' },
  eventMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  eventDuration: { fontSize: 12, marginLeft: 8, minWidth: 42, textAlign: 'right', fontFamily: 'Raleway-Regular' },
  eventExpansion: {
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  eventPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  eventExpandedText: { fontSize: 12, lineHeight: 17, fontFamily: 'Raleway-Regular' },
  routeLegPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  routeLegText: { fontSize: 12, fontFamily: 'Raleway-Bold' },
  googleMapsButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3E6FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  googleMapsText: { color: '#fff', fontSize: 12, fontFamily: 'Raleway-Bold' },
  mapModalRoot: {
    flex: 1,
  },
  mapModalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(14, 20, 28, 0.72)',
    zIndex: 10,
  },
  mapCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapHeaderTitleWrap: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  mapHeaderTitle: { fontSize: 17, fontFamily: 'Raleway-Bold' },
  mapHeaderSubtitle: { fontSize: 12, fontFamily: 'Raleway-Regular', marginTop: 2 },
  routeIntelPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 10,
    maxHeight: 380,
  },
  routeDayTabs: {
    gap: 8,
    paddingBottom: 10,
  },
  routeDayTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  routeDayTabText: { fontSize: 12, fontFamily: 'Raleway-Bold' },
  routeSummaryBlock: {
    gap: 8,
    marginBottom: 8,
  },
  routeSummaryTitle: { fontSize: 15, fontFamily: 'Raleway-Bold' },
  routeMetricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeStopList: {
    maxHeight: 220,
  },
  routeStopRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  routeStopMarkerWrap: {
    width: 26,
    alignItems: 'center',
  },
  routeStopMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3E6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStopMarkerText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Raleway-Bold',
  },
  routeStopLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
  },
  routeStopContent: {
    flex: 1,
    paddingBottom: 4,
  },
  routeLegMeta: { fontSize: 11, fontFamily: 'Raleway-SemiBold', marginBottom: 4 },
  routeStopTime: { fontSize: 11, fontFamily: 'Raleway-Regular' },
  routeStopTitle: { fontSize: 14, fontFamily: 'Raleway-Bold', marginTop: 2 },
  routeStopDetails: { fontSize: 12, lineHeight: 17, fontFamily: 'Raleway-Regular', marginTop: 2 },
  routeEmptyText: { fontSize: 13, fontFamily: 'Raleway-Regular', paddingVertical: 16 },
  dayRouteSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  dayRouteText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Raleway-Regular' },

  eventMapContainer: {
    height: 180,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },

  includedList: { paddingHorizontal: 16, marginTop: 10, gap: 12 },
  includedItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12 },
  includedIconDate: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  includedIconImageWrapper: { width: 48, height: 48, borderRadius: 12, marginRight: 12, overflow: 'hidden' },
  includedIconImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  includedDetails: { flex: 1 },
  includedItemTitle: { fontSize: 16, fontFamily: 'Raleway-Bold' },
  includedItemProvider: { fontSize: 12, fontFamily: 'Raleway-Regular', marginTop: 2 },
  includedItemDetails: { fontSize: 13, fontFamily: 'Raleway-Regular', marginTop: 4 },
  includedItemPrice: { fontSize: 16, fontFamily: 'Raleway-Bold' },
  includedConfidenceRow: { marginTop: 8, alignSelf: 'flex-start' },
  cntActionable: {},
  actionLinkText: { color: '#3E6FFF', fontSize: 13, fontFamily: 'Raleway-Bold', marginTop: 6 },

  osWrap: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 22,
  },
  osHeroBand: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  osHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  osHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(62, 111, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  osHeroTitle: { fontSize: 16, fontFamily: 'Raleway-Bold' },
  osHeroText: { fontSize: 12, lineHeight: 17, fontFamily: 'Raleway-Regular', marginTop: 2 },
  osQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  osQuickAction: {
    minWidth: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  osQuickActionText: { fontSize: 13, fontFamily: 'Raleway-Bold' },
  osCommandPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    gap: 10,
  },
  osCommandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  osCommandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(62, 111, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  osCommandTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: 'Raleway-Bold',
  },
  osCommandClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  osCommandText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Raleway-Regular',
  },
  osCommandButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3E6FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  osCommandButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Raleway-Bold',
  },
  osSection: {
    gap: 10,
  },
  osSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  osSectionTitle: { fontSize: 15, fontFamily: 'Raleway-Bold' },
  osSectionMeta: { fontSize: 12, fontFamily: 'Raleway-Regular' },
  osBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 9,
  },
  osBookingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(62, 111, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  osBookingContent: {
    flex: 1,
    minWidth: 0,
  },
  osBookingTitle: { fontSize: 13, fontFamily: 'Raleway-Bold' },
  osBookingSub: { fontSize: 11, fontFamily: 'Raleway-Regular', marginTop: 2 },
  osTinyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#3E6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  osTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  osPanel: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 7,
  },
  osPanelTitle: { fontSize: 14, fontFamily: 'Raleway-Bold' },
  osPanelText: { fontSize: 12, lineHeight: 17, fontFamily: 'Raleway-Regular', flex: 1 },
  osSignalWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  osLinkText: { color: '#3E6FFF', fontSize: 13, fontFamily: 'Raleway-Bold' },
  osMoveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  footerPriceSection: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
    marginBottom: 4
  },
  priceValue: {
    fontSize: 28,
    fontFamily: 'Raleway-Bold'
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12
  },
  editButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: 'Raleway-Bold'
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#3E6FFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buyButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Raleway-Bold'
  },
});
