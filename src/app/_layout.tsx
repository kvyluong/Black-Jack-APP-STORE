import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAds } from '../ads/init';
import { SettingsProvider } from '../state/settings';
import { colors } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    initAds();
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.feltDark },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.felt },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Blackjack Coach' }} />
          <Stack.Screen name="play" options={{ title: 'Practice Table' }} />
          <Stack.Screen name="learn/index" options={{ title: 'Lessons' }} />
          <Stack.Screen name="learn/[id]" options={{ title: 'Lesson' }} />
          <Stack.Screen name="drills/index" options={{ title: 'Drills' }} />
          <Stack.Screen name="drills/strategy" options={{ title: 'Strategy Drill' }} />
          <Stack.Screen name="drills/count" options={{ title: 'Running Count Drill' }} />
          <Stack.Screen name="drills/true-count" options={{ title: 'True Count Drill' }} />
          <Stack.Screen name="chart" options={{ title: 'Strategy Chart' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
