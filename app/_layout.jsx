import {
  Raleway_400Regular, Raleway_600SemiBold, Raleway_700Bold, useFonts,
} from '@expo-google-fonts/raleway';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { ThemeProvider } from '../context/ThemeContext'; // Our custom provider

import { Asset } from 'expo-asset';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  const [fontsReady] = useFonts({
    'Raleway-Regular': Raleway_400Regular,
    'Raleway-SemiBold': Raleway_600SemiBold,
    'Raleway-Bold': Raleway_700Bold,
  });

  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      try {
        const images = [require('../assets/images/LoadingScreen.png')];
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

  const onLayoutRootView = useCallback(async () => {
    if (fontsReady && assetsReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsReady, assetsReady]);

  if (!fontsReady || !assetsReady) return null;

  return (
    <ThemeProvider>
      {/* We pass the Nav theme based on our context inside, or just defaults. 
            For now, let's keep NavThemeProvider inside or wrapped by ours to sync them.
        */}
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
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