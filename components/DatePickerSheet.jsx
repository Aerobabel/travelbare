import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Constants ---
const BRIGHT = '#3E6FFF';
const MID_TX = '#3E6FFF';
const DARK = '#0F2E63';
const CARD = '#1C222C';
const MUTED = '#9CA3AF';
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

const addDays = (d, n) => {
  if (!d) return null;
  const c = new Date(d.getTime());
  c.setUTCDate(c.getUTCDate() + n);
  return c;
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

    const days = [];
    for (let i = 0; i < lead; i++) days.push(null);
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
  if (!d) return <View style={[styles.dayBtn, styles.emptyDay]} />;

  const key = toKey(d);
  const isStart = key === startDate;
  const isEnd = key === endDate;
  const isMid = startDate && endDate && key > startDate && key < endDate;

  const dayContainerStyle = [styles.dayBtn];
  const dayTextStyle = [styles.normText];

  if (isStart || isEnd) {
    dayContainerStyle.push(isStart ? styles.startDay : styles.endDay);
    dayTextStyle.push(styles.selText);
    if (isStart && endDate) dayContainerStyle.push(styles.mergeRight);
    if (isEnd && startDate) dayContainerStyle.push(styles.mergeLeft);
  } else if (isMid) {
    dayContainerStyle.push(styles.midDay);
    dayTextStyle.push(styles.midText);
  }

  return (
    <TouchableOpacity onPress={() => onDayPress(d)} disabled={!d} style={dayContainerStyle}>
      <Text style={dayTextStyle}>{d.getUTCDate()}</Text>
    </TouchableOpacity>
  );
});

// --- Month ---
const Month = React.memo(({ month, startDate, endDate, onDayPress }) => (
  <View style={styles.monthBlock}>
    <Text style={styles.monthTitle}>{month.title}</Text>
    <View style={styles.grid}>
      {month.days.map((d, i) => (
        <DayCell key={i} d={d} startDate={startDate} endDate={endDate} onDayPress={onDayPress} />
      ))}
    </View>
  </View>
));

// --- DatePickerSheet ---
export default function DatePickerSheet({ onClose, onDateSelected }) {
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const flatListRef = useRef(null);

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
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Dates</Text>
        </View>

        <View style={styles.weekHeader}>
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <Text key={d} style={[styles.weekCell, styles.weekTxt]}>{d}</Text>
          ))}
        </View>

        <FlatList
          ref={flatListRef}
          data={months}
          renderItem={renderMonth}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={11}
        />

        <TouchableOpacity
          onPress={handleSelect}
          disabled={!startDate || !endDate}
          style={[styles.selectBtn, !(startDate && endDate) && { opacity: 0.4 }]}
        >
          <Text style={styles.selectTxt}>Select</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    width,
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    maxHeight: '85%',
    display: 'flex',
  },
  header: { width: '100%', alignItems: 'center', marginBottom: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekCell: { width: COL, alignItems: 'center' },
  weekTxt: { color: MUTED, textAlign: 'center', fontSize: 14, width: COL },
  monthBlock: { marginTop: 10, marginBottom: 18 },
  monthTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 10, textAlign: 'left' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBtn: { width: COL, height: COL, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  emptyDay: { backgroundColor: 'transparent' },
  normText: { color: 'white', fontSize: 16 },
  startDay: { backgroundColor: BRIGHT, borderTopLeftRadius: COL/2, borderBottomLeftRadius: COL/2 },
  endDay: { backgroundColor: BRIGHT, borderTopRightRadius: COL/2, borderBottomRightRadius: COL/2 },
  selText: { color: 'white', fontSize: 16, fontWeight: '700' },
  midDay: { backgroundColor: DARK, borderRadius: 0 },
  midText: { color: MID_TX, fontSize: 16, fontWeight: '600' },
  mergeLeft: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  mergeRight:{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  selectBtn: { marginTop: 12, backgroundColor: BRIGHT, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  selectTxt: { color: 'white', fontSize: 16, fontWeight: '700' },
});
