// app/TripDetails.jsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, LayoutAnimation, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import PaymentSheet from '../components/PaymentSheet';
import RouteMap from '../components/RouteMap';

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
const getWeatherIcon = (rawIcon) => {
  if (!rawIcon) return "partly-sunny-outline";
  // If backend sent an emoji, map it
  if (rawIcon.includes("☀️")) return "sunny-outline";
  if (rawIcon.includes("☁️")) return "cloudy-outline";
  if (rawIcon.includes("🌧️")) return "rainy-outline";
  // Fallback to valid ionicon if string seems valid, else default
  return "partly-sunny-outline";
};

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const InformationView = ({ plan, selectedDate, setSelectedDate }) => {
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
              style={[styles.dayChip, isActive && styles.dayChipActive]}
              onPress={() => setSelectedDate(item.date)}
            >
              <View style={[styles.dayChipMonthContainer, isActive && styles.dayChipMonthContainerActive]}>
                <Text style={[styles.dayChipMonthText, isActive && styles.dayChipMonthTextActive]}>
                  {month}
                </Text>
              </View>
              <View style={styles.dayChipDayContainer}>
                <Text style={styles.dayChipDayText}>
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
  return (
    <View style={{ marginBottom: 10 }}>
      <TouchableOpacity activeOpacity={0.8} onPress={onToggle}>
        <View style={styles.eventItem}>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.eventCard}>
            <View style={styles.eventIconContainer}><Ionicons name={ICON_MAP[event.icon] || ICON_MAP[event.type] || 'ellipse-outline'} size={24} color="#3E6FFF" /></View>
            <View style={styles.eventDetails}>
              <Text style={styles.eventTime}>{event.time}</Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventSubtext}>{event.details}</Text>
            </View>
            <Text style={styles.eventDuration}>{event.duration}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Map expansion */}
      {expanded && event.latitude && event.longitude && (
        <View style={styles.eventMapContainer}>
          <RouteMap
            route={
              (prevEvent && prevEvent.latitude && prevEvent.longitude)
                ? {
                  start: [prevEvent.longitude, prevEvent.latitude],
                  end: [event.longitude, event.latitude]
                }
                : { start: [event.longitude, event.latitude] }
            }
          />
        </View>
      )}

      {/* Legacy standalone map for first item (optional, keeping if user liked it, but maybe redundant now) */}
    </View>
  );
};

const WhatIncludedView = ({ plan, formatPrice, onPurchase }) => (
  <View style={styles.includedList}>
    {plan.costBreakdown.map((item, index) => {
      // Determine if this item is actionable (Flight or Hotel currently)
      const isFlight = item.item.toLowerCase().includes('flight');
      const isHotel = item.item.toLowerCase().includes('hotel') || item.item.toLowerCase().includes('stay') || item.item.toLowerCase().includes('accommodation');
      const isActionable = isFlight || isHotel;

      return (
        <TouchableOpacity
          key={index}
          style={[styles.includedItem, isActionable && styles.cntActionable]}
          activeOpacity={isActionable ? 0.7 : 1}
          onPress={() => isActionable && onPurchase(item)}
        >
          {item.iconType === 'date' ? (
            <View style={styles.includedIconDate}>
              <Text style={styles.includedDateMonth}>{item.iconValue.split(' ')[0]}</Text>
              <Text style={styles.includedDateDay}>{item.iconValue.split(' ')[1]}</Text>
            </View>
          ) : (
            <Image source={{ uri: item.iconValue }} style={styles.includedIconImage} />
          )}
          <View style={styles.includedDetails}>
            <Text style={styles.includedItemTitle}>{item.item}</Text>
            {item.provider && <Text style={styles.includedItemProvider}>{item.provider}</Text>}
            <Text style={styles.includedItemDetails}>{item.details}</Text>
            {isActionable && (
              <Text style={styles.actionLinkText}>
                {isFlight ? 'Search Flights →' : 'Check Availability →'}
              </Text>
            )}
          </View>
          <Text style={styles.includedItemPrice}>{formatPrice(item.price)}</Text>
        </TouchableOpacity>
      )
    })}
  </View>
);

export default function TripDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const plan = params.plan ? JSON.parse(params.plan) : null;
  const isReadOnly = params.readOnly === 'true'; // Checked from params

  const [selectedDate, setSelectedDate] = useState(plan?.itinerary?.[0]?.date);
  const [activeTab, setActiveTab] = useState('Information');
  const [mapVisible, setMapVisible] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const handlePurchaseItem = (item) => {
    const title = item.item.toLowerCase();

    // Parse dates from the plan string, e.g. "2026-02-06 to 2026-02-08"
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
          from: 'Istanbul, IST' // Defaulting to user home or IST for demo
        }
      });
    } else if (title.includes('hotel') || title.includes('stay') || title.includes('accommodation')) {
      router.push({
        pathname: '/HotelSearchFlow',
        params: {
          destination: destination,
          checkIn: checkIn,
          checkOut: checkOut
        }
      });
    }
  };

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity></View>
        <Text style={styles.errorText}>No trip details found.</Text>
      </SafeAreaView>
    );
  }

  const formatPrice = (value) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value); }
    catch { return `$${Number(value || 0).toFixed(2)}`; }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{plan.location}, {plan.country}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity><Ionicons name="share-outline" size={24} color="white" style={{ marginRight: 16 }} /></TouchableOpacity>
            <TouchableOpacity><Ionicons name="heart-outline" size={24} color="white" /></TouchableOpacity>
          </View>
        </View>
        <Image source={{ uri: plan.image }} style={styles.mainImage} />
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.locationTitle}>{plan.location}, {plan.country}</Text>
            {plan.weather && <View style={styles.weatherChip}><Ionicons name={`${plan.weather.icon}-outline`} size={16} color="#FFD166" /><Text style={styles.weatherText}>{plan.weather.temp}°C</Text></View>}
          </View>
          <Text style={styles.dateRange}>{plan.dateRange}</Text>
          <Text style={styles.description}>{plan.description}</Text>

          <View style={styles.tabContainerStyle}>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'Information' && styles.tabActiveStyle]}
              onPress={() => setActiveTab('Information')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'Information' && styles.tabTextActiveStyle]}>Information</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabStyle, activeTab === 'What included' && styles.tabActiveStyle]}
              onPress={() => setActiveTab('What included')}
            >
              <Text style={[styles.tabTextStyle, activeTab === 'What included' && styles.tabTextActiveStyle]}>What included</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'Information' ? (<InformationView plan={{ ...plan, onOpenMap: () => setMapVisible(true) }} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />) : (<WhatIncludedView plan={plan} formatPrice={formatPrice} onPurchase={handlePurchaseItem} />)}

      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPriceSection}>
          <Text style={styles.priceLabel}>Total price:</Text>
          <Text style={styles.priceValue}>
            {plan.currency || '$'} {formatPrice(plan.price).replace('$', '')}
          </Text>
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => console.log('Edit pressed')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
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
        <View style={{ flex: 1, backgroundColor: '#0E141C' }}>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={{ width: 40, height: 40, backgroundColor: '#1C222C', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontFamily: 'Raleway_700Bold' }}>Trip Route</Text>
            <View style={{ width: 40 }} />
          </View>
          <RouteMap
            route={{
              start: [28.9784, 41.0082], // Istanbul
              end: [2.1734, 41.3851]   // Barcelona
            }}
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
  container: { flex: 1, backgroundColor: '#0E141C' },
  scrollContent: { paddingBottom: 180 },

  errorText: { color: 'white', textAlign: 'center', marginTop: 50, fontFamily: 'Raleway_700Regular' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontFamily: 'Raleway_700Bold' },
  headerIcons: { flexDirection: 'row' },
  mainImage: { width: '92%', height: 200, borderRadius: 20, alignSelf: 'center' },
  infoContainer: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  locationTitle: { color: 'white', fontSize: 24, fontFamily: 'Raleway_700Bold' },
  weatherChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  weatherText: { color: '#E6F0FF', fontSize: 14, fontFamily: 'Raleway_700Regular' },
  dateRange: { color: '#94A3B8', fontSize: 14, marginBottom: 8, fontFamily: 'Raleway_700Regular' },
  description: { color: '#C9D5E9', fontSize: 14, lineHeight: 20, fontFamily: 'Raleway_700Regular' },

  // Tabs
  tabContainerStyle: {
    flexDirection: 'row',
    backgroundColor: '#1C222C',
    borderRadius: 14,
    padding: 4,
    marginVertical: 10,
    overflow: 'hidden',
  },
  tabStyle: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabActiveStyle: {
    backgroundColor: '#0F1722',
  },
  tabTextStyle: {
    color: '#94A3B8',
    fontSize: 15,
    fontFamily: 'Raleway_700Regular',
  },
  tabTextActiveStyle: {
    color: '#EAF2FF',
    fontFamily: 'Raleway_700Bold',
  },

  daySelector: { paddingHorizontal: 16, paddingVertical: 10 },

  // Day Chips
  dayChip: {
    width: 60,
    height: 70,
    marginHorizontal: 5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1C222C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: '#3E6FFF',
  },
  dayChipMonthContainer: {
    width: '100%',
    paddingTop: 5,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dayChipMonthText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Raleway_700Regular',
    marginBottom: 2,
  },
  dayChipMonthTextActive: {
    color: '#EAF2FF',
  },
  dayChipDayContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#171E27',
  },
  dayChipDayText: {
    color: '#EAF2FF',
    fontSize: 22,
    fontFamily: 'Raleway_700Bold',
  },

  // Events
  eventList: { paddingHorizontal: 16, marginTop: 20 },
  eventItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  timelineContainer: { alignItems: 'center', marginRight: 10, width: 48 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1E2A3A', position: 'absolute', top: 18, left: 18, zIndex: 1 },
  timelineLine: { width: 2, height: '150%', backgroundColor: '#1E2A3A', position: 'absolute', top: 18, left: 23 },
  eventCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#171E27', borderRadius: 16, padding: 12 },
  eventIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#101620', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventDetails: { flex: 1 },
  eventTime: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold' },
  eventTitle: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold', marginTop: 2 },
  eventSubtext: { color: '#94A3B8', fontSize: 13, marginTop: 4, fontFamily: 'Raleway_700Regular' },
  eventDuration: { color: '#94A3B8', fontSize: 12, marginLeft: 10, fontFamily: 'Raleway_700Regular' },

  // --- MAP STYLES (Cleaned up) ---
  mapCardContainer: {
    height: 140,
    marginLeft: 58,
    marginBottom: 16,
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0E141C',
    borderWidth: 1,
    borderColor: '#1E2A3A',
  },
  // ----------------------

  includedList: { paddingHorizontal: 16, marginTop: 10, gap: 8 },
  // Expanded Items
  eventMapContainer: {
    height: 180,
    marginLeft: 58, // Align with event content
    marginRight: 0,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0E141C',
    // borderWidth: 1, 
    // borderColor: '#1E2A3A'
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#0E141C',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: '#1E2A3A',
  },
  footerPriceSection: {
    marginBottom: 12,
  },
  priceLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Raleway_700Regular',
    marginBottom: 4
  },
  priceValue: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'Raleway_700Bold'
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12
  },
  editButton: {
    flex: 1,
    backgroundColor: '#1C222C',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  editButtonText: {
    color: 'white',
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

  // Clean up styles
  includedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171E27', borderRadius: 16, padding: 12 },
  includedIconDate: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#101620', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  includedDateMonth: { color: '#94A3B8', fontSize: 12, fontFamily: 'Raleway_700Regular' },
  includedDateDay: { color: '#EAF2FF', fontSize: 18, fontFamily: 'Raleway_700Bold' },
  includedIconImage: { width: 48, height: 48, borderRadius: 12, marginRight: 12 },
  includedDetails: { flex: 1 },
  includedItemTitle: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold' },
  includedItemProvider: { color: '#94A3B8', fontSize: 12, fontFamily: 'Raleway_700Regular', marginTop: 2 },
  includedItemDetails: { color: '#C9D5E9', fontSize: 13, fontFamily: 'Raleway_700Regular', marginTop: 4 },
  includedItemPrice: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold' },
  cntActionable: { borderWidth: 1, borderColor: '#3E6FFF' },
  actionLinkText: { color: '#3E6FFF', fontSize: 13, fontFamily: 'Raleway_700Bold', marginTop: 6 },
  expandedMapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.6
  }
});