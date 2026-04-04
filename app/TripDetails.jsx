// app/TripDetails.jsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, LayoutAnimation, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import PaymentSheet from '../components/PaymentSheet';
import RouteMap from '../components/RouteMap';
import { useTheme } from '../context/ThemeContext';

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
  travel: "airplane-outline",
  transport: "bus-outline",
  transit: "subway-outline",
  taxi: "car-outline",

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

const InformationView = ({ plan, selectedDate, setSelectedDate }) => {
  const { colors, theme } = useTheme();
  const selectedDayData = plan.itinerary.find((day) => day.date === selectedDate);
  const isFirstDay = plan.itinerary && plan.itinerary[0].date === selectedDate;
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
              prevEvent={index > 0 ? selectedDayData.events[index - 1] : null}
              isFirst={isFirstDay && index === 0}
              plan={plan}
              expanded={expandedIndex === index}
              onToggle={() => toggleExpand(index)}
            />
          </React.Fragment>
        ))}
      </View>
    </>
  );
};

const ExpandableEventItem = ({ event, prevEvent, isFirst, plan, expanded, onToggle }) => {
  const { colors, theme } = useTheme();
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
            <Ionicons name={ICON_MAP[event.icon] || ICON_MAP[event.type] || 'ellipse-outline'} size={24} color="#3E6FFF" />
          </View>
          <View style={styles.eventDetails}>
            <Text style={[styles.eventTime, { color: colors.text }]}>{event.time}</Text>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
            <Text style={[styles.eventSubtext, { color: colors.textSecondary }]}>{event.details}</Text>
          </View>
          <Text style={[styles.eventDuration, { color: colors.textTertiary }]}>{event.duration}</Text>
        </View>
      </TouchableOpacity>

      {/* Map expansion */}
      {expanded && event.latitude && event.longitude && (
        <View style={[styles.eventMapContainer, { borderColor: colors.cardBorder, marginLeft: 48 }]}>
          <RouteMap
            route={
              (prevEvent && prevEvent.latitude && prevEvent.longitude)
                ? {
                  start: [prevEvent.longitude, prevEvent.latitude],
                  end: [event.longitude, event.latitude]
                }
                : { start: [event.longitude, event.latitude] }
            }
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
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <View style={styles.includedList}>
      {plan.costBreakdown.map((item, index) => {
        const isFlight = item.item.toLowerCase().includes('flight') || item.item.toLowerCase().includes('fly tickets');
        const isHotel = item.item.toLowerCase().includes('hotel') || item.item.toLowerCase().includes('stay') || item.item.toLowerCase().includes('accommodation');
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

export default function TripDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const plan = params.plan ? JSON.parse(params.plan) : null;
  const { colors, theme } = useTheme();

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

          <View style={[styles.tabContainerStyle, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1C222C' }]}>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'Information' && { backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F1722', shadowOpacity: theme === 'light' ? 0.1 : 0 }]}
              onPress={() => setActiveTab('Information')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'Information' && { color: colors.text, fontFamily: 'Raleway_700Bold' }]}>Information</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'What included' && { backgroundColor: theme === 'light' ? '#FFFFFF' : '#0F1722', shadowOpacity: theme === 'light' ? 0.1 : 0 }]}
              onPress={() => setActiveTab('What included')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'What included' && { color: colors.text, fontFamily: 'Raleway_700Bold' }]}>What included</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'Information' ? (<InformationView plan={{ ...plan, onOpenMap: () => setMapVisible(true) }} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />) : (<WhatIncludedView plan={plan} formatPrice={formatPrice} onPurchase={handlePurchaseItem} />)}

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
            onPress={() => console.log('Edit pressed')}
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

      {/* Map Modal */}
      <Modal visible={mapVisible} onRequestClose={() => setMapVisible(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={{ width: 40, height: 40, backgroundColor: colors.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontFamily: 'Raleway_700Bold' }}>Trip Route</Text>
            <View style={{ width: 40 }} />
          </View>
          <RouteMap
            route={{
              start: [28.9784, 41.0082], // Istanbul
              end: [2.1734, 41.3851]   // Barcelona
            }}
            theme={theme}
          />
        </View>
      </Modal>

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
  headerTitle: { fontSize: 16, fontFamily: 'Raleway_700Bold' },

  mainImage: {
    width: '92%',
    height: 240,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },

  infoContainer: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  locationTitle: { fontSize: 24, fontFamily: 'Raleway_700Bold' },
  weatherChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  weatherText: { fontSize: 14, fontFamily: 'Raleway_700Regular' },
  dateRange: { fontSize: 14, marginBottom: 8, fontFamily: 'Raleway_700Regular' },
  description: { fontSize: 14, lineHeight: 22, fontFamily: 'Raleway_700Regular' },

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
    fontFamily: 'Raleway_700Regular',
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
    fontFamily: 'Raleway_700Regular'
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
    fontFamily: 'Raleway_700Bold',
  },

  eventList: { paddingHorizontal: 16, marginTop: 20 },
  eventItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  timelineContainer: { alignItems: 'center', marginRight: 10, width: 48 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: 18, left: 18, zIndex: 1 },
  timelineLine: { width: 2, height: '150%', position: 'absolute', top: 18, left: 23 },
  eventCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12
  },
  eventIconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventDetails: { flex: 1 },
  eventTime: { fontSize: 16, fontFamily: 'Raleway_700Bold' },
  eventTitle: { fontSize: 16, fontFamily: 'Raleway_700Bold', marginTop: 2 },
  eventSubtext: { fontSize: 13, marginTop: 4, fontFamily: 'Raleway_700Regular' },
  eventDuration: { fontSize: 12, marginLeft: 10, fontFamily: 'Raleway_700Regular' },

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
  includedItemTitle: { fontSize: 16, fontFamily: 'Raleway_700Bold' },
  includedItemProvider: { fontSize: 12, fontFamily: 'Raleway_700Regular', marginTop: 2 },
  includedItemDetails: { fontSize: 13, fontFamily: 'Raleway_700Regular', marginTop: 4 },
  includedItemPrice: { fontSize: 16, fontFamily: 'Raleway_700Bold' },
  cntActionable: {},
  actionLinkText: { color: '#3E6FFF', fontSize: 13, fontFamily: 'Raleway_700Bold', marginTop: 6 },

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
    fontFamily: 'Raleway_700Regular',
    marginBottom: 4
  },
  priceValue: {
    fontSize: 28,
    fontFamily: 'Raleway_700Bold'
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
    fontFamily: 'Raleway_700Bold'
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
    fontFamily: 'Raleway_700Bold'
  },
});