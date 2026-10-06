import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P, Screen } from '../../components/ui';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    intro: 'Short, repeatable practice. A few minutes a day builds real speed.',
    strategyTitle: 'Basic Strategy',
    strategyBody: 'Random hands vs a dealer upcard. Choose the best play and see why.',
    countTitle: 'Running Count',
    countBody: 'Cards flash by. Keep the Hi-Lo count and enter it at the end.',
    trueTitle: 'True Count',
    trueBody: 'Convert a running count to a true count using the decks remaining.',
  },
  es: {
    intro: 'Práctica corta y repetible. Unos minutos al día te dan velocidad de verdad.',
    strategyTitle: 'Estrategia básica',
    strategyBody: 'Manos al azar contra la carta visible del crupier. Elige la mejor jugada y descubre por qué.',
    countTitle: 'Conteo continuo',
    countBody: 'Las cartas pasan rápido. Lleva el conteo Hi-Lo e ingrésalo al final.',
    trueTitle: 'Conteo real',
    trueBody: 'Convierte el conteo continuo en conteo real según las barajas que quedan.',
  },
});

const drills = (): { key: string; title: string; body: string; href: Href }[] => [
  { key: 'strategy', title: T.strategyTitle, body: T.strategyBody, href: '/drills/strategy' },
  { key: 'count', title: T.countTitle, body: T.countBody, href: '/drills/count' },
  { key: 'true-count', title: T.trueTitle, body: T.trueBody, href: '/drills/true-count' },
];

export default function Drills() {
  useSettings(); // re-render on language change
  return (
    <Screen>
      <P muted>{T.intro}</P>
      {drills().map((d) => (
        <Pressable
          key={d.key}
          accessibilityLabel={`${d.title}. ${d.body}`}
          accessibilityRole="button"
          onPress={() => router.push(d.href)}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{d.title}</Text>
            <Text style={styles.body}>{d.body}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.feltDark,
    padding: spacing(2),
    borderRadius: radius.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 14, marginTop: 4 },
  chev: { color: colors.muted, fontSize: 28 },
});
