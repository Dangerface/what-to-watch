import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GlobalTabBar } from '../components/GlobalTabBar';


SplashScreen.preventAutoHideAsync();

function tabScreenOptions({ route }: any): { animation: 'slide_from_left' | 'slide_from_right' } {
  const direction = (route.params as any)?.direction;
  return { animation: direction === 'left' ? 'slide_from_left' : 'slide_from_right' };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Gabarito-Bold': require('../assets/fonts/Gabarito-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

   if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={tabScreenOptions} />
        <Stack.Screen name="lists" options={tabScreenOptions} />
        <Stack.Screen name="search" options={tabScreenOptions} />
        <Stack.Screen name="settings" options={tabScreenOptions} />
      </Stack>

      <GlobalTabBar />
    </View>
  );
}