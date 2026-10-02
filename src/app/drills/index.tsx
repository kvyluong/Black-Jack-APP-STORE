import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P, Screen } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';

const DRILLS: { title: string; body: string; href: Href }[] = [
  {
    title: 'Basic Strategy',
    body: 'Random hands vs a dealer upcard. Choose the best play and see why.',
    href: '/drills/strategy',
  },
  {
    title: 'Running Count',
    body: 'Cards flash by. Keep the Hi-Lo count and enter it at the end.',
    href: '/drills/count',
  },
  {
    title: 'True Count',
    body: 'Convert a running count to a true count using the decks remaining.',
    href: '/drills/true-count',
  },
];

export default function Drills() {
  return (
    <Screen>
      <P muted>Short, repeatable practice. A few minutes a day builds real speed.</P>
      {DRILLS.map((d) => (
        <Pressable
          key={d.title}
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
