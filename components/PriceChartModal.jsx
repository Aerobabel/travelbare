import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { height } = Dimensions.get('window');

// --- Robust Date Formatting Helper ---
const formatDate = (date) => {
  return {
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).slice(0, 2),
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date),
  };
};

// --- Generates realistic sample data if none is provided ---
const createSampleData = () => {
  // --- FIX: Removed the extra 'new' keyword ---
  const today = new Date();
  return Array.from({ length: 16 }).map((_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i - 3);
    const price = 1200 + Math.round(Math.sin(i * 0.9) * 400) + Math.random() * 150;
    return {
      price: Math.round(price),
      date: date.toISOString().slice(0, 10),
    };
  });
};

export default function PriceChartModal({ visible, onClose, rows = [] }) {
  const data = useMemo(() => (rows.length ? rows : createSampleData()), [rows]);

  const { bestPrice, bestPriceIndex } = useMemo(() => {
    if (!data.length) return { bestPrice: null, bestPriceIndex: -1 };
    const best = data.reduce(
      (acc, current, index) => {
        if (current.price < acc.price) {
          return { price: current.price, index };
        }
        return acc;
      },
      { price: Infinity, index: -1 }
    );
    return { bestPrice: best.price, bestPriceIndex: best.index };
  }, [data]);

  const [selectedIndex, setSelectedIndex] = useState(bestPriceIndex);

  useEffect(() => {
    setSelectedIndex(bestPriceIndex);
  }, [visible, bestPriceIndex]);

  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.price || 0), 1), [data]);
  const MAX_BAR_HEIGHT = 100;
  const MIN_BAR_HEIGHT = 20;
  const LABEL_AREA_HEIGHT = 50; // The space at the bottom for dates
  const TOOLTIP_GAP = 8; // The space between the bar and the tooltip

  let lastMonth = '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} presentationStyle="overFullScreen">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Price chart</Text>

          <View style={styles.chartContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroller}>
              {data.map((row, i) => {
                const dateObj = new Date(row.date);
                const { day, weekday, month } = formatDate(dateObj);
                const isSelected = selectedIndex === i;
                const isBestPrice = row.price === bestPrice;

                const barH = (row.price / maxPrice) * MAX_BAR_HEIGHT;
                const finalBarHeight = Math.max(MIN_BAR_HEIGHT, barH);
                const selectedBarHeight = finalBarHeight + 20;

                const showMonthSeparator = month !== lastMonth && i > 0;
                lastMonth = month;

                const getBarStyle = () => {
                  if (isSelected) return styles.barSelected;
                  if (isBestPrice) return styles.barBestPrice;
                  return styles.barInactive;
                };

                return (
                  <React.Fragment key={i}>
                    {showMonthSeparator && (
                      <View style={styles.monthSeparator}>
                        <Text style={styles.monthLabel}>{month}</Text>
                        <View style={styles.separatorLine} />
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.barWrap, { zIndex: isSelected ? 99 : 1 }]}
                      onPress={() => setSelectedIndex(i)}
                    >
                      {/* Bar and labels are rendered first */}
                      <View
                        style={[
                          styles.bar,
                          { height: isSelected ? selectedBarHeight : finalBarHeight },
                          getBarStyle(),
                        ]}
                      />
                      <Text style={[styles.dayText, isSelected && styles.textSelected]}>{day}</Text>
                      <Text style={[styles.weekdayText, isSelected && styles.textSelected]}>{weekday}</Text>

                      {/* Tooltip is rendered LAST to ensure it's on top */}
                      {isSelected && (
                        <View
                          style={[
                            styles.tooltip,
                            { bottom: LABEL_AREA_HEIGHT + selectedBarHeight + TOOLTIP_GAP },
                          ]}
                        >
                          <Text style={styles.tooltipLabel}>from </Text>
                          <Text style={styles.tooltipPrice}>${row.price.toLocaleString()}</Text>
                          <View style={styles.tooltipArrow} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const COLORS = {
  background: '#0E141C',
  accent: '#2F6BFF',
  text: '#E9EEF8',
  subtleText: '#8A93A0',
  inactiveBar: '#333942',
  bestPriceBar: '#5A6169',
  separator: 'rgba(255, 255, 255, 0.1)',
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 34,
    height: 350,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  chartContainer: {
    height: 200,
  },
  scroller: {
    paddingHorizontal: 10,
    alignItems: 'flex-end',
  },
  barWrap: {
    width: 40,
    alignItems: 'center',
    marginHorizontal: 2,
    position: 'relative',
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 50, // This is the LABEL_AREA_HEIGHT
  },
  bar: {
    width: 28,
    borderRadius: 6,
  },
  barSelected: {
    backgroundColor: COLORS.accent,
  },
  barInactive: {
    backgroundColor: COLORS.inactiveBar,
  },
  barBestPrice: {
    backgroundColor: COLORS.bestPriceBar,
  },
  dayText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
    bottom: 25,
  },
  weekdayText: {
    color: COLORS.subtleText,
    fontSize: 12,
    position: 'absolute',
    bottom: 5,
  },
  textSelected: {
    color: COLORS.accent,
  },
  tooltip: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -55 }],
    minWidth: 110,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    marginRight: 4,
  },
  tooltipPrice: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    backgroundColor: COLORS.accent,
    transform: [{ rotate: '45deg' }],
  },
  monthSeparator: {
    position: 'relative',
    height: '100%',
    width: 1,
    marginRight: 10,
    marginLeft: 4,
    justifyContent: 'flex-end',
  },
  monthLabel: {
    color: COLORS.subtleText,
    fontSize: 12,
    position: 'absolute',
    top: 0,
    left: 4,
    width: 80,
  },
  separatorLine: {
    height: '75%',
    width: 1,
    backgroundColor: COLORS.separator,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});