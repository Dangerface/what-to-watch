import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GlobalSettingsButton } from '../components/GlobalSettingsButton';
import { GlobalTabBar } from '../components/GlobalTabBar';
import { MovieActionModal } from '../components/MovieActionModal';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { useUIStore } from '../store/ui';

SplashScreen.preventAutoHideAsync();

function tabScreenOptions({ route }: any): { animation: 'slide_from_left' | 'slide_from_right' } {
  const direction = (route.params as any)?.direction;
  return { animation: direction === 'left' ? 'slide_from_left' : 'slide_from_right' };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ 'Gabarito-Bold': require('../assets/fonts/Gabarito-Bold.ttf') });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();
  const tabBarHidden = useUIStore((state) => state.tabBarHidden);
  const actionModalMovie = useUIStore((state) => state.actionModalMovie);
const actionModalOnJailed = useUIStore((state) => state.actionModalOnJailed);
const closeActionModal = useUIStore((state) => state.closeActionModal);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={tabScreenOptions} />
        <Stack.Screen name="destiny" options={tabScreenOptions} />
        <Stack.Screen name="lists" options={tabScreenOptions} />
        <Stack.Screen name="search" options={tabScreenOptions} />
      </Stack>
      {!tabBarHidden && <GlobalTabBar />}
      {pathname === '/' && !tabBarHidden && <GlobalSettingsButton onPress={() => setSettingsOpen(true)} />}
      <SettingsOverlay visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {actionModalMovie && (
  <MovieActionModal movie={actionModalMovie} visible={!!actionModalMovie} onClose={closeActionModal} onJailed={actionModalOnJailed} />
)}
    </View>
  );
}