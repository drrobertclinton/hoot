// The app's three places (this week's loop, the course, the toolkit) with the floating step dock instead of a tab bar.
import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '@core/theme';
import { Dock } from '../../components/Dock';

export default function CycleLayout() {
  const c = useTheme();
  return (
    <Tabs tabBar={(p) => <Dock index={p.state.index} routes={p.state.routes} go={(name) => p.navigation.navigate(name)} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="toolkit" />
    </Tabs>
  );
}
