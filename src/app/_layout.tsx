import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAds } from '../ads/init';
import { RemoveAdsProvider } from '../purchases/RemoveAds';
import { useDailySnapshot } from '../components/goals';
import { localized } from '../i18n/lang';
import { SettingsProvider, useSettings } from '../state/settings';
import { colors } from '../theme';

const T = localized({
  en: {
    index: 'ShoeSharp',
    tables: 'Casino Floor',
    play: 'Table',
    learn: 'Lessons',
    lesson: 'Lesson',
    academy: 'Counting Academy',
    exercise: 'Exercise',
    drills: 'Drills',
    strategyDrill: 'Strategy Drill',
    countDrill: 'Running Count Drill',
    trueCountDrill: 'True Count Drill',
    chart: 'Strategy Chart',
    leaks: 'Your Leaks',
    welcome: 'Welcome',
    settings: 'Settings',
    ready: 'Road to the Casino',
    progress: 'Your Progress',
    simulator: 'Bankroll Simulator',
    exam: 'Casino Conditions',
    deviationsDrill: 'Count Plays',
    decksDrill: 'Deck Estimation',
  },
  es: {
    index: 'ShoeSharp',
    tables: 'Sala del casino',
    play: 'Mesa',
    learn: 'Lecciones',
    lesson: 'Lección',
    academy: 'Academia de conteo',
    exercise: 'Ejercicio',
    drills: 'Ejercicios',
    strategyDrill: 'Ejercicio de estrategia',
    countDrill: 'Ejercicio de conteo continuo',
    trueCountDrill: 'Ejercicio de conteo real',
    chart: 'Tabla de estrategia',
    leaks: 'Tus fugas',
    welcome: 'Bienvenida',
    settings: 'Ajustes',
    ready: 'Camino al casino',
    progress: 'Tu progreso',
    simulator: 'Simulador de banca',
    exam: 'Condiciones de casino',
    deviationsDrill: 'Jugadas por conteo',
    decksDrill: 'Estimar barajas',
  },
});

export default function RootLayout() {
  useEffect(() => {
    initAds();
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <RemoveAdsProvider>
          <StatusBar style="light" />
          <AppStack />
        </RemoveAdsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

/** The navigator. Reads settings so the screen titles follow the language. */
function AppStack() {
  const { lang } = useSettings();
  useDailySnapshot();
  // Rebuilt only when the language changes, not on every chip or stats update.
  return useMemo(
    () => (
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.feltDark },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.felt },
        }}
      >
        <Stack.Screen name="index" options={{ title: T.index }} />
        <Stack.Screen name="tables" options={{ title: T.tables }} />
        <Stack.Screen name="play" options={{ title: T.play }} />
        <Stack.Screen name="learn/index" options={{ title: T.learn }} />
        <Stack.Screen name="learn/[id]" options={{ title: T.lesson }} />
        <Stack.Screen name="academy/index" options={{ title: T.academy }} />
        <Stack.Screen name="academy/[mode]" options={{ title: T.exercise }} />
        <Stack.Screen name="drills/index" options={{ title: T.drills }} />
        <Stack.Screen name="drills/strategy" options={{ title: T.strategyDrill }} />
        <Stack.Screen name="drills/count" options={{ title: T.countDrill }} />
        <Stack.Screen name="drills/true-count" options={{ title: T.trueCountDrill }} />
        <Stack.Screen name="chart" options={{ title: T.chart }} />
        <Stack.Screen name="leaks" options={{ title: T.leaks }} />
        <Stack.Screen name="welcome" options={{ title: T.welcome }} />
        <Stack.Screen name="settings" options={{ title: T.settings }} />
        <Stack.Screen name="ready" options={{ title: T.ready }} />
        <Stack.Screen name="progress" options={{ title: T.progress }} />
        <Stack.Screen name="simulator" options={{ title: T.simulator }} />
        <Stack.Screen name="exam" options={{ title: T.exam }} />
        <Stack.Screen name="drills/deviations" options={{ title: T.deviationsDrill }} />
        <Stack.Screen name="drills/decks" options={{ title: T.decksDrill }} />
      </Stack>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
}
