import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { BottomFadeOverlay } from '../components/BottomFadeOverlay';
import { GlobalSettingsButton } from '../components/GlobalSettingsButton';
import { GlobalTabBar } from '../components/GlobalTabBar';
import { MovieActionModal } from '../components/MovieActionModal';
import { SearchModal } from '../components/SearchModal';
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
  const searchModalOpen = useUIStore((state) => state.searchModalOpen);
  const closeSearchModal = useUIStore((state) => state.closeSearchModal);
  const setHasStarted = useUIStore((s) => s.setHasStarted);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        setHasStarted(false);
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={tabScreenOptions} />
        <Stack.Screen name="destiny" options={tabScreenOptions} />
        <Stack.Screen name="lists" options={tabScreenOptions} />
      </Stack>
      {!tabBarHidden && <BottomFadeOverlay />}
      {!tabBarHidden && <GlobalTabBar />}
      {pathname === '/' && !tabBarHidden && <GlobalSettingsButton onPress={() => setSettingsOpen(true)} />}
      <SettingsOverlay visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <MovieActionModal movie={actionModalMovie} visible={!!actionModalMovie} onClose={closeActionModal} onJailed={actionModalOnJailed} />
      <SearchModal visible={searchModalOpen} onClose={closeSearchModal} />
    </View>
  );
}