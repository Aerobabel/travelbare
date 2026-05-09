// app/screens/ChatScreen.jsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  InteractionManager,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePickerSheet from '../components/DatePickerSheet';
import GuestPicker from '../components/GuestPicker';
import PaymentSheet from '../components/PaymentSheet';

const WELCOME_MESSAGE = {
  role: 'ai',
  text: "Hi! I'm your travel assistant - where would you like to go?",
};

// cache to keep chat when navigating away/back
let cachedMessages = null;

const CHAT_API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://travelapi-34zi.onrender.com';
const CHAT_ENDPOINT = `${CHAT_API_BASE.replace(/\/$/, '')}/chat/travel`;

async function callTravelBot(history) {
  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.warn('callTravelBot failed', err);
    throw err;
  }
}

// shallow equality to avoid identical consecutive plan cards
const isSamePlan = (a, b) =>
  !!a &&
  !!b &&
  a.location === b.location &&
  a.dates === b.dates &&
  a.description === b.description &&
  a.image === b.image &&
  a.price === b.price;

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialUserMessage = route.params?.initialUserMessage;
  const tripData = route.params?.tripData; // NEW: Trip context

  const [messages, setMessages] = useState(() => cachedMessages ?? [WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);

  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const hasHandledInitial = useRef(false);

  useEffect(() => {
    cachedMessages = messages;
  }, [messages]);

  // handle deep link “start message” or “trip context”
  useEffect(() => {
    if (!hasHandledInitial.current) {
      if (tripData) {
        hasHandledInitial.current = true;
        // 1. Show user what we are talking about
        const tripSnapshot = {
          role: 'ai',
          text: `I see you want to discuss your trip to ${tripData.city}. What would you like to know?`,
        };
        // 2. Send invisible context to AI
        const hiddenContext = {
          role: 'user',
          text: `[SYSTEM_CONTEXT] User is discussing this trip: ${JSON.stringify(tripData)}. Reply helpfully about this specific trip.`,
          hidden: true
        };

        setMessages(prev => [...prev, tripSnapshot]);

        // Auto-send context to backend so it knows immediately
        callTravelBot(historyForServer([...messages, hiddenContext])).catch(() => { });
      } else if (initialUserMessage) {
        hasHandledInitial.current = true;
        sendUser(initialUserMessage);
      }
    }
  }, [initialUserMessage, tripData]);

  // auto scroll on updates
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, showDatePicker, showGuestPicker]);

  // keyboard padding
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      const height = e?.endCoordinates?.height ?? 0;
      Animated.timing(keyboardOffset, {
        toValue: height,
        duration: Platform.OS === 'ios' ? (e?.duration ?? 250) : 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  /** open bottom sheet(s) cleanly, no side effects */
  const openSheetNow = (type) => {
    Keyboard.dismiss();
    LayoutAnimation.easeInEaseOut();
    setTimeout(() => {
      if (type === 'date') setShowDatePicker(true);
      if (type === 'guests') setShowGuestPicker(true);
      if (type === 'payment') setShowPaymentSheet(true);
    }, 0);
  };

  /** history sent to server: include hidden control messages, exclude plan cards */
  const historyForServer = (localMsgs, extra) => {
    const base = localMsgs.filter((m) => m.role !== 'plan');
    return extra ? [...base, extra] : base;
  };

  /** main dispatcher for server “signals” */
  const handleSignal = (signal, aiText) => {
    if (aiText) {
      setMessages((prev) => [...prev, { role: 'ai', text: aiText }]);
    }

    if (signal?.type === 'dateNeeded') {
      openSheetNow('date');
      return;
    }
    if (signal?.type === 'guestsNeeded') {
      openSheetNow('guests');
      return;
    }

    if (signal?.type === 'planReady') {
      LayoutAnimation.easeInEaseOut();
      setMessages((prev) => {
        const lastPlan = [...prev].reverse().find((m) => m.role === 'plan')?.payload;
        if (isSamePlan(lastPlan, signal.payload)) {
          // no duplicate of the exact same payload right after
          return prev;
        }
        // append plan and a hidden user marker so server only considers *new* info for future plans
        return [
          ...prev,
          { role: 'plan', payload: signal.payload },
          { role: 'user', text: '[PLAN_SNAPSHOT]', hidden: true },
        ];
      });

      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      });
    }
  };

  /** send normal user text */
  const sendUser = async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsTyping(true);

    try {
      const history = historyForServer(messages, { role: 'user', text: trimmed });
      const { aiText, signal } = await callTravelBot(history);
      setIsTyping(false);
      if (signal) handleSignal(signal, aiText);
      else if (aiText) setMessages((prev) => [...prev, { role: 'ai', text: aiText }]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'ai', text: "I couldn't reach the server. Try again?" }]);
    }
  };

  /** date picker callback */
  const onDatesSelected = async ({ startDate, endDate }) => {
    setShowDatePicker(false);
    const fact = `I'd like to go from ${startDate} to ${endDate}`;
    setMessages((prev) => [...prev, { role: 'user', text: fact }]);
    setIsTyping(true);

    try {
      const history = historyForServer(messages, { role: 'user', text: fact });
      const { aiText, signal } = await callTravelBot(history);
      setIsTyping(false);
      if (signal) handleSignal(signal, aiText);
      else if (aiText) setMessages((prev) => [...prev, { role: 'ai', text: aiText }]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'ai', text: "Couldn't save your dates — try again?" }]);
    }
  };

  /** guest picker callback */
  const onGuestSelected = async ({ adults, children }) => {
    setShowGuestPicker(false);
    const fact = `We're ${adults} adult(s) and ${children} child(ren).`;
    setMessages((prev) => [...prev, { role: 'user', text: fact }]);
    setIsTyping(true);

    try {
      const history = historyForServer(messages, { role: 'user', text: fact });
      const { aiText, signal } = await callTravelBot(history);
      setIsTyping(false);
      if (signal) handleSignal(signal, aiText);
      else if (aiText) setMessages((prev) => [...prev, { role: 'ai', text: aiText }]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'ai', text: "Couldn't save your guests — try again?" }]);
    }
  };

  /** inline plan card */
  const PlanCard = ({ payload }) => {
    if (!payload) return null;
    const { location, dates, description, image, price } = payload;

    return (
      <View
        style={styles.cardContainer}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      >
        {!!image && <Image source={{ uri: image }} style={styles.cardImage} />}
        <View style={styles.cardContent}>
          <Text style={styles.city}>{location || 'Your Trip'}</Text>
          <Text style={styles.date}>{dates || ''}</Text>
          <Text style={styles.desc}>{description || ''}</Text>
          {!!price && <Text style={styles.price}>{price}</Text>}

          <View style={styles.cardButtons}>
            <TouchableOpacity style={styles.cardButton}>
              <Ionicons name="location-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardButton}>
              <Ionicons name="map-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardButton}>
              <Ionicons name="mail-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => {
                // Determine if we should navigate or show payment sheet
                // For this request, "Buy" opens the payment sheet
                setSelectedPlanForPayment(payload);
                openSheetNow('payment');
              }}
            >
              <Text style={styles.buyText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  /** renderer for chat rows */
  const renderMessage = ({ item }) => {
    if (item.hidden) return <View style={{ height: 0 }} />; // keep indexes stable
    if (item.role === 'plan') return <PlanCard payload={item.payload} />;

    return (
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <StyledText style={styles.messageText}>{item.text}</StyledText>
      </View>
    );
  };

  /** Clean any leftover markdown from AI text and render with lightweight bold support. */
  const StyledText = ({ style, children }) => {
    if (!children) return null;
    // Strip markdown artifacts the server didn't catch
    let cleaned = children
      .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
      .replace(/^#{1,4}\s+/gm, '')
      .replace(/^[-]\s+/gm, '• ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/---+/g, '');

    // Split on **bold** so we can render bold spans
    const parts = cleaned.split(/(\*\*.*?\*\*)/g);

    return (
      <Text style={style}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={index} style={{ fontWeight: '700' }}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          // Strip any remaining single asterisks
          const plain = part.replace(/\*(.*?)\*/g, '$1');
          return <Text key={index}>{plain}</Text>;
        })}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.wrapper} edges={['top', 'bottom']}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View style={[styles.container, { paddingBottom: keyboardOffset }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16 }}
          ListFooterComponent={
            <>
              {isTyping && (
                <View style={[styles.messageBubble, styles.aiBubble, { paddingVertical: 12, paddingHorizontal: 16 }]}>
                  <Text style={{ color: '#9ca3af', fontSize: 14, letterSpacing: 2 }}>typing...</Text>
                </View>
              )}
              <View style={{ height: 12 }} />
            </>
          }
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Plan your trip"
            placeholderTextColor="#888"
            returnKeyType="send"
            onSubmitEditing={() => sendUser(input)}
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => sendUser(input)}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {showDatePicker && (
        <DatePickerSheet onClose={() => setShowDatePicker(false)} onDateSelected={onDatesSelected} />
      )}

      {showGuestPicker && (
        <GuestPicker onClose={() => setShowGuestPicker(false)} onGuestSelected={onGuestSelected} />
      )}

      {showPaymentSheet && (
        <PaymentSheet
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          plan={selectedPlanForPayment}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0E141C', // slate-900 vibe
  },
  customHeader: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E141C',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
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
    backgroundColor: '#2563eb',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },

  // input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    backgroundColor: '#0E141C',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#0E141C',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 15,
  },
  sendButton: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // plan card
  cardContainer: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: 12,
  },
  city: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  date: {
    color: '#9ca3af',
    marginTop: 2,
    marginBottom: 8,
  },
  desc: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 18,
  },
  price: {
    color: '#22c55e',
    fontWeight: '700',
    marginTop: 8,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cardButton: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButton: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: {
    color: '#fff',
    fontWeight: '700',
  },
});
