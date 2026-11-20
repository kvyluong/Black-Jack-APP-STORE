// "Your week": last week's practice at a glance, shown on Home on the first open of a
// new week until it's dismissed. Practice stats only.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WeeklySummary, currentStreak, formatSeconds, historyWithToday, shortDay, weekStart, weeklySummary } from '../engine/progress';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';
import { useToday } from './goals';
import { Icon } from './Icon';
import { useUnlocks } from './useUnlocks';

const T = localized({
  en: {
    eyebrow: (day: string) => `YOUR WEEK · FROM ${day.toUpperCase()}`,
    title: 'Last week at a glance',
    hands: 'Hands',
    accuracy: 'Accuracy',
    days: 'Days practiced',
    streak: 'Streak',
    streakDays: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
    noStreak: 'None',
    up: (n: number) => `▲ ${n} pts`,
    down: (n: number) => `▼ ${n} pts`,
    same: 'Same as before',
    newDeck: (t: string) => `New best full deck: ${t}`,
    changeA11y: (n: number) => (n > 0 ? `up ${n} points from the week before` : n < 0 ? `down ${-n} points from the week before` : 'same as the week before'),
    seeProgress: 'See your progress',
    dismiss: 'Dismiss',
    dismissA11y: 'Dismiss your week summary',
  },
  es: {
    eyebrow: (day: string) => `TU SEMANA · DESDE EL ${day.toUpperCase()}`,
    title: 'Tu semana pasada de un vistazo',
    hands: 'Manos',
    accuracy: 'Precisión',
    days: 'Días de práctica',
    streak: 'Racha',
    streakDays: (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`,
    noStreak: 'Ninguna',
    up: (n: number) => `▲ ${n} pts`,
    down: (n: number) => `▼ ${n} pts`,
    same: 'Igual que antes',
    newDeck: (t: string) => `Nuevo récord con baraja completa: ${t}`,
    changeA11y: (n: number) =>
      n > 0 ? `${n} puntos más que la semana anterior` : n < 0 ? `${-n} puntos menos que la semana anterior` : 'igual que la semana anterior',
    seeProgress: 'Ver tu progreso',
    dismiss: 'Cerrar',
    dismissA11y: 'Cerrar el resumen de tu semana',
  },
});

/** Last week's summary when there is one and it hasn't been dismissed this week. */
export function useWeeklySummary(): { summary: WeeklySummary | null; dismiss: () => void } {
  const { stats, updateStats } = useSettings();
  const today = useToday();
  const thisWeek = weekStart(today);
  const summary = stats.weeklySeen === thisWeek ? null : weeklySummary(historyWithToday(stats, today), today);
  return { summary, dismiss: () => updateStats((s) => ({ ...s, weeklySeen: thisWeek })) };
}

export function WeeklySummaryCard() {
  const { stats } = useSettings();
  const today = useToday();
  const { summary, dismiss } = useWeeklySummary();
  const unlocks = useUnlocks();
  if (!summary) return null;
  const streak = currentStreak(stats.goals, today);
  const change = summary.accuracy !== null && summary.accuracyBefore !== null ? summary.accuracy - summary.accuracyBefore : null;
  const accText = summary.accuracy !== null ? `${summary.accuracy}%` : '–';
  const changeText = change === null ? null : change > 0 ? T.up(change) : change < 0 ? T.down(-change) : T.same;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.eyebrow}>{T.eyebrow(shortDay(summary.week))}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {T.title}
          </Text>
        </View>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={T.dismissA11y}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <Stat label={T.hands} value={summary.hands.toLocaleString('en-US')} />
        <Stat
          label={T.accuracy}
          value={accText}
          sub={changeText}
          a11y={`${T.accuracy}: ${accText}${change !== null ? `, ${T.changeA11y(change)}` : ''}`}
        />
        <Stat label={T.days} value={`${summary.daysPracticed}/7`} />
        <Stat label={T.streak} value={streak > 0 ? T.streakDays(streak) : T.noStreak} icon />
      </View>

      {summary.newBestDeckMs !== null && <Text style={styles.deck}>★ {T.newDeck(formatSeconds(summary.newBestDeckMs))}</Text>}

      {unlocks.has('progress') && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              dismiss();
              router.push('/progress');
            }}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.linkText}>{T.seeProgress} ›</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, sub, a11y, icon }: { label: string; value: string; sub?: string | null; a11y?: string; icon?: boolean }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={a11y ?? `${label}: ${value}`}>
      <View style={styles.valueRow}>
        {icon && <Icon name="streak" size={14} color={colors.gold} />}
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    padding: spacing(2),
    gap: spacing(1.5),
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'flex-start' },
  closeText: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  // Two by two, so it fits a 320 pt wide phone with large text.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.feltDark,
    borderRadius: radius.md,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1),
    alignItems: 'center',
    gap: 2,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { color: colors.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  label: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  sub: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  deck: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.gold, fontWeight: '800', fontSize: 15 },
});
