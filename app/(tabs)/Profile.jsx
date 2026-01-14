import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking'; // For Support/Email
import * as Notifications from 'expo-notifications'; // For Push Config
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditProfileModal from '../../components/EditProfileModal';
import { supabase } from '../../lib/supabase';

// Configure Notifications Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Profile() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [user, setUser] = useState(null);

  // Edit Profile State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  // const [savingProfile, setSavingProfile] = useState(false); // Removed, handled in Modal

  // Notification State
  const [pushToken, setPushToken] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // --- 1. Init & Auth State ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user) {
        applyUser(user);
        checkNotificationStatus();
      }
    })();
    return () => { mounted = false; };
  }, []);

  const applyUser = (u) => {
    setUser(u);
    setEditName(u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Traveler');
    setEditPhone(u?.user_metadata?.phone || '');
  };

  const handleProfileUpdate = (updatedUser) => {
    applyUser(updatedUser);
  };

  // --- 2. Push Notification Logic ---
  const checkNotificationStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // In a real app, you might delete the token from DB here
      Alert.alert("Settings", "Please disable notifications in your device settings.");
      Linking.openSettings();
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Error', 'Permission not granted for push notifications!');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setPushToken(token);
      setNotificationsEnabled(true);

      // TODO: Save this token to Supabase 'profiles' table
      console.log("Push Token:", token);
      Alert.alert("Success", "Push notifications enabled!");
    } else {
      Alert.alert('Error', 'Must use physical device for Push Notifications');
    }
  };

  // --- 3. Functional Action Handlers ---
  const handleAction = async (actionLabel) => {
    switch (actionLabel) {
      case 'Personal information':
        setEditModalVisible(true);
        break;

      case 'My documents':
        router.push('/my-documents');
        break;

      case 'Payment methods':
        router.push('/payment-methods');
        break;

      case "My author's tours":
        router.push('/my-tours');
        break;

      case 'Favorites':
        router.push('/favorites');
        break;

      case 'Expense tracker':
        router.push('/expenses');
        break;

      case 'Travel Diary':
        router.push('/diary');
        break;

      case 'Notifications':
        toggleNotifications();
        break;

      case 'Support':
        Linking.openURL('mailto:support@travelapp.com');
        break;

      case 'Refer a Friend':
        Share.share({ message: 'Check out this Travel App!' });
        break;

      default:
        Alert.alert("Coming Soon", `${actionLabel} is under construction.`);
        break;
    }
  };

  // --- 5. Sign Out ---
  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
    setSigningOut(false);
  };

  const PROFILE_OPTIONS = [
    { icon: 'person-outline', label: 'Personal information' },
    { icon: 'description', label: 'My documents', iconPack: MaterialIcons },
    { icon: 'credit-card', label: 'Payment methods', iconPack: MaterialIcons },
    { icon: 'star-outline', label: 'Favorites' },
    { icon: 'map', label: "My author's tours", iconPack: FontAwesome5 },
    { icon: 'attach-money', label: 'Expense tracker', iconPack: MaterialIcons },
    { icon: 'book-outline', label: 'Travel Diary' },
    { icon: 'notifications-outline', label: 'Notifications', isSwitch: true },
    { icon: 'settings-outline', label: 'Personalization' },
    { icon: 'help-circle-outline', label: 'Support' },
    { icon: 'information-circle-outline', label: 'About' },
    { icon: 'gift-outline', label: 'Refer a Friend' },
  ];

  const renderItem = ({ item }) => {
    const IconPack = item.iconPack || Ionicons;
    return (
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handleAction(item.label)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconPack name={item.icon} size={20} color="#fff" style={styles.optionIcon} />
          <Text style={styles.optionText}>{item.label}</Text>
        </View>

        {item.isSwitch ? (
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: "#767577", true: "#3E6FFF" }}
            thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
          />
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#666" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.profileCard}>
        {user?.user_metadata?.avatar_url ? (
          <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initialAvatar]}>
            <Text style={{ color: '#0E141C', fontWeight: '800', fontSize: 24 }}>
              {editName?.[0]?.toUpperCase() ?? 'T'}
            </Text>
          </View>
        )}

        <View style={styles.profileText}>
          <Text style={styles.name}>{editName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {!!editPhone && <Text style={styles.phone}>{editPhone}</Text>}
        </View>

        <TouchableOpacity onPress={() => setEditModalVisible(true)}>
          <Ionicons name="pencil-outline" size={20} color="#3E6FFF" />
        </TouchableOpacity>
      </View>

      {/* Options List */}
      <FlatList
        data={PROFILE_OPTIONS}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutButton, signingOut && { opacity: 0.7 }]}
        onPress={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? <ActivityIndicator color="#ff4d4d" /> : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Edit Profile Modal Component */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C', paddingHorizontal: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20,
    padding: 16, backgroundColor: '#1A1F2B', borderRadius: 12,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16 },
  initialAvatar: { backgroundColor: '#E6EDF3', alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff', fontFamily: 'Raleway_400Regular' },
  email: { color: '#bbb', marginTop: 4, fontSize: 13 },
  phone: { color: '#999', marginTop: 2, fontSize: 13 },

  optionsContainer: { paddingVertical: 20 },
  optionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#1A1F2B', borderRadius: 10, marginBottom: 12,
  },
  optionIcon: { marginRight: 16 },
  optionText: { fontSize: 15, color: '#fff', fontFamily: 'Raleway_400Regular' },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, backgroundColor: '#1A1F2B', borderRadius: 10, marginBottom: 70, gap: 8,
  },
  signOutText: { fontSize: 16, color: '#ff4d4d', fontWeight: '600', fontFamily: 'Raleway_400Regular' },
});