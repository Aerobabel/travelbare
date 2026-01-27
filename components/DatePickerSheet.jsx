import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const COL = Math.floor((width - H_PAD * 2) / 7);

// --- Date Utilities ---
const toKey = (d) => {
  if (!d) return null;
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateMonths = () => {
  const list = [];
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(2028, 2, 1));

  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();

  while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth())) {
    const first = new Date(Date.UTC(y, m, 1));
    const last = new Date(Date.UTC(y, m + 1, 0));
    let lead = first.getUTCDay();
    lead = lead === 0 ? 6 : lead - 1;

    const fixedLead = lead === 0 ? 6 : lead - 1;

    const days = [];
    for (let i = 0; i < fixedLead; i++) days.push(null);
    for (let d = 1; d <= last.getUTCDate(); d++) days.push(new Date(Date.UTC(y, m, d)));

    list.push({
      key: `${y}-${m}`,
      title: first.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      days,
    });

    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return list;
};

// --- DayCell ---
const DayCell = React.memo(({ d, startDate, endDate, onDayPress }) => {
  const { colors, theme } = useTheme();

  if (!d) return <View style={[styles.dayBtn, styles.emptyDay]} />;

  const key = toKey(d);
  const isStart = key === startDate;
  const isEnd = key === endDate;
  const isMid = startDate && endDate && key > startDate && key < endDate;

  const dayContainerStyle = [styles.dayBtn];
  const dayTextStyle = [{ color: colors.text, fontSize: 16, fontFamily: 'Raleway' }];

  if (isStart || isEnd) {
    dayContainerStyle.push({ backgroundColor: '#3E6FFF', borderRadius: COL / 2 });
    dayTextStyle.push({ color: '#fff', fontWeight: '700' });
  } else if (isMid) {
    dayContainerStyle.push({
      backgroundColor: theme === 'dark' ? 'rgba(62, 111, 255, 0.2)' : 'rgba(62, 111, 255, 0.1)',
      borderRadius: 0,
      width: COL
    });
    dayTextStyle.push({ color: colors.text });
  }

  return (
    <TouchableOpacity onPress={() => onDayPress(d)} disabled={!d} style={dayContainerStyle}>
      <Text style={dayTextStyle}>{d.getUTCDate()}</Text>
    </TouchableOpacity>
  );
});

// --- Month ---
const Month = React.memo(({ month, startDate, endDate, onDayPress }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.monthBlock}>
      <Text style={[styles.monthTitle, { color: colors.text }]}>{month.title}</Text>
      <View style={styles.grid}>
        {month.days.map((d, i) => (
          <DayCell key={i} d={d} startDate={startDate} endDate={endDate} onDayPress={onDayPress} />
        ))}
      </View>
    </View>
  );
});

// --- DatePickerSheet ---
export default function DatePickerSheet({ onClose, onDateSelected }) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeTab, setActiveTab] = useState('Dates'); // Dates | Months | Flexible

  const months = useMemo(() => generateMonths(), []);

  const onDayPress = useCallback((d) => {
    if (!d) return;
    const k = toKey(d);

    if (!startDate || (startDate && endDate)) {
      setStartDate(k);
      setEndDate(null);
      return;
    }

    if (k < startDate) {
      setStartDate(k);
      setEndDate(null);
    } else {
      setEndDate(k);
    }
  }, [startDate, endDate]);

  const handleSelect = () => {
    if (startDate && endDate && onDateSelected) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      onDateSelected({ startDate: start, endDate: end });
      onClose();
    }
  };

  const renderMonth = useCallback(({ item }) => (
    <Month month={item} startDate={startDate} endDate={endDate} onDayPress={onDayPress} />
  ), [startDate, endDate, onDayPress]);

  return (
    <Modal visible animationType="slide" presentationStyle="overFullScreen">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>

        {/* Header Container */}
        <View style={styles.headerContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme === 'dark' ? '#161B23' : '#F3F4F6', borderColor: colors.pillBorder }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Custom Tabs */}
        <View style={styles.tabsContainer}>
          <View style={[styles.tabsPill, { backgroundColor: theme === 'dark' ? '#1E242E' : '#E5E7EB', borderColor: colors.pillBorder }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'Dates' && { backgroundColor: theme === 'dark' ? '#2A313C' : '#FFFFFF', shadowOpacity: theme === 'light' ? 0.1 : 0 }
              ]}
              onPress={() => setActiveTab('Dates')}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'Dates' && { color: colors.text }]}>Select Dates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'Months' && { backgroundColor: theme === 'dark' ? '#2A313C' : '#FFFFFF', shadowOpacity: theme === 'light' ? 0.1 : 0 }
              ]}
              onPress={() => setActiveTab('Months')}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'Months' && { color: colors.text }]}>Months</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'Flexible' && { backgroundColor: theme === 'dark' ? '#2A313C' : '#FFFFFF', shadowOpacity: theme === 'light' ? 0.1 : 0 }
              ]}
              onPress={() => setActiveTab('Flexible')}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'Flexible' && { color: colors.text }]}>Flexible</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Week Header */}
        <View style={styles.weekHeader}>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <Text key={d} style={[styles.weekTxt, { color: colors.textTertiary }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <FlatList
          data={months}
          renderItem={renderMonth}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 100 }}
        />

        {/* Floating Footer */}
        <BlurView intensity={20} tint={theme === 'dark' ? "dark" : "light"} style={[styles.footer, { paddingBottom: 20 }]}>
          <TouchableOpacity
            onPress={handleSelect}
            disabled={!startDate || !endDate}
            style={[styles.selectBtn, !(startDate && endDate) && { opacity: 0.5 }]}
          >
            <Text style={styles.selectTxt}>Select</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  tabsPill: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Raleway',
  },

  weekHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: H_PAD },
  weekTxt: { textAlign: 'center', fontSize: 13, width: COL, fontFamily: 'Raleway' },

  monthBlock: { marginTop: 10, marginBottom: 24 },
  monthTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'left', fontFamily: 'Raleway_700Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  dayBtn: { width: COL, height: COL, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  emptyDay: { backgroundColor: 'transparent' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectBtn: {
    backgroundColor: '#3E6FFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: "#3E6FFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  selectTxt: { color: 'white', fontSize: 17, fontWeight: '700', fontFamily: 'Raleway_700Bold' },
});
