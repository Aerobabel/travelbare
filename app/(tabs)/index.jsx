import {
  Raleway_400Regular, Raleway_600SemiBold, Raleway_700Bold, useFonts,
} from '@expo-google-fonts/raleway';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { GlassReflection } from '../../components/ui/GlassReflection';
import { LiquidTexture } from '../../components/ui/LiquidTexture';
import { NoiseTexture } from '../../components/ui/NoiseTexture';
import { getGlassStyle, getGlassTextStyle } from '../../constants/GlassStyles';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

import DatePickerSheet from '../../components/DatePickerSheet';
import GuestPicker from '../../components/GuestPicker';


// --- Constants & Helpers ---

// Brighter deep blue gradient for better glass contrast
// Solid dark flat background
const BACKGROUND_GRADIENT = ['#0E141C', '#0E141C', '#0E141C'];

const WELCOME_MESSAGE = {
  id: 'welcome-0',
  role: 'ai',
  text: "Hi! I'm your travel assistant - where would you like to go?",
};

const SESSION_STORAGE_KEY = 'travel_chat_sessions';
const CHAT_SESSIONS_TABLE = 'chat_sessions';

let globalMessageIdCounter = 0;
const generateUniqueId = (prefix = 'msg') => {
  globalMessageIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .substring(2, 9)}-${globalMessageIdCounter}`;
};

const CHAT_API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? 'https://travelapi-34zi.onrender.com';
const CHAT_ENDPOINT = `${CHAT_API_BASE.replace(/\/$/, '')}/travel`;

// --- Helper: Fix Icon Names ---
const getWeatherIconName = (rawIcon) => {
  if (!rawIcon || typeof rawIcon !== 'string') return 'sunny-outline';
  const lower = rawIcon.toLowerCase().replace('_', '-'); // Normalize _ to -

  if (lower.includes('rain')) return 'rainy-outline';
  if (lower.includes('partly') && lower.includes('cloud')) return 'partly-sunny-outline'; // Specific common case
  if (lower.includes('cloud')) return 'cloudy-outline';
  if (lower.includes('snow')) return 'snow-outline';
  if (lower.includes('thunder')) return 'thunderstorm-outline';
  if (lower.includes('clear') || lower.includes('sun')) return 'sunny-outline';
  if (lower.includes('partly')) return 'partly-sunny-outline';

  // If normalization left us with "partly-cloudy", it's covered above.
  // Last resort:
  if (!/^[a-zA-Z-]+$/.test(lower)) return 'sunny-outline'; // Allow hyphens
  return `${lower}-outline`;
};

// --- Storage Logic ---
const safeParseSessions = (raw) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const sortedSessions = (sessionsMap) =>
  Object.values(sessionsMap).sort((a, b) => b.timestamp - a.timestamp);

const toCloudSessionRow = (session, userId) => ({
  user_id: userId,
  session_id: session.id,
  preview: session.preview,
  timestamp: session.timestamp,
  messages: session.messages,
  custom_title: !!session.customTitle,
  updated_at: new Date(session.timestamp).toISOString(),
});

const toLocalSessionEntry = (row) => ({
  id: row.session_id,
  preview: row.preview || 'New Trip...',
  timestamp:
    typeof row.timestamp === 'number'
      ? row.timestamp
      : Date.parse(row.updated_at || '') || Date.now(),
  messages: Array.isArray(row.messages) ? row.messages : [],
  customTitle: !!row.custom_title,
});

async function upsertSessionsToCloud(sessions, userId) {
  if (!userId || !sessions.length) return;
  const payload = sessions.map((session) => toCloudSessionRow(session, userId));
  const { error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .upsert(payload, { onConflict: 'user_id,session_id' });
  if (error) {
    console.error('Failed to sync chat sessions to cloud', error);
  }
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

async function loadSessionsFromStorageAndCloud(userId = null) {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  const localSessionsMap = safeParseSessions(stored);

  if (!userId) {
    return sortedSessions(localSessionsMap);
  }

  // Push local cache first so sessions created on this device are not lost.
  await upsertSessionsToCloud(Object.values(localSessionsMap), userId);

  const { data, error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .select('session_id, preview, timestamp, messages, custom_title, updated_at')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Failed to load cloud sessions', error);
    return sortedSessions(localSessionsMap);
  }

  const merged = { ...localSessionsMap };
  (data || []).forEach((row) => {
    const localSession = toLocalSessionEntry(row);
    merged[localSession.id] = localSession;
  });

  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
  return sortedSessions(merged);
}

async function saveSessionToStorage(messages, currentSessionId, explicitUserId = null) {
  if (messages.length <= 2 || !currentSessionId) return;
  try {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    let preview = 'New Trip';

    if (firstUserMsg) {
      if (typeof firstUserMsg.content === 'string') preview = firstUserMsg.content;
      else if (firstUserMsg.text) preview = firstUserMsg.text;
      else if (Array.isArray(firstUserMsg.content)) preview = 'Image Analysis';
    }

    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    let sessions = safeParseSessions(stored);

    if (sessions[currentSessionId]?.customTitle) {
      preview = sessions[currentSessionId].preview;
    }

    const nextSession = {
      id: currentSessionId,
      preview:
        preview.substring(0, 30) + (sessions[currentSessionId]?.customTitle ? '' : '...'),
      timestamp: sessions[currentSessionId]?.timestamp || Date.now(),
      messages,
      customTitle: sessions[currentSessionId]?.customTitle || false,
    };

    sessions[currentSessionId] = nextSession;
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

    const userId = explicitUserId || (await getCurrentUserId());
    await upsertSessionsToCloud([nextSession], userId);
  } catch (e) {
    console.error('Failed to save session', e);
  }
}

async function deleteSessionFromStorage(sessionId, explicitUserId = null) {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  const sessions = safeParseSessions(stored);
  delete sessions[sessionId];
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

  const userId = explicitUserId || (await getCurrentUserId());
  if (!userId) return;

  const { error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('session_id', sessionId);
  if (error) {
    console.error('Failed to delete cloud session', error);
  }
}

async function renameSessionInStorage(sessionId, newName, explicitUserId = null) {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  const sessions = safeParseSessions(stored);
  if (!sessions[sessionId]) return;

  sessions[sessionId].preview = newName;
  sessions[sessionId].customTitle = true;
  sessions[sessionId].timestamp = Date.now();
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

  const userId = explicitUserId || (await getCurrentUserId());
  if (!userId) return;

  const { error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .update({
      preview: newName,
      custom_title: true,
      timestamp: sessions[sessionId].timestamp,
      updated_at: new Date(sessions[sessionId].timestamp).toISOString(),
    })
    .eq('user_id', userId)
    .eq('session_id', sessionId);
  if (error) {
    console.error('Failed to rename cloud session', error);
  }
}

async function callTravelBot(history) {
  const filteredHistory = history
    .filter((m) => !m.loading && !m.hidden)
    .map((m) => ({
      role: m.role,
      content: m.content || m.text,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
      name: m.name,
    }));

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: filteredHistory }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Network error: ${res.status} - ${errorBody}`);
    }
    return res.json();
  } catch (error) {
    console.error('Fetch error in callTravelBot:', error);
    throw error;
  }
}

const formatDateToYMD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function getToolCallsByName(messages, toolName) {
  const lastAssistantWithTools = [...messages]
    .reverse()
    .find(
      (m) =>
        (m.role === 'assistant' || m.role === 'ai') &&
        Array.isArray(m.tool_calls) &&
        m.tool_calls.length > 0
    );

  if (!lastAssistantWithTools) return [];

  return lastAssistantWithTools.tool_calls
    .filter((tc) => tc?.function?.name === toolName)
    .map((tc) => ({
      tool_call_id: tc.id,
      name: tc.function?.name,
    }));
}

// --- Components ---

const ActionSheet = ({ visible, onClose, onSelectDate, onSelectImage }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Tap outside to close */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        {/* Sheet content */}
        <TouchableWithoutFeedback>
          <View style={styles.actionSheetContainer}>
            <Text style={styles.actionSheetTitle}>Add to Chat</Text>

            <TouchableOpacity
              style={styles.actionSheetBtn}
              onPress={onSelectDate}
            >
              <Ionicons name="calendar-outline" size={24} color="#3E6FFF" />
              <Text style={styles.actionSheetBtnText}>Pick Dates</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionSheetBtn}
              onPress={onSelectImage}
            >
              <Ionicons name="image-outline" size={24} color="#3E6FFF" />
              <Text style={styles.actionSheetBtnText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

const HistoryDrawer = ({
  visible,
  onClose,
  onLoadSession,
  onDeleteSession,
  onSetChatTitle,
  topInset,
  currentSessionId,
}) => {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const glassStyle = getGlassStyle(theme);
  const glassTextStyle = getGlassTextStyle(theme);
  const [sessions, setSessions] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Context Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleLongPress = (event, item) => {
    const { pageY } = event.nativeEvent;
    // Position menu near the touch, adjusting if too low
    setMenuPosition({ x: 60, y: Math.min(pageY - 50, Dimensions.get('window').height - 200) });
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const handleRename = () => {
    setMenuVisible(false);
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Rename Chat',
        'Enter a new name for this chat',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async (newName) => {
              if (!newName?.trim() || !selectedItem?.id) return;
              await renameSessionInStorage(selectedItem.id, newName.trim(), user?.id || null);
              const refreshed = await loadSessionsFromStorageAndCloud(user?.id || null);
              setSessions(refreshed);
              // Update current header if it's the active chat
              if (selectedItem.id === currentSessionId) {
                onSetChatTitle(newName.trim());
              }
            }
          }
        ],
        'plain-text',
        selectedItem.preview
      );
    } else {
      Alert.alert('Not Supported', 'Renaming is only available on iOS currently.');
    }
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteSession(selectedItem.id);
            setSessions(prev => prev.filter(s => s.id !== selectedItem.id));
          }
        }
      ]
    );
  };


  useEffect(() => {
    let isMounted = true;
    if (visible) {
      (async () => {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!isMounted) return;
        setUser(authUser || null);
        const loaded = await loadSessionsFromStorageAndCloud(authUser?.id || null);
        if (isMounted) setSessions(loaded);
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  if (!visible) return null;

  return (

    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.drawerOverlay}>
        <BlurView
          intensity={glassStyle.shadowOpacity * 100 + 70}
          tint={theme === 'dark' ? "dark" : "light"}
          style={[styles.drawerBlur, { backgroundColor: glassStyle.backgroundColor.replace('0.03', '0.01') }]}
        >
          <LiquidTexture opacity={0.1} scale={2} />
          <GlassReflection opacity={0.05} />
          <View style={[styles.drawerHeader, { paddingTop: topInset || 10, borderBottomWidth: 0 }]}>
            <BlurView
              intensity={20}
              tint={theme === 'dark' ? "dark" : "light"}
              style={[
                styles.circleBtn,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                  borderColor: glassStyle.borderColor,
                  borderWidth: glassStyle.borderWidth,
                  overflow: 'hidden'
                }
              ]}
            >
              <LiquidTexture opacity={0.1} />
              <NoiseTexture opacity={0.2} />
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </BlurView>

            <BlurView
              intensity={20}
              tint={theme === 'dark' ? "dark" : "light"}
              style={[
                styles.historyPill,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                  borderColor: glassStyle.borderColor,
                  borderWidth: glassStyle.borderWidth,
                  overflow: 'hidden'
                }
              ]}
            >
              <LiquidTexture opacity={0.1} />
              <NoiseTexture opacity={0.2} />
              <GlassReflection />
              <View style={{ paddingHorizontal: 24, paddingVertical: 10 }}>
                <Text style={[styles.historyPillText, { color: colors.text }, glassTextStyle]}>Chats History</Text>
              </View>
            </BlurView>

            <BlurView
              intensity={20}
              tint={theme === 'dark' ? "dark" : "light"}
              style={[
                styles.circleBtn,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                  borderColor: glassStyle.borderColor,
                  borderWidth: glassStyle.borderWidth,
                  overflow: 'hidden'
                }
              ]}
            >
              <LiquidTexture opacity={0.1} />
              <NoiseTexture opacity={0.2} />
              <TouchableOpacity
                onPress={() => {
                  onClose();
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
              >
                <Ionicons name="create-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </BlurView>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.historyList, {
              paddingTop: (topInset || 10) + 80, // Header height + padding
              paddingBottom: 120, // Profile bar height + padding
            }]}
            ListEmptyComponent={
              <Text style={[styles.emptyHistoryText, { color: colors.textTertiary }]}>No history yet.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.historyItem,
                  selectedItem?.id === item.id && menuVisible && { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1F2937', borderRadius: 12 }
                ]}
                onPress={() => {
                  onLoadSession(item);
                  onSetChatTitle?.(item.preview);
                }}
                onLongPress={(e) => handleLongPress(e, item)}
                delayLongPress={300}
              >
                <Text style={[styles.historyText, { color: colors.text }, glassTextStyle]} numberOfLines={1}>
                  {item.preview}
                </Text>
                <Text style={[styles.historyDate, { color: colors.textTertiary }, glassTextStyle]}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Context Menu Overlay */}
          {menuVisible && (
            <View style={StyleSheet.absoluteFill}>
              <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)} />
              <BlurView
                intensity={80}
                tint={theme === 'dark' ? 'dark' : 'light'}
                style={[
                  styles.contextMenu,
                  { top: menuPosition.y, left: 60, right: 60, overflow: 'hidden' },
                  {
                    borderColor: glassStyle.borderColor,
                    borderWidth: glassStyle.borderWidth,
                    backgroundColor: glassStyle.backgroundColor
                  }
                ]}
              >
                <LiquidTexture opacity={0.1} />
                <TouchableOpacity style={styles.contextMenuItem} onPress={() => { setMenuVisible(false); /* Share Logic */ }}>
                  <Ionicons name="share-outline" size={20} color={colors.text} />
                  <Text style={[styles.contextMenuText, { color: colors.text }, glassTextStyle]}>Share</Text>
                </TouchableOpacity>
                <View style={[styles.contextDivider, { backgroundColor: colors.divider }]} />
                <TouchableOpacity style={styles.contextMenuItem} onPress={handleRename}>
                  <Ionicons name="pencil-outline" size={20} color={colors.text} />
                  <Text style={[styles.contextMenuText, { color: colors.text }, glassTextStyle]}>Rename</Text>
                </TouchableOpacity>
                <View style={[styles.contextDivider, { backgroundColor: colors.divider }]} />
                <TouchableOpacity style={styles.contextMenuItem} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.contextMenuText, { color: "#EF4444" }, glassTextStyle]}>Delete</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          )}

          {/* Profile Bar */}
          <BlurView
            intensity={25}
            tint={theme === 'dark' ? "dark" : "light"}
            style={[
              styles.profileBar,
              {
                backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: glassStyle.borderColor,
                borderWidth: glassStyle.borderWidth,
                overflow: 'hidden',
                bottom: insets.bottom + 20, // Floating above home indicator
                left: 20,
                right: 20,
                borderRadius: 40, // Pill shape
              }
            ]}
          >
            <LiquidTexture opacity={0.1} />
            <NoiseTexture opacity={0.15} />
            <GlassReflection />
            {user?.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: user.user_metadata.avatar_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={[styles.profileAvatar, styles.initialAvatar]}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {(user?.user_metadata?.full_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }, glassTextStyle]}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Traveler'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              onClose();
              router.push('/(tabs)/Profile');
            }}>
              <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </BlurView>
        </BlurView>
      </View>
    </Modal>
  );
};


const LoadingIndicator = React.memo(() => {
  const { colors } = useTheme();
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const i = setInterval(() => {
      setDots((p) => (p.length >= 3 ? '.' : p + '.'));
    }, 400);
    return () => clearInterval(i);
  }, []);

  return (
    <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card }]}>
      <Text style={[styles.loadingText, { color: colors.text }]}>{dots}</Text>
    </View>
  );
});

const FEATURE_CHIPS = [
  {
    id: 'route',
    title: 'Smart Route',
    subtitle: 'Plan Your Journey',
    icon: 'navigate-outline',
    type: 'date',
  },
  {
    id: 'booking',
    title: 'Instant Booking',
    subtitle: 'All in One Place',
    icon: 'flash-outline',
    type: 'userMessage',
    message: 'Book me the best deal for my next trip.',
  },
  {
    id: 'budget',
    title: 'Smart Budget',
    subtitle: 'Control Your Costs',
    icon: 'wallet-outline',
    type: 'guests',
  },
  {
    id: 'ideas',
    title: 'Trip Ideas',
    subtitle: 'Curated For You',
    icon: 'sparkles-outline',
    type: 'aiMessage',
    message: 'Looking for inspiration? Paris, Kyoto, or Lisbon this season!',
  },
];

const FeatureChipsBar = React.memo(({ onSelectChip }) => {
  const { colors, theme } = useTheme();
  const glassStyle = getGlassStyle(theme);
  const glassTextStyle = getGlassTextStyle(theme);

  return (
    <View style={styles.chipsWrap}>
      <FlatList
        data={FEATURE_CHIPS.slice(0, 3)} // Show first 3 as per mockup
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <BlurView
            intensity={glassStyle.shadowOpacity * 100 + 40} // Dynamic intensity based on theme
            tint={theme === 'dark' ? "dark" : "light"}
            style={[
              styles.chipBlur,
              {
                borderRadius: 32,
                overflow: 'hidden',
                borderColor: glassStyle.borderColor,
                borderWidth: glassStyle.borderWidth,
                backgroundColor: glassStyle.backgroundColor
              }
            ]}
          >
            <LiquidTexture opacity={0.1} />
            <GlassReflection opacity={0.2} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSelectChip(item)}
              style={[
                styles.chip,
                // Remove individual background colors as they are now handled by BlurView + GlassStyle
                { backgroundColor: 'transparent' }
              ]}
            >
              <Text style={[styles.chipTitle, { color: colors.text }, glassTextStyle]}>{item.title}</Text>
              <Text style={[styles.chipSubtitle, { color: colors.textSecondary }, glassTextStyle]}>{item.subtitle}</Text>
            </TouchableOpacity>
          </BlurView>
        )}
      />
    </View>
  );
});

const PlanCard = React.memo(({ payload }) => {
  const router = useRouter();
  const { colors, theme } = useTheme();

  if (!payload) return null;

  const {
    description = '',
    image,
    price,
    weather = {},
    location,
    dateRange,
    itinerary,
  } = payload;

  const title = location || 'Your Trip';
  const tempReadable = Number.isFinite(weather?.temp)
    ? `${weather.temp}°C`
    : null;
  const hasDetails = Array.isArray(itinerary) && itinerary.length > 0;

  const weatherIcon = getWeatherIconName(weather?.icon);

  const formatPrice = (v) => {
    if (typeof v !== 'number') return v || '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(v);
    } catch {
      return `$${v.toFixed(2)}`;
    }
  };

  useEffect(() => {
    if (image) Image.prefetch(image).catch(() => { });
  }, [image]);

  const imgSource = useMemo(
    () => (image ? { uri: image } : undefined),
    [image]
  );

  const handlePurchase = () => {
    // Logic from TripDetails.jsx
    const titleLower = title.toLowerCase();
    let checkIn = null;
    let checkOut = null;
    if (dateRange && dateRange.includes(' to ')) {
      const parts = dateRange.split(' to ');
      checkIn = parts[0];
      checkOut = parts[1];
    } else if (dateRange && dateRange.includes(' - ')) { // Handle dash format if present
      const parts = dateRange.split(' - ');
      checkIn = parts[0];
      checkOut = parts[1];
    }

    router.push({
      pathname: '/TripDetails',
      params: {
        plan: JSON.stringify(payload),
        openPayment: 'true' // Pass param to auto-open payment if possible, or just navigate to details then they click buy
      }
    });
  };

  const routerParams = useMemo(
    () => ({
      pathname: '/TripDetails',
      params: { plan: JSON.stringify(payload) },
    }),
    [payload]
  );


  return (
    <View style={[
      styles.cardContainer,
      { backgroundColor: colors.card, borderColor: colors.cardBorder },
      theme === 'light' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 0
      }
    ]}>
      {imgSource && (
        <Image
          source={imgSource}
          style={styles.cardImage}
          resizeMode="cover"
          fadeDuration={0}
        />
      )}
      <View style={styles.cardContent}>
        <View style={styles.pcRowBetween}>
          <Text
            style={[styles.pcTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {tempReadable && (
            <View style={[styles.pcWeatherPill, { backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name={weatherIcon} size={18} color={theme === 'light' ? colors.text : "#FFD166"} />
              <Text style={[styles.pcWeatherText, { color: colors.text }]}>{tempReadable}</Text>
            </View>
          )}
        </View>

        {dateRange ? (
          <Text style={[styles.pcDates, { color: colors.textSecondary }]}>{dateRange}</Text>
        ) : null}

        {!!description && (
          <Text
            style={[styles.pcDesc, { color: colors.textTertiary }]}
            numberOfLines={3}
          >
            {description}
          </Text>
        )}

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.pcPriceLabel, { color: colors.textSecondary }]}>Total price:</Text>
          <Text style={[styles.pcPriceValue, { color: colors.text }]}>{formatPrice(price)}</Text>
        </View>

        <View style={styles.pcActions}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.pcSquareBtn, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#232C38' }]}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.pcInfoBtn,
              !hasDetails && styles.pcInfoBtnDisabled,
              { backgroundColor: theme === 'light' ? '#E5E7EB' : '#232C38' }
            ]}
            disabled={!hasDetails}
            onPress={() => router.push(routerParams)}
          >
            <Text style={[styles.pcInfoText, { color: colors.text }]}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.95}
            style={[styles.pcBuyBtn, { backgroundColor: '#3E6FFF' }]}
            onPress={handlePurchase}
          >
            <Text style={styles.pcBuyText}>Buy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// --- Main Screen ---

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { colors, theme } = useTheme(); // Theme Hook

  // Load Fonts
  const [fontsLoaded] = useFonts({
    Raleway: Raleway_400Regular,
    RalewayBold: Raleway_700Bold,
    RalewaySemiBold: Raleway_600SemiBold,
  });

  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatTitle, setChatTitle] = useState('New Chat'); // Default Title


  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const chatStarted = useMemo(() => messages.length > 1, [messages]);

  const inputRef = useRef(null);
  const flatListRef = useRef(null);
  const atBottomRef = useRef(true);
  const isDraggingRef = useRef(false);
  const inputHeight = useRef(new Animated.Value(56)).current;

  const HEADER_HEIGHT = 60;
  const keyboardVerticalOffset = 0;
  /*
    Tab Bar is hidden now, so we manually ensure space.
    Standard floating input look: insets.bottom + ~20px
  */
  const bottomPadding = isKeyboardVisible
    ? insets.bottom || 10
    : (insets.bottom || 20) + 20;

  // Keyboard visibility
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Save sessions
  useEffect(() => {
    if (messages.length > 2) {
      if (!currentSessionId) {
        const newId = Date.now().toString();
        setCurrentSessionId(newId);
        saveSessionToStorage(messages, newId);
      } else {
        saveSessionToStorage(messages, currentSessionId);
      }
    }
  }, [messages, currentSessionId]);

  const openSheetNow = useCallback((type) => {
    Keyboard.dismiss();
    setTimeout(() => {
      if (type === 'date') setShowDatePicker(true);
      else if (type === 'guests') setShowGuestPicker(true);
    }, Platform.OS === 'ios' ? 100 : 150);
  }, []);

  const callApiAndUpdateMessages = useCallback(
    async (currentHistory) => {
      try {
        const response = await callTravelBot(currentHistory);
        const { aiText, signal, assistantMessage } = response;

        setMessages((prev) => {
          const prevWithoutLoading = prev.filter((m) => !m.loading);
          const next = [...prevWithoutLoading];

          if (assistantMessage) {
            let finalText = assistantMessage.content;
            let actionType = null;
            if (!finalText && signal?.type === 'dateNeeded') {
              finalText = "Select Dates";
              actionType = 'date';
            }
            if (!finalText && signal?.type === 'guestsNeeded') {
              finalText = "Who is going?";
              actionType = 'guests';
            }

            next.push({
              ...assistantMessage,
              content: finalText || assistantMessage.content,
              actionType,
              // unique ID logic
              id: assistantMessage.id || generateUniqueId('api-ai-response'),
            });
          } else if (aiText) {
            next.push({
              id: generateUniqueId('ai-text-response'),
              role: 'ai',
              text: aiText,
            });
          }

          if (signal?.type === 'planReady') {
            LayoutAnimation.easeInEaseOut();
            next.push({
              id: generateUniqueId('plan-card'),
              role: 'plan',
              payload: signal.payload,
            });
            next.push({
              id: generateUniqueId('plan-snapshot'),
              role: 'user',
              text: '[PLAN_SNAPSHOT]',
              hidden: true,
            });
          }
          return next;
        });

        if (signal?.type === 'dateNeeded') openSheetNow('date');
        if (signal?.type === 'guestsNeeded') openSheetNow('guests');
      } catch (e) {
        console.error('Failed to call API:', e);
        setMessages((prev) => [
          ...prev.filter((m) => !m.loading),
          {
            id: generateUniqueId('api-error'),
            role: 'ai',
            text: "I'm having trouble connecting. Please try again.",
          },
        ]);
      }
    },
    [openSheetNow]
  );

  const collapseInput = useCallback(() => {
    Keyboard.dismiss();
    setFocused(false);
  }, []);

  const processUserMessage = useCallback(
    async (messageObj) => {
      const loadingMessage = {
        id: generateUniqueId('loading-input'),
        role: 'ai',
        loading: true,
      };
      const newHistory = [...messages, messageObj, loadingMessage];
      setMessages(newHistory);
      setInputValue('');
      collapseInput();
      await callApiAndUpdateMessages(newHistory);
    },
    [messages, callApiAndUpdateMessages, collapseInput]
  );

  const sendUser = useCallback(
    async (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      processUserMessage({
        id: generateUniqueId('user-input'),
        role: 'user',
        text: trimmed,
      });
    },
    [processUserMessage]
  );

  // --- IMAGE PICKER (fixed) ---
  const pickImage = useCallback(async () => {
    try {
      const { granted } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'You need to allow access to your photos to upload images.'
        );
        return;
      }

      // Your Expo SDK wants lowercase strings: 'images' | 'videos' | 'livePhotos'
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      // Close sheet AFTER picker completes
      setShowActionSheet(false);

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      await processUserMessage({
        id: generateUniqueId('user-image'),
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Use this image to find location or suggest similar trips.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64
                }`,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Image Picker Error:', error);
      Alert.alert('Error', 'Failed to open image picker.');
      setShowActionSheet(false);
    }
  }, [processUserMessage]);

  const onDatesSelected = useCallback(
    async ({ startDate, endDate }) => {
      setShowDatePicker(false);
      const start = formatDateToYMD(new Date(startDate));
      const end = formatDateToYMD(new Date(endDate));

      const dateToolCalls = getToolCallsByName(
        messages,
        'request_dates'
      );
      const userMessage = {
        id: generateUniqueId('user-dates-confirm'),
        role: 'user',
        text: `📅 Selected dates: ${start} to ${end}`,
      };

      let toolMessages = [];
      if (dateToolCalls.length > 0) {
        toolMessages = dateToolCalls.map((tc) => ({
          id: generateUniqueId('tool-dates-response'),
          role: 'tool',
          tool_call_id: tc.tool_call_id,
          content: JSON.stringify({ startDate: start, endDate: end }),
          hidden: true,
        }));
      } else {
        userMessage.text = `My trip dates are from ${start} to ${end}.`;
      }

      const newHistory = [
        ...messages.filter((m) => !m.loading),
        userMessage,
        ...toolMessages,
        {
          id: generateUniqueId('loading-dates'),
          role: 'ai',
          loading: true,
        },
      ];
      setMessages(newHistory);
      await callApiAndUpdateMessages(newHistory);
    },
    [messages, callApiAndUpdateMessages]
  );

  const onGuestSelected = useCallback(
    async ({ adults, children }) => {
      setShowGuestPicker(false);
      const guestToolCalls = getToolCallsByName(
        messages,
        'request_guests'
      );
      const userMessage = {
        id: generateUniqueId('user-guests-confirm'),
        role: 'user',
        text: `👤 Guests: ${adults} adult(s), ${children} child(ren)`,
      };

      let toolMessages = [];
      if (guestToolCalls.length > 0) {
        toolMessages = guestToolCalls.map((tc) => ({
          id: generateUniqueId('tool-guests-response'),
          role: 'tool',
          tool_call_id: tc.tool_call_id,
          content: JSON.stringify({ adults, children }),
          hidden: true,
        }));
      } else {
        userMessage.text = `There will be ${adults} adult(s) and ${children} child(ren) on the trip.`;
      }

      const newHistory = [
        ...messages.filter((m) => !m.loading),
        userMessage,
        ...toolMessages,
        {
          id: generateUniqueId('loading-guests'),
          role: 'ai',
          loading: true,
        },
      ];
      setMessages(newHistory);
      await callApiAndUpdateMessages(newHistory);
    },
    [messages, callApiAndUpdateMessages]
  );

  const expanded =
    focused || inputValue.trim().length > 0;

  // Auto-scroll
  useEffect(() => {
    if (atBottomRef.current || messages.length <= 1) {
      flatListRef.current?.scrollToEnd?.({ animated: true });
    }
  }, [messages]);

  // Animate input height
  useEffect(() => {
    Animated.timing(inputHeight, {
      toValue: expanded ? 96 : 56,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [expanded, inputHeight]);

  const updateAtBottom = useCallback((e) => {
    const { contentOffset, layoutMeasurement, contentSize } =
      e.nativeEvent;
    atBottomRef.current =
      contentSize.height -
      (contentOffset.y + layoutMeasurement.height) <
      40;
  }, []);

  useEffect(() => {
    if (focused) {
      const timer = setTimeout(
        () => inputRef.current?.focus(),
        Platform.OS === 'ios' ? 0 : 100
      );
      return () => clearTimeout(timer);
    } else {
      Keyboard.dismiss();
    }
  }, [focused]);

  const handleChipSelect = useCallback(
    (chip) => {
      if (chip.type === 'date') openSheetNow('date');
      else if (chip.type === 'guests') openSheetNow('guests');
      else if (chip.type === 'userMessage') sendUser(chip.message);
      else if (chip.type === 'aiMessage')
        setMessages((prev) => [
          ...prev,
          {
            id: generateUniqueId('ai-idea'),
            role: 'ai',
            text: chip.message,
          },
        ]);
    },
    [openSheetNow, sendUser]
  );

  const renderMessage = useCallback(({ item }) => {
    if (item.hidden) return null;
    if (item.loading) return <LoadingIndicator />;
    if (item.role === 'plan') return <PlanCard payload={item.payload} />;

    const role = item.role === 'assistant' ? 'ai' : item.role;
    let textContent = item.text;
    let imageUrl = null;

    if (Array.isArray(item.content)) {
      const textPart = item.content.find((c) => c.type === 'text');
      const imgPart = item.content.find(
        (c) => c.type === 'image_url'
      );
      if (textPart) textContent = textPart.text;
      if (imgPart) imageUrl = imgPart.image_url.url;
    } else if (item.content && typeof item.content === 'string') {
      textContent = item.content;
    }

    const isAction = !!item.actionType;
    const BubbleComponent = isAction ? TouchableOpacity : View;

    return (
      <BubbleComponent
        activeOpacity={0.7}
        onPress={() => {
          if (item.actionType === 'date') openSheetNow('date');
          if (item.actionType === 'guests') openSheetNow('guests');
        }}
        style={[
          styles.messageBubble,
          role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: colors.card }],
          isAction && { borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
          theme === 'light' && {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
          }
        ]}
      >
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: 200,
              height: 150,
              borderRadius: 10,
              marginBottom: 8,
            }}
          />
        )}
        <Text style={[styles.messageText, role !== 'user' && { color: colors.text }]}>{
          textContent
            ? textContent
                .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/^#{1,4}\s+/gm, '')
                .replace(/^[-]\s+/gm, '• ')
                .replace(/`([^`]+)`/g, '$1')
            : ''
        }</Text>
        {isAction && <Ionicons name="chevron-down" size={18} color={colors.text} />}
      </BubbleComponent>
    );
  }, [colors]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.welcomeContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#3E6FFF" />
      </View>
    );
  }

  /* Header with Glass Effect */
  const glassStyle = getGlassStyle(theme);
  const glassTextStyle = getGlassTextStyle(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={theme === 'dark' ? BACKGROUND_GRADIENT : ['#E8F1F8', '#F3F4F6', '#FFFFFF']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />

      {/* LiquidTexture and Orbs removed for flat design */}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {/* Header */}
        <View style={[styles.headerBar, { height: HEADER_HEIGHT }]}>
          <BlurView
            intensity={20}
            tint={theme === 'dark' ? "dark" : "light"}
            style={[
              styles.circleBtn,
              {
                borderColor: glassStyle.borderColor,
                borderWidth: glassStyle.borderWidth,
                backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                overflow: 'hidden' // Important for BlurView to clip
              }
            ]}
          >
            <LiquidTexture opacity={0.1} />
            <NoiseTexture opacity={0.2} />
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
              onPress={() => setShowHistory(true)}
            >
              <Ionicons name="menu-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </BlurView>

          <BlurView
            intensity={20}
            tint={theme === 'dark' ? "dark" : "light"}
            style={[
              styles.newChatPill,
              {
                borderColor: glassStyle.borderColor,
                borderWidth: glassStyle.borderWidth,
                backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                overflow: 'hidden'
              }
            ]}
          >
            <LiquidTexture opacity={0.1} />
            <NoiseTexture opacity={0.2} />
            <GlassReflection />
            <View style={{ paddingHorizontal: 24, paddingVertical: 10 }}>
              <Text style={[styles.newChatText, { color: glassTextStyle.color }, glassTextStyle]} numberOfLines={1}>
                {chatTitle}
              </Text>
            </View>
          </BlurView>

          <BlurView
            intensity={20}
            tint={theme === 'dark' ? "dark" : "light"}
            style={[
              styles.circleBtn,
              {
                borderColor: glassStyle.borderColor,
                borderWidth: glassStyle.borderWidth,
                backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                overflow: 'hidden'
              }
            ]}
          >
            <LiquidTexture opacity={0.1} />
            <NoiseTexture opacity={0.2} />
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
              onPress={() => {
                Keyboard.dismiss();
                setMessages([WELCOME_MESSAGE]);
                setCurrentSessionId(null);
                setChatTitle('New Chat'); // Reset Title
              }}
            >
              <Ionicons name="create-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.chatContainer}>
            {focused && chatStarted && (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={collapseInput}
              />
            )}

            {!chatStarted ? (
              <TouchableWithoutFeedback onPress={collapseInput}>
                <View style={styles.welcomeContainer}>
                  <Text style={styles.logoText}>NÜVIA</Text>
                  <Text style={[styles.welcomeText, { color: colors.text }]}>
                    Welcome. I'll take care of your journey.
                  </Text>
                  <Text style={[styles.subtitleText, { color: colors.textTertiary }]}>
                    Where shall we begin your journey today?
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatContent}
                ListFooterComponent={<View style={{ height: 12 }} />}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScroll={updateAtBottom}
                onScrollBeginDrag={() => {
                  isDraggingRef.current = true;
                }}
                onScrollEndDrag={() => {
                  requestAnimationFrame(() => {
                    isDraggingRef.current = false;
                  });
                }}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
              />
            )}
          </View>

          {/* Input + Chips */}
          <View style={[styles.bottomSection, { paddingBottom: bottomPadding }]}>
            {!chatStarted && (
              <FeatureChipsBar onSelectChip={handleChipSelect} />
            )}

            <BlurView
              intensity={25}
              tint={theme === 'dark' ? "dark" : "light"}
              style={[
                styles.inputContainerBlur,
                {
                  borderColor: glassStyle.borderColor,
                  borderWidth: glassStyle.borderWidth,
                  backgroundColor: theme === 'dark' ? 'rgba(22, 27, 35, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                }
              ]}
            >
              <LiquidTexture opacity={0.05} />
              <NoiseTexture opacity={0.15} />
              <GlassReflection opacity={0.15} />
              <View style={[
                styles.inputInner,
                // Remove solid background completely
                { backgroundColor: 'transparent' }
              ]}>
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => setShowActionSheet(true)}
                >
                  <Ionicons name="add" size={28} color={theme === 'dark' ? "#D1D5DB" : "#6B7280"} />
                </TouchableOpacity>

                <TextInput
                  ref={inputRef}
                  placeholder="Plan your trip"
                  placeholderTextColor={theme === 'dark' ? '#9CA3AF' : colors.textTertiary}
                  value={inputValue}
                  onChangeText={setInputValue}
                  style={[styles.glassInput, { color: colors.text }, glassTextStyle]}
                  multiline={false}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={() => sendUser(inputValue)}
                  blurOnSubmit
                />

                <TouchableOpacity
                  onPress={() => inputValue.trim().length > 0 ? sendUser(inputValue) : console.log('Mic pressed')}
                  style={styles.micBtn}
                >
                  <Ionicons
                    name={inputValue.trim().length > 0 ? "arrow-up-circle" : "mic-outline"}
                    size={inputValue.trim().length > 0 ? 32 : 24}
                    color={inputValue.trim().length > 0 ? "#3E6FFF" : (theme === 'dark' ? "#D1D5DB" : "#6B7280")}
                  />
                </TouchableOpacity>
              </View>
            </BlurView>

            <View style={{ height: 10 }} />
          </View>
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DatePickerSheet
          onClose={() => setShowDatePicker(false)}
          onDateSelected={onDatesSelected}
        />
      )
      }
      {
        showGuestPicker && (
          <GuestPicker
            onClose={() => setShowGuestPicker(false)}
            onGuestSelected={onGuestSelected}
          />
        )
      }

      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onSelectDate={() => {
          setShowActionSheet(false);
          openSheetNow('date');
        }}
        onSelectImage={pickImage}
      />

      <HistoryDrawer
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        topInset={insets.top}
        onLoadSession={(sessionItem) => {
          setMessages(sessionItem.messages);
          setCurrentSessionId(sessionItem.id);
          setShowHistory(false);
        }}
        onDeleteSession={async (id) => {
          await deleteSessionFromStorage(id);
          if (currentSessionId === id) {
            setMessages([
              WELCOME_MESSAGE,
            ]);
            setCurrentSessionId(null);
            setChatTitle('New Chat');
          }
        }}
        onSetChatTitle={setChatTitle}
        currentSessionId={currentSessionId}
      />
    </View >
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0E1116' }, // Darker background

  // Header
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 100,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#161B23',  <-- REMOVED
  },
  newChatPill: {
    borderRadius: 30,
    overflow: 'hidden',
    // backgroundColor: '#161B23', <-- REMOVED
  },
  newChatText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontFamily: 'Raleway',
    letterSpacing: 0.5,
  },

  body: { flex: 1 },
  chatContainer: { flex: 1, justifyContent: 'center' },

  // Welcome Area
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    color: '#3E6FFF',
    fontSize: 42,
    fontFamily: 'RalewayBold',
    letterSpacing: 1,
    marginBottom: 16,
    textShadowColor: 'rgba(62, 111, 255, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'RalewaySemiBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    color: '#6B7280', // Grey text
    fontSize: 15,
    fontFamily: 'Raleway',
    textAlign: 'center',
  },

  // Chat List
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 160,
  },

  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },

  // Chips
  chipsWrap: { marginBottom: 20 },
  chipsContent: { paddingHorizontal: 4 },
  chipBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    width: 170, // Increased width to fit "Instant Booking" on one line
    height: 64,
    justifyContent: 'center',
  },
  chipTitle: {
    color: '#E8EDF7',
    fontSize: 15,
    fontFamily: 'RalewaySemiBold',
    marginBottom: 4,
  },
  chipSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Raleway',
  },

  // Input
  inputContainerBlur: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    // backgroundColor: 'rgba(20, 25, 33, 0.7)', <-- REMOVED
  },
  plusBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Raleway',
    paddingHorizontal: 10,
    height: 40,
  },
  micBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  // Messages (Legacy but kept for chat flow)
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginVertical: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3E6FFF', // Blue for user
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#232C38',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Raleway',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Raleway',
  },

  // Plan Card
  cardContainer: {
    width: '100%',
    backgroundColor: '#161B23',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#232C38',
  },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 16 },
  pcRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pcTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
    paddingRight: 10,
    fontFamily: 'RalewayBold',
  },
  pcWeatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pcWeatherText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'RalewaySemiBold',
  },
  pcDates: {
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: 'Raleway',
  },
  pcDesc: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Raleway',
  },
  pcPriceLabel: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'Raleway',
  },
  pcPriceValue: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    marginTop: 2,
    fontFamily: 'RalewayBold',
  },
  pcActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  pcSquareBtn: {
    height: 44,
    width: 44,
    borderRadius: 14,
    backgroundColor: '#232C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcInfoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#232C38',
  },
  pcInfoBtnDisabled: { opacity: 0.5 },
  pcInfoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'RalewayBold',
  },
  pcBuyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#3E6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcBuyText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: 'RalewayBold',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#161B23',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Raleway',
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionSheetBtnText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 16,
    fontFamily: 'RalewaySemiBold',
  },
  divider: { height: 1, backgroundColor: '#232C38' },

  // Drawer
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawerBlur: {
    flex: 1,
    // backgroundColor handled inline for theme
  },
  drawerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  historyPillText: {
    color: '#E8EDF7',
    fontSize: 16,
    fontFamily: 'Raleway',
  },
  historyList: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  emptyHistoryText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Raleway',
    fontSize: 16,
  },
  historyItem: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  historyText: {
    color: '#F9FAFB',
    fontSize: 17,
    fontFamily: 'RalewayBold',
    marginBottom: 4,
  },
  historyDate: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: 'Raleway',
  },

  profileBar: {
    position: 'absolute',
    // Bottom/Left/Right handled inline for safe area
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    // marginHorizontal: 20, handled by left/right
    // marginBottom: 40, handled by bottom
    // borderRadius: 40, handled inline
    borderTopWidth: 0,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  initialAvatar: {
    backgroundColor: '#3E6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'RalewaySemiBold',
  },

  // Context Menu
  contextMenu: {
    position: 'absolute',
    borderRadius: 16,
    paddingVertical: 4,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  contextMenuText: {
    fontSize: 16,
    fontFamily: 'Raleway',
  },
  contextDivider: {
    height: 1,
    width: '100%',
  },
});
