import { Fraunces_400Regular_Italic, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Outfit_300Light, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { billing } from '@core/billing/billing';
import { flush, hydrate, useStore } from '@core/store';
import { useTheme } from '@core/theme';
import { ensureDemoFresh } from '../demo/demo';
import { ReminderSync } from '../components/ReminderSync';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fraunces_400Regular_Italic, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold, Outfit_300Light, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => s.settings.onboarded);
  const demo = useStore((s) => s.settings.demo);
  const segments = useSegments();
  const c = useTheme();

  useEffect(() => {
    hydrate();
    billing.init();
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') flush();
      else billing.refresh();
    });
    const onUnload = () => flush();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('beforeunload', onUnload);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  useEffect(() => {
    if (ready && demo) ensureDemoFresh();
  }, [ready, demo]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = 'input:focus, textarea:focus { outline: none; } body { overscroll-behavior: none; }';
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
  }, [c.bg]);

  const show = (fontsLoaded || !!fontError) && ready;
  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => undefined);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const inOnboarding = segments[0] === 'onboarding';
    const allowed = ['privacy', 'onboarding'].includes(String(segments[0]));
    if (!onboarded && !allowed) router.replace('/onboarding');
    else if (onboarded && inOnboarding) router.replace('/');
  }, [show, onboarded, segments]);

  if (!show) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(cycle)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="plus" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="checkin" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="why" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="routine/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sleep/record" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
