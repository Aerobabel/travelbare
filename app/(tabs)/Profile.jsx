import { Ionicons } from '@expo/vector-icons';
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
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditProfileModal from '../../components/EditProfileModal';
import { useTheme } from '../../context/ThemeContext';
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
  const { colors, theme } = useTheme();
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

      case 'Personalization':
        router.push('/personalization');
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

      case 'Data Storage':
        router.push('/data-storage');
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
    { icon: 'person-circle-outline', label: 'Personal information' },
    { icon: 'options-outline', label: 'Personalization' },
    { icon: 'server-outline', label: 'Data Storage' },
    { icon: 'information-circle-outline', label: 'About' },
  ];

  const renderItem = ({ item }) => {
    const IconPack = item.iconPack || Ionicons;
    return (
      <TouchableOpacity
        style={[styles.optionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleAction(item.label)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconPack name={item.icon} size={22} color={colors.textSecondary} style={styles.optionIcon} />
          <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.circleBtn, { backgroundColor: colors.pillBackground, borderColor: colors.pillBorder }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerPill, { backgroundColor: colors.pillBackground, borderColor: colors.pillBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {user?.user_metadata?.avatar_url ? (
          <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initialAvatar]}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 28 }}>
              {(editName?.[0] || 'T').toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.profileText}>
          <Text style={[styles.name, { color: colors.text }]}>{editName || 'Guest'}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || 'Not Signed In'}</Text>
          <Text style={[styles.phone, { color: colors.textTertiary }]}>{editPhone || ''}</Text>
        </View>
      </View>

      {/* Options List */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={PROFILE_OPTIONS}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[
          styles.signOutButton,
          { backgroundColor: theme === 'dark' ? '#131114' : '#FFF0F0', borderColor: 'rgba(255, 69, 58, 0.2)' }
        ]}
        onPress={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? <ActivityIndicator color="#FF453A" /> : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#FF453A" style={{ marginRight: 10 }} />
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
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Raleway_600SemiBold',
  },
  spacer: { width: 44 },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20, // Rounded square
    marginRight: 20,
  },
  initialAvatar: {
    backgroundColor: '#3E6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, justifyContent: 'center' },
  name: {
    fontSize: 18,
    fontFamily: 'Raleway_700Bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Raleway_400Regular',
    marginBottom: 2,
  },
  phone: {
    fontSize: 13,
    fontFamily: 'Raleway_400Regular',
  },

  // Options
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 30, // Pill shape
    borderWidth: 1,
    marginBottom: 4,
  },
  optionIcon: { marginRight: 16 },
  optionText: {
    fontSize: 16,
    fontFamily: 'Raleway_400Regular',
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 40, // Bottom margin
  },
  signOutText: {
    fontSize: 16,
    color: '#FF453A',
    fontWeight: '600',
    fontFamily: 'Raleway_600SemiBold',
  },
});