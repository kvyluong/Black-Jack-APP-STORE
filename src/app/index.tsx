import { Href, Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LevelBar } from '../components/chips';
import { H1, P, Panel, Screen } from '../components/ui';
import { formatChips } from '../engine/progression';
import { LESSONS } from '../content/lessons';
import { localized } from '../i18n/lang';
import { useRemoveAds } from '../purchases/RemoveAds';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const T = localized({
  en: {
    tiles: {
      learn: ['Learn', 'Step-by-step lessons from the rules to card counting'],
      tables: ['Casino Floor', 'Play with a coach. Win chips to unlock bigger tables'],
      academy: ['Counting Academy', 'Learn to count your way: see it, hear it, tap it, chunk it or read it'],
      drills: ['Drills', 'Basic strategy, running count and true count drills'],
      leaks: ['Your Leaks', 'The decisions you miss most, and a drill aimed at them'],
      chart: ['Strategy Chart', 'The full basic strategy chart for your rules'],
      settings: ['Settings', 'Table rules, coaching options and progress'],
    } as Record<TileId, [string, string]>,
    tagline: 'Learn to play perfectly and count cards',
    chips: 'Chips',
    lessons: 'Lessons',
    accuracy: 'Accuracy',
    removeAds: 'Remove ads',
    disclaimer: 'For entertainment and education only. No real money gambling. Play responsibly.',
  },
  es: {
    tiles: {
      learn: ['Aprender', 'Lecciones paso a paso, desde las reglas hasta contar cartas'],
      tables: ['Sala del casino', 'Juega con un coach. Gana fichas para desbloquear mesas más grandes'],
      academy: ['Academia de conteo', 'Aprende a contar a tu manera: míralo, escúchalo, tócalo, agrúpalo o léelo'],
      drills: ['Ejercicios', 'Ejercicios de estrategia básica, conteo continuo y conteo real'],
      leaks: ['Tus fugas', 'Las decisiones que más fallas y un ejercicio enfocado en ellas'],
      chart: ['Tabla de estrategia', 'La tabla completa de estrategia básica para tus reglas'],
      settings: ['Ajustes', 'Reglas de la mesa, opciones del coach y progreso'],
    },
    tagline: 'Aprende a jugar perfecto y a contar cartas',
    chips: 'Fichas',
    lessons: 'Lecciones',
    accuracy: 'Precisión',
    removeAds: 'Quitar anuncios',
    disclaimer: 'Solo para entretenimiento y aprendizaje. Sin apuestas con dinero real. Juega con responsabilidad.',
  },
});

type TileId = 'learn' | 'tables' | 'academy' | 'drills' | 'leaks' | 'chart' | 'settings';

const TILES: { id: TileId; href: Href; icon: string }[] = [
  { id: 'learn', href: '/learn', icon: '📘' },
  { id: 'tables', href: '/tables', icon: '🃏' },
  { id: 'academy', href: '/academy', icon: '🧠' },
  { id: 'drills', href: '/drills', icon: '🎯' },
  { id: 'leaks', href: '/leaks', icon: '🔍' },
  { id: 'chart', href: '/chart', icon: '📊' },
  { id: 'settings', href: '/settings', icon: '⚙️' },
];

export default function Home() {
  const { ready, stats, settings } = useSettings();
  const removeAds = useRemoveAds();
  const accuracy = stats.decisions ? Math.round((stats.correctDecisions / stats.decisions) * 100) : null;
  const done = stats.lessonsCompleted.length;

  // Brand-new players get the guided first hands before anything else.
  if (ready && !stats.onboarded && stats.handsPlayed === 0) return <Redirect href="/welcome" />;

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: spacing(1) }}>
        <Text style={styles.logo}>♠ ♥ 21 ♣ ♦</Text>
        <H1>Blackjack Coach</H1>
        <P muted>{T.tagline}</P>
      </View>

      <Panel>
        <View style={styles.stats}>
          <Stat label={T.chips} value={`$${formatChips(settings.bankroll)}`} />
          <Stat label={T.lessons} value={`${done}/${LESSONS.length}`} />
          <Stat label={T.accuracy} value={accuracy === null ? '—' : `${accuracy}%`} />
        </View>
        <LevelBar xp={stats.xp} />
      </Panel>

      {TILES.map((t) => {
        const [title, subtitle] = T.tiles[t.id];
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            onPress={() => router.push(t.href)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.icon}>{t.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{title}</Text>
              <Text style={styles.tileSub}>{subtitle}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        );
      })}

      {!settings.adsRemoved && (removeAds.available || __DEV__) && (
        <Text style={styles.removeAds} onPress={() => router.push('/settings')} accessibilityRole="link">
          {T.removeAds}{removeAds.price ? ` · ${removeAds.price}` : ''}
        </Text>
      )}

      <P muted style={styles.disclaimer}>
        {T.disclaimer}
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
  removeAds: { color: colors.gold, textAlign: 'center', textDecorationLine: 'underline', marginTop: spacing(1) },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: spacing(1) },
});
