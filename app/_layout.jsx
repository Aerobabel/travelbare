// app/_layout.jsx
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  Raleway_400Regular, Raleway_600SemiBold, Raleway_700Bold, useFonts,
} from '@expo-google-fonts/raleway';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsReady] = useFonts({
    Raleway_400Regular,
    Raleway_600SemiBold,
    Raleway_700Bold,
  });

  if (!fontsReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Main Tabs */}
        <Stack.Screen name="(tabs)" />
        
        {/* Auth */}
        <Stack.Screen name="(auth)" />

        {/* Standard Pages (Cover tabs) */}
        <Stack.Screen name="TripDetails" />
        <Stack.Screen name="post-details" /> 

        {/* Modals (Slide up) */}
        <Stack.Screen 
          name="add-post" 
          options={{ presentation: 'modal' }} 
        />
      </Stack>
    </ThemeProvider>
  );
}