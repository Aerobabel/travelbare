import {
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
  useFonts,
} from '@expo-google-fonts/raleway';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
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

import DatePickerSheet from '../../components/DatePickerSheet';
import GuestPicker from '../../components/GuestPicker';

import MenuIcon from '@/assets/icons/Menu.svg';
import NewIcon from '@/assets/icons/New.svg';
import Logo from '@/assets/images/Logo.svg';

// --- Constants & Helpers ---

const WELCOME_MESSAGE = {
  id: 'welcome-0',
  role: 'ai',
  text: "Hi! I'm your travel assistant - where would you like to go?",
};

const SESSION_STORAGE_KEY = 'travel_chat_sessions';

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
  const lower = rawIcon.toLowerCase();
  if (lower.includes('rain')) return 'rainy-outline';
  if (lower.includes('cloud')) return 'cloudy-outline';
  if (lower.includes('snow')) return 'snow-outline';
  if (lower.includes('thunder')) return 'thunderstorm-outline';
  if (lower.includes('clear') || lower.includes('sun')) return 'sunny-outline';
  if (lower.includes('partly')) return 'partly-sunny-outline';
  if (!/^[a-zA-Z]+$/.test(lower)) return 'sunny-outline';
  return `${lower}-outline`;
};

// --- Storage Logic ---
async function saveSessionToStorage(messages, currentSessionId) {
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
    let sessions = stored ? JSON.parse(stored) : {};

    sessions[currentSessionId] = {
      id: currentSessionId,
      preview: preview.substring(0, 30) + '...',
      timestamp: sessions[currentSessionId]?.timestamp || Date.now(),
      messages,
    };

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save session', e);
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
  topInset,
}) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(SESSION_STORAGE_KEY).then((res) => {
        if (res) {
          const parsed = JSON.parse(res);
          const sorted = Object.values(parsed).sort(
            (a, b) => b.timestamp - a.timestamp
          );
          setSessions(sorted);
        } else {
          setSessions([]);
        }
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.drawerOverlay}>
        <View style={[styles.drawerContent, { paddingTop: topInset + 10 }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Saved Trips</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: '#666',
                  textAlign: 'center',
                  marginTop: 20,
                  fontFamily: 'Raleway',
                }}
              >
                No history yet.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => onLoadSession(item)}
                >
                  <Text
                    style={styles.historyText}
                    numberOfLines={1}
                  >
                    {item.preview}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onDeleteSession(item.id);
                    setSessions((prev) => prev.filter((s) => s.id !== item.id));
                  }}
                  style={{ padding: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#ff4444"
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
};

const LoadingIndicator = React.memo(() => {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const i = setInterval(() => {
      setDots((p) => (p.length >= 3 ? '.' : p + '.'));
    }, 400);
    return () => clearInterval(i);
  }, []);

  return (
    <View style={[styles.messageBubble, styles.aiBubble]}>
      <Text style={styles.loadingText}>{dots}</Text>
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

const FeatureChipsBar = React.memo(({ onSelectChip }) => (
  <View style={styles.chipsWrap}>
    <FlatList
      data={FEATURE_CHIPS}
      keyExtractor={(i) => i.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContent}
      ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onSelectChip(item)}
          style={styles.chip}
        >
          <View style={styles.chipIcon}>
            <Ionicons name={item.icon} size={16} color="#C8D1E5" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.chipTitle}>{item.title}</Text>
            <Text style={styles.chipSubtitle}>{item.subtitle}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  </View>
));

const PlanCard = React.memo(({ payload }) => {
  const router = useRouter();
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
    if (image) Image.prefetch(image).catch(() => {});
  }, [image]);

  const imgSource = useMemo(
    () => (image ? { uri: image } : undefined),
    [image]
  );
  const routerParams = useMemo(
    () => ({
      pathname: '/TripDetails',
      params: { plan: JSON.stringify(payload) },
    }),
    [payload]
  );

  return (
    <View style={styles.cardContainer}>
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
            style={styles.pcTitle}
            numberOfLines={1}
          >
            {title}
          </Text>
          {tempReadable && (
            <View style={styles.pcWeatherPill}>
              <Ionicons name={weatherIcon} size={16} color="#FFD166" />
              <Text style={styles.pcWeatherText}>{tempReadable}</Text>
            </View>
          )}
        </View>
        {dateRange ? (
          <Text style={styles.pcDates}>{dateRange}</Text>
        ) : null}
        {!!description && (
          <Text
            style={styles.pcDesc}
            numberOfLines={3}
          >
            {description}
          </Text>
        )}
        {!!price && (
          <>
            <Text style={styles.pcPriceLabel}>Total price:</Text>
            <Text style={styles.pcPriceValue}>{formatPrice(price)}</Text>
          </>
        )}
        <View style={styles.pcActions}>
          <TouchableOpacity activeOpacity={0.9} style={styles.pcSquareBtn}>
            <Ionicons name="share-outline" size={18} color="#AFC1D8" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} style={styles.pcSquareBtn}>
            <Ionicons name="heart-outline" size={18} color="#AFC1D8" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.pcInfoBtn,
              !hasDetails && styles.pcInfoBtnDisabled,
            ]}
            disabled={!hasDetails}
            onPress={() => router.push(routerParams)}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#C9D5E9"
            />
            <Text style={styles.pcInfoText}>Info</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.95} style={styles.pcBuyBtn}>
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

  // Load Fonts
  const [fontsLoaded] = useFonts({
    Raleway: Raleway_400Regular,
    RalewayBold: Raleway_700Bold,
    RalewaySemiBold: Raleway_600SemiBold,
  });

  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

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
  const bottomPadding = isKeyboardVisible
    ? insets.bottom || 6
    : tabBarHeight || insets.bottom || 10;

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
            next.push({
              ...assistantMessage,
              id:
                assistantMessage.id ||
                generateUniqueId('api-ai-response'),
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
              url: `data:${asset.mimeType ?? 'image/jpeg'};base64,${
                asset.base64
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

    return (
      <View
        style={[
          styles.messageBubble,
          role === 'user' ? styles.userBubble : styles.aiBubble,
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
        <Text style={styles.messageText}>{textContent}</Text>
      </View>
    );
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.welcomeContainer}>
        <ActivityIndicator color="#3E6FFF" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {/* Header */}
        <View
          style={[
            styles.headerBar,
            { height: HEADER_HEIGHT },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowHistory(true)}
          >
            <MenuIcon width={26} height={26} />
          </TouchableOpacity>
          <Text style={styles.headerBarText}>Chat</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Keyboard.dismiss();
              setMessages([WELCOME_MESSAGE]);
              setCurrentSessionId(null);
            }}
          >
            <NewIcon width={24} height={24} />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View
          style={[
            styles.body,
            { paddingBottom: bottomPadding },
          ]}
        >
          <View style={styles.chatContainer}>
            {focused && chatStarted && (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={collapseInput}
              />
            )}

            {!chatStarted ? (
              <TouchableWithoutFeedback
                onPress={collapseInput}
              >
                <View style={styles.welcomeContainer}>
                  <View style={{ marginBottom: 20 }}>
                    <Logo width={75} height={38} />
                  </View>
                  <Text style={styles.title}>
                    Hi there! I'm your AI Travel Assistant
                  </Text>
                  <Text style={styles.subtitle}>
                    Where would you like to go today?
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
                ListFooterComponent={
                  <View style={{ height: 12 }} />
                }
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
          <View style={styles.inputArea}>
            {!chatStarted && (
              <FeatureChipsBar
                onSelectChip={handleChipSelect}
              />
            )}

            <Animated.View
              style={[
                styles.inputContainer,
                {
                  height: inputHeight,
                  flexDirection: expanded
                    ? 'column'
                    : 'row',
                  alignItems: expanded
                    ? 'stretch'
                    : 'center',
                },
              ]}
            >
              {!expanded ? (
                <>
                  <TouchableOpacity
                    style={[styles.iconBtn, { marginRight: 8 }]}
                    onPress={() => setShowActionSheet(true)}
                  >
                    <Ionicons
                      name="add"
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  <TextInput
                    ref={inputRef}
                    placeholder="Plan trip / Paste link"
                    placeholderTextColor="#aaa"
                    value={inputValue}
                    onChangeText={setInputValue}
                    style={styles.inlineInput}
                    multiline={false}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={() =>
                      sendUser(inputValue)
                    }
                    blurOnSubmit
                  />

                  {inputValue.trim().length === 0 ? (
                    <TouchableOpacity
                      style={[
                        styles.iconBtn,
                        { marginLeft: 8 },
                      ]}
                    >
                      <Ionicons
                        name="mic-outline"
                        size={20}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.iconBtn,
                        styles.sendFilled,
                        { marginLeft: 8, height: 40, width: 40 },
                      ]}
                      onPress={() => sendUser(inputValue)}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={24}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <TextInput
                    ref={inputRef}
                    placeholder="Plan your trip"
                    placeholderTextColor="#a0a0a0"
                    value={inputValue}
                    onChangeText={setInputValue}
                    style={styles.textArea}
                    multiline
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                  <View
                    style={[
                      styles.iconsRow,
                      { marginTop: 8 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() =>
                        setShowActionSheet(true)
                      }
                    >
                      <Ionicons
                        name="add"
                        size={22}
                        color="#fff"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.iconBtn,
                        styles.sendFilled,
                        { height: 40, width: 40 },
                      ]}
                      onPress={() => sendUser(inputValue)}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={24}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DatePickerSheet
          onClose={() => setShowDatePicker(false)}
          onDateSelected={onDatesSelected}
        />
      )}
      {showGuestPicker && (
        <GuestPicker
          onClose={() => setShowGuestPicker(false)}
          onGuestSelected={onGuestSelected}
        />
      )}

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
          const stored =
            await AsyncStorage.getItem(SESSION_STORAGE_KEY);
          const sessions = stored ? JSON.parse(stored) : {};
          delete sessions[id];
          await AsyncStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify(sessions)
          );
          if (currentSessionId === id) {
            setMessages([
              WELCOME_MESSAGE,
            ]);
            setCurrentSessionId(null);
          }
        }}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0E141C' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0E141C',
  },
  headerBarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'RalewayBold',
  },
  body: { flex: 1 },
  chatContainer: { flex: 1, justifyContent: 'center' },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'RalewayBold',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.37)',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'Raleway',
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputArea: {
    paddingHorizontal: 20,
    backgroundColor: '#0E141C',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginVertical: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1A2028',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e2a3a0c',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Raleway',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Raleway',
  },
  cardContainer: {
    width: '100%',
    backgroundColor: '#0F1722',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1E2A3A',
  },
  cardImage: { width: '100%', height: 150 },
  cardContent: { padding: 12 },
  pcRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pcTitle: {
    color: '#EAF2FF',
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
    backgroundColor: '#132233',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#22354B',
  },
  pcWeatherText: {
    color: '#E6F0FF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'RalewaySemiBold',
  },
  pcDates: {
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    fontFamily: 'Raleway',
  },
  pcDesc: {
    color: '#C9D5E9',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Raleway',
  },
  pcPriceLabel: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'Raleway',
  },
  pcPriceValue: {
    color: '#EAF2FF',
    fontWeight: '800',
    fontSize: 20,
    marginTop: 2,
    fontFamily: 'RalewayBold',
  },
  pcActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  pcSquareBtn: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: '#1B2636',
    borderWidth: 1,
    borderColor: '#27374B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcInfoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1B2636',
    borderWidth: 1,
    borderColor: '#27374B',
  },
  pcInfoBtnDisabled: { opacity: 0.4 },
  pcInfoText: {
    color: '#C9D5E9',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'RalewayBold',
  },
  pcBuyBtn: {
    flex: 1,
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 14,
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
  chipsWrap: { marginBottom: 14 },
  chipsContent: { paddingHorizontal: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171E27',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#232C38',
  },
  chipIcon: {
    height: 24,
    width: 24,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#121821',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTitle: {
    color: '#E8EDF7',
    fontSize: 16,
    fontFamily: 'RalewaySemiBold',
  },
  chipSubtitle: {
    color: '#a0a0a0',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Raleway',
  },
  inputContainer: {
    backgroundColor: '#1C222C',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 4,
    overflow: 'hidden',
  },
  inlineInput: {
    flex: 1,
    color: '#a0a0a0',
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 80,
    fontFamily: 'Raleway',
  },
  textArea: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    padding: 0,
    maxHeight: 140,
    fontFamily: 'Raleway',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  iconBtn: {
    height: 40,
    width: 40,
    borderRadius: 10,
    backgroundColor: '#1C222C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendFilled: { backgroundColor: '#3E6FFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#1A2028',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  actionSheetTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Raleway',
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  actionSheetBtnText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 15,
    fontFamily: 'RalewaySemiBold',
  },
  divider: { height: 1, backgroundColor: '#333' },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
  },
  drawerContent: {
    width: '80%',
    backgroundColor: '#0E141C',
    height: '100%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  drawerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'RalewayBold',
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1C222C',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'RalewaySemiBold',
  },
  historyDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Raleway',
  },
});
