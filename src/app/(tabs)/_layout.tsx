// The four tabs: Home (your next step), Play (the casino floor), Practice and Me.
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Text } from 'react-native';

import { useUnlocks } from '../../components/useUnlocks';
import { localized } from '../../i18n/lang';
import { usePrefs } from '../../state/settings';
import { colors } from '../../theme';

const T = localized({
  en: { home: 'Home', play: 'Play', practice: 'Practice', me: 'Me', floor: 'Casino Floor' },
  es: { home: 'Inicio', play: 'Jugar', practice: 'Práctica', me: 'Perfil', floor: 'Sala del casino' },
});

const icon = (glyph: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    // Sized to the tab bar's icon slot (about 24 px) so the label underneath isn't squeezed.
    return <Text style={{ fontSize: 18, lineHeight: 24, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const { lang } = usePrefs();
  const unlocks = useUnlocks();
  const badge = unlocks.newOnes.length || undefined;
  return useMemo(
    () => (
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.feltDark },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          tabBarStyle: {
            backgroundColor: colors.feltDark,
            borderTopColor: 'rgba(232,197,71,0.25)',
            // Browsers get no safe-area inset, so the default bar clips the labels; phones size it themselves.
            ...(Platform.OS === 'web' ? { height: 58 } : {}),
          },
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
          sceneStyle: { backgroundColor: colors.felt },
          // Hidden tabs don't re-render on every chip or stat change.
          freezeOnBlur: true,
        }}
      >
        <Tabs.Screen name="index" options={{ title: T.home, headerTitle: 'ShoeSharp', tabBarIcon: icon('🏠') }} />
        <Tabs.Screen name="tables" options={{ title: T.play, headerTitle: T.floor, tabBarIcon: icon('🃏') }} />
        <Tabs.Screen
          name="practice"
          options={{ title: T.practice, tabBarIcon: icon('🎯'), tabBarBadge: badge, tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.black } }}
        />
        <Tabs.Screen name="me" options={{ title: T.me, tabBarIcon: icon('👤') }} />
      </Tabs>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, badge],
  );
}
