// WorldMap.js
import * as d3 from 'd3';
import { useMemo } from 'react';
import { Alert, Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import * as topojson from 'topojson-client';

const worldMap = require('./countries2.json');

const { width, height } = Dimensions.get('window');
const MAP_SIZE = Math.min(width, height) * 0.9;

// Country mapping from numeric ID to ISO code
const COUNTRY_ID_MAP = {
  '004': 'AF', '008': 'AL', '010': 'AQ', '012': 'DZ', '016': 'AS', '020': 'AD', '024': 'AO', '028': 'AG', '031': 'AZ', '032': 'AR',
  '036': 'AU', '040': 'AT', '044': 'BS', '048': 'BH', '050': 'BD', '051': 'AM', '052': 'BB', '056': 'BE', '060': 'BM', '064': 'BT',
  '068': 'BO', '070': 'BA', '072': 'BW', '074': 'BV', '076': 'BR', '084': 'BZ', '086': 'IO', '090': 'SB', '092': 'VG', '096': 'BN',
  '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY', '116': 'KH', '120': 'CM', '124': 'CA', '132': 'CV', '136': 'KY', '140': 'CF',
  '144': 'LK', '148': 'TD', '152': 'CL', '156': 'CN', '158': 'TW', '162': 'CX', '166': 'CC', '170': 'CO', '174': 'KM', '175': 'YT',
  '178': 'CG', '180': 'CD', '184': 'CK', '188': 'CR', '191': 'HR', '192': 'CU', '196': 'CY', '203': 'CZ', '204': 'BJ', '208': 'DK',
  '212': 'DM', '214': 'DO', '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET', '232': 'ER', '233': 'EE', '234': 'FO', '238': 'FK',
  '239': 'GS', '242': 'FJ', '246': 'FI', '248': 'AX', '250': 'FR', '254': 'GF', '258': 'PF', '260': 'TF', '262': 'DJ', '266': 'GA',
  '268': 'GE', '270': 'GM', '275': 'PS', '276': 'DE', '288': 'GH', '292': 'GI', '296': 'KI', '300': 'GR', '304': 'GL', '308': 'GD',
  '312': 'GP', '316': 'GU', '320': 'GT', '324': 'GN', '328': 'GY', '332': 'HT', '334': 'HM', '336': 'VA', '340': 'HN', '344': 'HK',
  '348': 'HU', '352': 'IS', '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE', '376': 'IL', '380': 'IT', '384': 'CI',
  '388': 'JM', '392': 'JP', '398': 'KZ', '400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR', '414': 'KW', '417': 'KG', '418': 'LA',
  '422': 'LB', '426': 'LS', '428': 'LV', '430': 'LR', '434': 'LY', '438': 'LI', '440': 'LT', '442': 'LU', '446': 'MO', '450': 'MG',
  '454': 'MW', '458': 'MY', '462': 'MV', '466': 'ML', '470': 'MT', '474': 'MQ', '478': 'MR', '480': 'MU', '484': 'MX', '492': 'MC',
  '496': 'MN', '498': 'MD', '499': 'ME', '500': 'MS', '504': 'MA', '508': 'MZ', '512': 'OM', '516': 'NA', '520': 'NR', '524': 'NP',
  '528': 'NL', '531': 'CW', '533': 'AW', '534': 'SX', '535': 'BQ', '540': 'NC', '548': 'VU', '554': 'NZ', '558': 'NI', '562': 'NE',
  '566': 'NG', '570': 'NU', '574': 'NF', '578': 'NO', '580': 'MP', '581': 'UM', '583': 'FM', '584': 'MH', '585': 'PW', '586': 'PK',
  '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE', '608': 'PH', '612': 'PN', '616': 'PL', '620': 'PT', '624': 'GW', '626': 'TL',
  '630': 'PR', '634': 'QA', '638': 'RE', '642': 'RO', '643': 'RU', '646': 'RW', '652': 'BL', '654': 'SH', '659': 'KN', '660': 'AI',
  '662': 'LC', '663': 'MF', '666': 'PM', '670': 'VC', '674': 'SM', '678': 'ST', '682': 'SA', '686': 'SN', '688': 'RS', '690': 'SC',
  '694': 'SL', '702': 'SG', '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO', '710': 'ZA', '716': 'ZW', '724': 'ES', '728': 'SS',
  '729': 'SD', '732': 'EH', '740': 'SR', '744': 'SJ', '748': 'SZ', '752': 'SE', '756': 'CH', '760': 'SY', '762': 'TJ', '764': 'TH',
  '768': 'TG', '772': 'TK', '776': 'TO', '780': 'TT', '784': 'AE', '788': 'TN', '792': 'TR', '795': 'TM', '796': 'TC', '798': 'TV',
  '800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB', '834': 'TZ', '840': 'US', '850': 'VI', '854': 'BF', '858': 'UY',
  '860': 'UZ', '862': 'VE', '876': 'WF', '882': 'WS', '887': 'YE', '894': 'ZM'
};

const WorldMap = ({ visitedCountries = [], route = null }) => {
  // Transformations
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslate = useSharedValue({ x: 0, y: 0 });

  // Convert TopoJSON to GeoJSON
  const countries = useMemo(() => {
    return topojson.feature(worldMap, worldMap.objects.countries);
  }, []);

  // Create projection
  const projection = useMemo(() => {
    // If route exists, fit to route
    if (route && route.start && route.end) {
      const featureCollection = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: route.start } },
          { type: "Feature", geometry: { type: "Point", coordinates: route.end } }
        ]
      };
      return d3.geoMercator().fitSize([MAP_SIZE, MAP_SIZE], featureCollection);
    }
    return d3.geoMercator().fitSize([MAP_SIZE, MAP_SIZE], countries);
  }, [countries, route]);

  // Path generator
  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  // Generate country paths with unique keys
  // Generate country paths with unique keys
  const countryPaths = useMemo(() => {
    if (!countries || !countries.features) return [];
    return countries.features.map((feature) => {
      // Create unique identifier
      const id = feature.id || `unknown-${Math.random().toString(36).substr(2, 9)}`;
      const name = feature.properties?.name || 'Unnamed';

      return {
        id,
        name,
        d: pathGenerator(feature),
        code: COUNTRY_ID_MAP[feature.id] || null,
      };
    });
  }, [countries, pathGenerator]);

  // Route Path Generator
  const routePath = useMemo(() => {
    if (!route || !route.start || !route.end) return null;

    const geometry = {
      type: "LineString",
      coordinates: [route.start, route.end]
    };
    return pathGenerator(geometry);
  }, [route, pathGenerator]);

  const startPoint = useMemo(() => {
    if (!route || !route.start) return null;
    const [x, y] = projection(route.start);
    return { x, y };
  }, [route, projection]);

  const endPoint = useMemo(() => {
    if (!route || !route.end) return null;
    const [x, y] = projection(route.end);
    return { x, y };
  }, [route, projection]);

  // Gesture Handlers (same as before)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslate.value.x + e.translationX;
      translateY.value = savedTranslate.value.y + e.translationY;
    })
    .onEnd(() => {
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value
      };
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(scale.value === 1 ? 2 : 1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = scale.value;
      savedTranslate.value = { x: 0, y: 0 };
    });

  const composed = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    tapGesture
  );

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.mapContainer}>
        <GestureDetector gesture={composed}>
          <Animated.View style={animatedStyle}>
            <Svg width={MAP_SIZE} height={MAP_SIZE}>
              <G>
                {countryPaths.map((country) => {
                  const isVisited = country.code && visitedCountries.includes(country.code);

                  return (
                    <Path
                      key={country.id}
                      d={country.d}
                      fill={isVisited ? '#0262D1' : '#171E27'} // Darker base for map
                      stroke="#0E141C"
                      strokeWidth={0.5}
                      onPress={() => Alert.alert(
                        country.name,
                        `ID: ${country.id}\nCode: ${country.code || 'N/A'}`
                      )}
                    />
                  );
                })}
              </G>

              {/* Route Layer */}
              {routePath && (
                <G>
                  {/* The curved line */}
                  <Path
                    d={routePath}
                    fill="none"
                    stroke="#3E6FFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="4, 4"
                  />
                  {/* Start Point */}
                  {startPoint && (
                    <Circle cx={startPoint.x} cy={startPoint.y} r={3} fill="#3E6FFF" />
                  )}
                  {/* End Point */}
                  {endPoint && (
                    <Circle cx={endPoint.x} cy={endPoint.y} r={4} fill="#3E6FFF" stroke="#0E141C" strokeWidth={1} />
                  )}
                </G>
              )}
            </Svg>
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E141C',
  },
  mapContainer: {
    width: MAP_SIZE * 1.5,
    height: MAP_SIZE * 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    backgroundColor: '#0E141C',
  },
});

export default WorldMap;