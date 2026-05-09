import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

const SkyImage = require('../assets/images/nuvia-sky-mobile.jpg');
const RockImage = require('../assets/images/nuvia-rock-mobile.png');

export const NuviaLogo = ({ width = 235, opacity = 0.86 }) => (
  <Svg width={width} height={(width / 561) * 168} viewBox="0 0 561 168" fill="none">
    <G opacity={opacity}>
      <Path d="M433.504 165.22L474.244 40.4058H520.26L561 165.22H522.423L515.935 140.396H478.569L472.082 165.22H433.504ZM496.906 70.1606L485.316 114.533H509.189L497.598 70.1606H496.906Z" fill="#D5ECFB" />
      <Path d="M385.585 165.22V40.4058H422.26V165.22H385.585Z" fill="#D5ECFB" />
      <Path d="M288.536 165.22L250.996 40.4058H292.515L312.322 130.449H313.014L332.822 40.4058H374.34L336.801 165.22H288.536Z" fill="#D5ECFB" />
      <Path d="M164.068 31.2371C154.985 31.2371 148.066 24.2309 148.066 15.8408C148.066 7.5371 154.985 0.530884 164.068 0.530884C173.236 0.530884 180.156 7.5371 180.156 15.8408C180.156 24.2309 173.236 31.2371 164.068 31.2371ZM205.499 31.2371C196.331 31.2371 189.411 24.2309 189.411 15.8408C189.411 7.5371 196.331 0.530884 205.499 0.530884C214.582 0.530884 221.501 7.5371 221.501 15.8408C221.501 24.2309 214.582 31.2371 205.499 31.2371ZM184.654 167.469C151.699 167.469 129.729 149.218 129.729 120.761V40.4058H166.403V117.128C166.403 130.276 172.804 137.541 184.74 137.541C196.677 137.541 203.078 130.276 203.078 117.128V40.4058H239.752V120.761C239.752 149.045 218.041 167.469 184.654 167.469Z" fill="#D5ECFB" />
      <Path d="M0.502686 165.22V40.4058H31.0359L75.1492 104.24H75.7546V40.4058H112.429V165.22H82.2419L37.7827 100.348H37.1772V165.22H0.502686Z" fill="#D5ECFB" />
    </G>
  </Svg>
);

export default function NuviaLoadingScreen({
  children = null,
  showLogo = true,
  showProgress = true,
  contentStyle,
}) {
  const skyScale = useRef(new Animated.Value(1.15)).current;
  const skyOpacity = useRef(new Animated.Value(0)).current;
  const rockY = useRef(new Animated.Value(150)).current;
  const rockOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(skyScale, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.timing(skyOpacity, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.timing(rockY, {
        toValue: 0,
        duration: 2500,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rockOpacity, {
        toValue: 1,
        duration: 1800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
      Animated.timing(contentY, {
        toValue: 0,
        duration: 850,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 850,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentY, logoOpacity, logoScale, rockOpacity, rockY, skyOpacity, skyScale]);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Animated.Image
        source={SkyImage}
        style={[
          styles.layer,
          {
            opacity: skyOpacity,
            transform: [{ scale: skyScale }],
          },
        ]}
        resizeMode="cover"
      />
      <Animated.Image
        source={RockImage}
        style={[
          styles.rockLayer,
          {
            opacity: rockOpacity,
            transform: [{ translateY: rockY }],
          },
        ]}
        resizeMode="cover"
      />
      {showLogo ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <NuviaLogo />
        </Animated.View>
      ) : null}
      <LinearGradient
        colors={['rgba(8,12,18,0.14)', 'rgba(8,12,18,0.62)']}
        style={styles.overlay}
      />
      {children ? (
        <Animated.View
          style={[
            styles.content,
            contentStyle,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      ) : null}
      {showProgress ? (
        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E141C',
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  rockLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '-7%',
    width: '100%',
    height: '110%',
    zIndex: 3,
  },
  logoWrap: {
    position: 'absolute',
    top: '39%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingBottom: 58,
    zIndex: 5,
  },
  homeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
    zIndex: 6,
  },
  homeIndicatorBar: {
    width: 92,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
});
