import { Href, Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LevelBar } from '../components/chips';
import { H1, P, Panel, Screen } from '../components/ui';
import { formatChips } from '../engine/progression';
import { LESSONS } from '../content/lessons';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const TILES: { title: string; subtitle: string; href: Href; icon: string }[] = [
  { title: 'Learn', subtitle: 'Step-by-step lessons from the rules to card counting', href: '/learn', icon: '📘' },
  { title: 'Casino Floor', subtitle: 'Play with a coach. Win chips to unlock bigger tables', href: '/tables', icon: '🃏' },
  { title: 'Counting Academy', subtitle: 'Learn to count your way: see it, hear it, tap it, chunk it or read it', href: '/academy', icon: '🧠' },
  { title: 'Drills', subtitle: 'Basic strategy, running count and true count drills', href: '/drills', icon: '🎯' },
  { title: 'Your Leaks', subtitle: 'The decisions you miss most, and a drill aimed at them', href: '/leaks', icon: '🔍' },
  { title: 'Strategy Chart', subtitle: 'The full basic strategy chart for your rules', href: '/chart', icon: '📊' },
  { title: 'Settings', subtitle: 'Table rules, coaching options and progress', href: '/settings', icon: '⚙️' },
];

export default function Home() {
  const { ready, stats, settings } = useSettings();
  const accuracy = stats.decisions ? Math.round((stats.correctDecisions / stats.decisions) * 100) : null;
  const done = stats.lessonsCompleted.length;

  // Brand-new players get the guided first hands before anything else.
  if (ready && !stats.onboarded && stats.handsPlayed === 0) return <Redirect href="/welcome" />;

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: spacing(1) }}>
        <Text style={styles.logo}>♠ ♥ 21 ♣ ♦</Text>
        <H1>Blackjack Coach</H1>
        <P muted>Learn to play perfectly and count cards</P>
      </View>

      <Panel>
        <View style={styles.stats}>
          <Stat label="Chips" value={`$${formatChips(settings.bankroll)}`} />
          <Stat label="Lessons" value={`${done}/${LESSONS.length}`} />
          <Stat label="Accuracy" value={accuracy === null ? '—' : `${accuracy}%`} />
        </View>
        <LevelBar xp={stats.xp} />
      </Panel>

      {TILES.map((t) => (
        <Pressable
          key={t.title}
          accessibilityRole="button"
          onPress={() => router.push(t.href)}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.icon}>{t.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileSub}>{t.subtitle}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}

      <P muted style={styles.disclaimer}>
        For entertainment and education only. No real money gambling. Play responsibly.
      </P>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { color: colors.gold, fontSize: 22, letterSpacing: 4, marginBottom: 4 },
  stats: { flexDirection: 'row' },
  statValue: { color: colors.gold, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 13 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.feltDark,
    padding: spacing(2),
    borderRadius: radius.md,
  },
  icon: { fontSize: 30 },
  tileTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tileSub: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chev: { color: colors.muted, fontSize: 28 },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: spacing(1) },
});
