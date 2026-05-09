import {
  Raleway_400Regular, Raleway_600SemiBold, Raleway_700Bold, useFonts,
} from '@expo-google-fonts/raleway';
import { Asset } from 'expo-asset';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import NuviaLoadingScreen from '../components/NuviaLoadingScreen';
import { ThemeProvider } from '../context/ThemeContext'; // Our custom provider

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {

  const [fontsReady] = useFonts({
    'Raleway-Regular': Raleway_400Regular,
    'Raleway-SemiBold': Raleway_600SemiBold,
    'Raleway-Bold': Raleway_700Bold,
  });

  const [assetsReady, setAssetsReady] = useState(false);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => setNativeSplashHidden(true));
    }, 120);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadAssets() {
      try {
        const images = [
          require('../assets/images/LoadingScreen.png'),
          require('../assets/images/glass.png'),
          require('../assets/images/nuvia-sky-mobile.jpg'),
          require('../assets/images/nuvia-rock-mobile.jpg'),
        ];
        const cacheImages = images.map(image => Asset.fromModule(image).downloadAsync());
        await Promise.all(cacheImages);
      } catch (e) {
        console.warn(e);
      } finally {
        setAssetsReady(true);
      }
    }
    loadAssets();
  }, []);

  if (!nativeSplashHidden || !fontsReady || !assetsReady) {
    return <NuviaLoadingScreen />;
  }

  return (
    <ThemeProvider>
      {/* We pass the Nav theme based on our context inside, or just defaults. 
            For now, let's keep NavThemeProvider inside or wrapped by ours to sync them.
        */}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Main Tabs */}
          <Stack.Screen name="(tabs)" />

          {/* Auth */}
          <Stack.Screen name="(auth)" />

          {/* Standard Pages (Cover tabs) */}
          <Stack.Screen name="TripDetails" />
          <Stack.Screen name="post-details" />
          <Stack.Screen name="data-storage" />
          <Stack.Screen name="personalization" />

          {/* Modals (Slide up) */}
          <Stack.Screen
            name="add-post"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
