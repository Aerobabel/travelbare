// components/FiltersSheet.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

const toTime = (h) => {
  const total = Math.round(Number(h) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hh)}:${pad(mm)}`;
};

function RangeSlider({
  min,
  max,
  step = 1,
  values,
  onChange,
  displayValueSuffix = '',
}) {
  const [trackW, setTrackW] = useState(0);
  const [activeThumb, setActiveThumb] = useState(null);
  const [lowValue, highValue] = values;

  const clamp = (v) => Math.min(max, Math.max(min, v));
  const snap = (v) => Math.round(v / step) * step;
  const posFromVal = (v) =>
    ((clamp(v) - min) / (max - min)) * trackW;
  const valFromPos = (x) =>
    clamp(min + ((max - min) * x) / Math.max(1, trackW));

  const lowPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setActiveThumb('low'),
        onPanResponderMove: (_, g) => {
          const currentPos = posFromVal(lowValue);
          const newRawVal = valFromPos(currentPos + g.dx);
          const newLow = Math.min(
            snap(newRawVal),
            highValue - step
          );
          onChange([newLow, highValue]);
        },
        onPanResponderRelease: () => setActiveThumb(null),
      }),
    [
      trackW,
      lowValue,
      highValue,
      onChange,
      step,
      valFromPos,
      posFromVal,
    ]
  );

  const highPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setActiveThumb('high'),
        onPanResponderMove: (_, g) => {
          const currentPos = posFromVal(highValue);
          const newRawVal = valFromPos(currentPos + g.dx);
          const newHigh = Math.max(
            snap(newRawVal),
            lowValue + step
          );
          onChange([lowValue, newHigh]);
        },
        onPanResponderRelease: () => setActiveThumb(null),
      }),
    [
      trackW,
      lowValue,
      highValue,
      onChange,
      step,
      valFromPos,
      posFromVal,
    ]
  );

  const onTrackPress = (e) => {
    const x = e.nativeEvent.locationX;
    const targetValue = valFromPos(x);
    const distToLow = Math.abs(targetValue - lowValue);
    const distToHigh = Math.abs(targetValue - highValue);

    if (distToLow <= distToHigh) {
      onChange([
        snap(Math.min(targetValue, highValue - step)),
        highValue,
      ]);
      setActiveThumb('low');
    } else {
      onChange([
        lowValue,
        snap(
          Math.max(targetValue, lowValue + step)
        ),
      ]);
      setActiveThumb('high');
    }
    setTimeout(() => setActiveThumb(null), 300);
  };

  return (
    <View
      style={S.rsWrap}
      onLayout={(e) =>
        setTrackW(e.nativeEvent.layout.width)
      }
      onStartShouldSetResponder={() => true}
      onResponderStart={onTrackPress}
    >
      <View style={S.rsTrack} />
      <View
        style={[
          S.rsRange,
          {
            left: trackW ? posFromVal(lowValue) : 0,
            right: trackW
              ? trackW - posFromVal(highValue)
              : 0,
          },
        ]}
      />
      <View
        style={[
          S.rsThumb,
          {
            left: trackW
              ? posFromVal(lowValue) - 12
              : 0,
          },
          activeThumb === 'low' &&
            S.rsThumbActive,
        ]}
        {...lowPan.panHandlers}
      >
        <Text style={S.rsThumbValue}>
          {lowValue}
          {displayValueSuffix}
        </Text>
      </View>
      <View
        style={[
          S.rsThumb,
          {
            left: trackW
              ? posFromVal(highValue) - 12
              : 0,
          },
          activeThumb === 'high' &&
            S.rsThumbActive,
        ]}
        {...highPan.panHandlers}
      >
        <Text style={S.rsThumbValue}>
          {highValue}
          {displayValueSuffix}
        </Text>
      </View>
    </View>
  );
}

export default function FiltersSheet({
  visible,
  filters,
  extraToggles,
  onChangeFilters,
  onChangeToggles,
  onReset,
  onClose,
}) {
  const [internalFilters, setInternalFilters] =
    useState(() => ({
      time: filters?.time || [0, 24],
      arrivalTime:
        filters?.arrivalTime || [0, 24],
      duration: filters?.duration || [0, 48],
      stopDuration:
        filters?.stopDuration || [1, 24],
      transfers:
        filters?.transfers || {
          direct: false,
          one: false,
          two: false,
          three: false,
        },
      price: filters?.price || [0, 10000],
      overnight: filters?.overnight || false,
    }));

  useEffect(() => {
    setInternalFilters({
      time: filters?.time || [0, 24],
      arrivalTime:
        filters?.arrivalTime || [0, 24],
      duration: filters?.duration || [0, 48],
      stopDuration:
        filters?.stopDuration || [1, 24],
      transfers:
        filters?.transfers || {
          direct: false,
          one: false,
          two: false,
          three: false,
        },
      price: filters?.price || [0, 10000],
      overnight: filters?.overnight || false,
    });
  }, [filters]);

  const handleInternalFilterChange = (key, value) => {
    const newFilters = {
      ...internalFilters,
      [key]: value,
    };
    setInternalFilters(newFilters);
    onChangeFilters(newFilters);
  };

  const handleToggleChangeInternal = (key, value) => {
    const newToggles = {
      ...extraToggles,
      [key]: value,
    };
    onChangeToggles(newToggles);
  };

  const handleResetInternal = () => {
    const defaultFilters = {
      time: [0, 24],
      arrivalTime: [0, 24],
      duration: [0, 48],
      stopDuration: [1, 24],
      transfers: {
        direct: false,
        one: false,
        two: false,
        three: false,
      },
      price: [0, 10000],
      overnight: false,
    };
    setInternalFilters(defaultFilters);
    onChangeFilters(defaultFilters);
    onChangeToggles({
      breg: false,
      visa: false,
    });
    onReset && onReset();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={S.overlay}>
        <SafeAreaView style={S.safeArea}>
          <View style={S.sheet}>
            <View style={S.bar} />
            <Text style={S.title}>Filters</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 24,
              }}
            >
              <View style={S.group}>
                <Text style={S.groupTitle}>
                  Flight Information
                </Text>
                <TouchableOpacity
                  style={S.selectorRow}
                  activeOpacity={0.8}
                >
                  <Text style={S.selectorText}>
                    Select airlines
                  </Text>
                  <Text style={S.arrowIcon}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={S.selectorRow}
                  activeOpacity={0.8}
                >
                  <Text style={S.selectorText}>
                    Select plane models
                  </Text>
                  <Text style={S.arrowIcon}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={S.group}>
                <Text style={S.groupTitle}>
                  Departure & Arrival
                </Text>

                <View style={S.sliderBlock}>
                  <View style={S.sliderHeader}>
                    <Text style={S.sliderTitle}>
                      Departure time
                    </Text>
                    <Text style={S.sliderPill}>
                      {toTime(
                        internalFilters.time[0]
                      )}
                      –
                      {toTime(
                        internalFilters.time[1]
                      )}
                    </Text>
                  </View>
                  <RangeSlider
                    min={0}
                    max={24}
                    step={0.5}
                    values={internalFilters.time}
                    onChange={(vals) =>
                      handleInternalFilterChange(
                        'time',
                        vals
                      )
                    }
                  />
                </View>

                <View
                  style={[
                    S.sliderBlock,
                    { marginTop: 18 },
                  ]}
                >
                  <View style={S.sliderHeader}>
                    <Text style={S.sliderTitle}>
                      Arrival time
                    </Text>
                    <Text style={S.sliderPill}>
                      {toTime(
                        internalFilters
                          .arrivalTime[0]
                      )}
                      –
                      {toTime(
                        internalFilters
                          .arrivalTime[1]
                      )}
                    </Text>
                  </View>
                  <RangeSlider
                    min={0}
                    max={24}
                    step={0.5}
                    values={
                      internalFilters.arrivalTime
                    }
                    onChange={(vals) =>
                      handleInternalFilterChange(
                        'arrivalTime',
                        vals
                      )
                    }
                  />
                </View>
              </View>

              <View style={S.group}>
                <Text style={S.groupTitle}>
                  Trip Duration
                </Text>
                <View style={S.sliderHeader}>
                  <Text style={S.sliderPillPlain}>
                    {internalFilters.duration[0] ===
                    0
                      ? 'Any'
                      : `${internalFilters.duration[0]}h`}
                  </Text>
                  <Text style={S.sliderPillPlain}>
                    {internalFilters.duration[1] ===
                    48
                      ? 'Any'
                      : `${internalFilters.duration[1]}h`}
                  </Text>
                </View>
                <RangeSlider
                  min={0}
                  max={48}
                  step={1}
                  values={internalFilters.duration}
                  onChange={(vals) =>
                    handleInternalFilterChange(
                      'duration',
                      vals
                    )
                  }
                  displayValueSuffix="h"
                />
              </View>

              <View style={S.group}>
                <Text style={S.groupTitle}>
                  Stops
                </Text>
                {[
                  {
                    key: 'direct',
                    label: 'Direct flights',
                  },
                  {
                    key: 'one',
                    label: '1 stop',
                  },
                  {
                    key: 'two',
                    label: '2 stops',
                  },
                  {
                    key: 'three',
                    label: '3+ stops',
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={S.checkRow}
                    activeOpacity={0.8}
                    onPress={() =>
                      handleInternalFilterChange(
                        'transfers',
                        {
                          ...internalFilters.transfers,
                          [item.key]:
                            !internalFilters
                              .transfers[
                              item.key
                            ],
                        }
                      )
                    }
                  >
                    <Text
                      style={[
                        S.checkboxIcon,
                        internalFilters
                          .transfers[
                          item.key
                        ] &&
                          S.checkboxChecked,
                      ]}
                    >
                      {internalFilters.transfers[
                        item.key
                      ]
                        ? '☑'
                        : '☐'}
                    </Text>
                    <Text
                      style={S.checkLabel}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={S.checkPrice}
                    >
                      $431
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={S.group}>
                <Text style={S.groupTitle}>
                  Stop Duration
                </Text>
                <View style={S.sliderHeader}>
                  <Text style={S.sliderPillPlain}>
                    {
                      internalFilters
                        .stopDuration[0]
                    }
                    h
                  </Text>
                  <Text style={S.sliderPillPlain}>
                    {
                      internalFilters
                        .stopDuration[1]
                    }
                    h
                  </Text>
                </View>
                <RangeSlider
                  min={1}
                  max={24}
                  step={1}
                  values={
                    internalFilters.stopDuration
                  }
                  onChange={(vals) =>
                    handleInternalFilterChange(
                      'stopDuration',
                      vals
                    )
                  }
                  displayValueSuffix="h"
                />
              </View>

              <View style={S.group}>
                <Text style={S.groupTitle}>
                  Price Range
                </Text>
                <View style={S.priceCaps}>
                  <View style={S.cap}>
                    <Text style={S.capLabel}>
                      Minimum
                    </Text>
                    <Text style={S.capValue}>
                      $
                      {
                        internalFilters.price[0]
                      }
                    </Text>
                  </View>
                  <View style={S.cap}>
                    <Text style={S.capLabel}>
                      Maximum
                    </Text>
                    <Text style={S.capValue}>
                      $
                      {
                        internalFilters.price[1]
                      }
                    </Text>
                  </View>
                </View>
                <RangeSlider
                  min={0}
                  max={10000}
                  step={50}
                  values={internalFilters.price}
                  onChange={(vals) =>
                    handleInternalFilterChange(
                      'price',
                      vals
                    )
                  }
                />
              </View>

              <View style={S.group}>
                {[
                  {
                    key: 'breg',
                    label:
                      'No baggage pre-registration required',
                    bind: false,
                  },
                  {
                    key: 'visa',
                    label: 'Visa-free layover',
                    bind: false,
                  },
                  {
                    key: 'overnight',
                    label:
                      'No overnight transfers',
                    bind: true,
                  },
                ].map((item) => {
                  const isOn = item.bind
                    ? internalFilters
                        .overnight
                    : extraToggles[item.key];
                  return (
                    <View
                      key={item.key}
                      style={S.toggleRow}
                    >
                      <Text
                        style={S.toggleLabel}
                      >
                        {item.label}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          item.bind
                            ? handleInternalFilterChange(
                                'overnight',
                                !internalFilters.overnight
                              )
                            : handleToggleChangeInternal(
                                item.key,
                                !extraToggles[
                                  item.key
                                ]
                              )
                        }
                        style={[
                          S.switch,
                          isOn && S.switchOn,
                        ]}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            S.knob,
                            isOn && S.knobOn,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <View style={S.btns}>
                <TouchableOpacity
                  style={S.clear}
                  onPress={handleResetInternal}
                >
                  <Text style={S.clearText}>
                    ↻  Clear Filters
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={S.save}
                  onPress={onClose}
                >
                  <Text style={S.saveText}>
                    Show Results
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    backgroundColor: '#1C2030',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: screenHeight * 0.8,
    overflow: 'hidden',
  },
  sheet: {
    backgroundColor: '#1C2030',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  bar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3247',
    marginTop: 6,
    marginBottom: 10,
  },
  title: {
    color: '#E9EEF8',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },

  group: {
    borderTopWidth: 1,
    borderTopColor: '#283142',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  groupTitle: {
    color: '#8A93A0',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },

  selectorRow: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#0E1523',
    borderWidth: 1,
    borderColor: '#283142',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectorText: {
    color: '#E9EEF8',
    fontSize: 15,
  },
  arrowIcon: {
    color: '#8A93A0',
    fontSize: 18,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkboxIcon: {
    color: '#8A93A0',
    marginRight: 10,
    fontSize: 18,
  },
  checkboxChecked: {
    color: '#2F6BFF',
  },
  checkLabel: {
    color: '#E9EEF8',
    fontSize: 15,
    flex: 1,
  },
  checkPrice: {
    color: '#8A93A0',
    fontSize: 13,
  },

  sliderBlock: {},
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sliderTitle: {
    color: '#E9EEF8',
    fontSize: 15,
    fontWeight: '500',
  },
  sliderPill: {
    backgroundColor: '#1A2340',
    color: '#E9EEF8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    fontSize: 13,
  },
  sliderPillPlain: {
    color: '#E9EEF8',
    fontSize: 14,
    minWidth: 45,
    textAlign: 'center',
  },

  priceCaps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cap: {
    width: '48%',
    backgroundColor: '#0E1523',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#283142',
    padding: 12,
  },
  capLabel: {
    color: '#8A93A0',
    fontSize: 13,
    marginBottom: 6,
  },
  capValue: {
    color: '#E9EEF8',
    fontSize: 16,
    fontWeight: '700',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: {
    color: '#E9EEF8',
    fontSize: 15,
    flex: 1,
    marginRight: 15,
  },
  switch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#263149',
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: '#2F6BFF',
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E9EEF8',
    alignSelf: 'flex-start',
  },
  knobOn: {
    alignSelf: 'flex-end',
  },

  rsWrap: {
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  rsTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#283142',
    borderRadius: 3,
  },
  rsRange: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#2F6BFF',
    borderRadius: 3,
  },
  rsThumb: {
    position: 'absolute',
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9EEF8',
    borderWidth: 2,
    borderColor: '#2F6BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rsThumbActive: {
    transform: [{ scale: 1.1 }],
    backgroundColor: '#2F6BFF',
    borderColor: '#E9EEF8',
  },
  rsThumbValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1C2030',
  },

  btns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 30,
  },
  clear: {
    height: 54,
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#1a2133',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clearText: {
    color: '#E9EEF8',
    fontWeight: '600',
    fontSize: 15,
  },
  save: {
    backgroundColor: '#2F6BFF',
    borderRadius: 12,
    padding: 14,
    flex: 1,
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
