import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateTourModal from '../../components/social/CreateTourModal';
import CreatorTourCard from '../../components/social/CreatorTourCard';
import ForumView from '../../components/social/ForumView';
import PostCard from '../../components/social/PostCard';

const TABS = ['For You', 'Creator Tours', 'Forums', 'Following'];

// Dummy Data
const POSTS = [
  {
    id: '1',
    user: { name: 'Sarah Travels', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
    location: 'Santorini, Greece',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff',
    likes: 1240,
    caption: 'Sunset in Oia is just magical! ✨ Can’t wait to come back next summer. #santorini #travel',
    comments: 45,
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    user: { name: 'Jack Walker', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' },
    location: 'Kyoto, Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
    likes: 890,
    caption: 'Walking through the Fushimi Inari gates. The vibe here is indescribable.',
    comments: 22,
    timestamp: '5 hours ago',
  },
  {
    id: '3',
    user: { name: 'Elena R.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' },
    location: 'New York City, USA',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9',
    likes: 3500,
    caption: 'Concrete jungle where dreams are made of. 🗽',
    comments: 112,
    timestamp: '1 day ago',
  },
];

const INITIAL_TOURS = [
  {
    id: 't1',
    user: { name: 'Sarah Travels', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
    title: 'Ultimate Greek Island Hopping',
    location: 'Athens • Santorini • Mykonos',
    country: 'Greece',
    description: 'Join me for 7 unforgettable days exploring the best islands Greece has to offer. Sunset dinners, private boat tours, and hidden beaches.',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff',
    duration: 7,
    price: 1850,
    itinerary: [
      { date: 'Day 1', day: 'Aug 14', events: [{ time: '10:00', title: 'Arrival in Athens', details: 'Private transfer to hotel', icon: 'airplane', duration: '1h' }] },
      { date: 'Day 2', day: 'Aug 15', events: [{ time: '09:00', title: 'Ferry to Santorini', details: 'Premium class seating', icon: 'tour', duration: '4h' }] },
    ], // Simplified
    costBreakdown: [
      { item: '3 Island Flights', price: 450, details: 'Economy class', iconValue: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' },
      { item: 'Luxury Accom', price: 1200, details: '4-star hotels w/ breakfast', iconValue: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' },
    ]
  },
  {
    id: 't2',
    user: { name: 'Nomadic Matt', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' },
    title: 'Bali Digital Nomad Retreat',
    location: 'Canggu • Ubud',
    country: 'Indonesia',
    description: 'A 2-week co-working and exploring retreat for creators. Daily yoga, surf lessons, and networking dinners included.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
    duration: 14,
    price: 1200,
    itinerary: [],
    costBreakdown: []
  }
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('For You');
  const [tours, setTours] = useState(INITIAL_TOURS);
  const [isModalVisible, setModalVisible] = useState(false);

  const handleFabPress = () => {
    Alert.alert(
      'Create',
      'What would you like to create?',
      [
        { text: 'Post', onPress: () => console.log('Create Post') },
        { text: 'Tour', onPress: () => setModalVisible(true) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePublishTour = (newTour) => {
    setTours([newTour, ...tours]);
    setActiveTab('Creator Tours'); // Switch to tab to see it
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="heart-outline" size={26} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="paper-plane-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      {activeTab === 'Forums' ? (
        <ForumView />
      ) : (
        <FlatList
          data={activeTab === 'Creator Tours' ? tours : POSTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => activeTab === 'Creator Tours' ? <CreatorTourCard tour={item} /> : <PostCard post={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Floating Action Button (Create Post) */}
      {activeTab !== 'Forums' && (
        <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}

      <CreateTourModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onPublish={handlePublishTour}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E141C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  tabBtn: {
    paddingVertical: 6,
  },
  activeTabBtn: {
    borderBottomWidth: 2,
    borderBottomColor: 'white',
  },
  tabText: {
    color: '#9BA4B4',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Raleway_700Bold',
  },
  activeTabText: {
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    // hit slop?
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3E6FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3E6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});