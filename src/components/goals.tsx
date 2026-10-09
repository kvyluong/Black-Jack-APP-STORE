// Daily goals card for the home screen, and the once-a-day stats snapshot behind it.
import { Href, router } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { playSound } from '../audio/sounds';
import { formatChips, localDay } from '../engine/progression';
import {
  GoalDef,
  claimGoal,
  currentStreak,
  goalProgress,
  goalReward,
  goalTitle,
  rolloverDay,
  todaysGoals,
} from '../engine/progress';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';
import { Meter } from './progress/Meter';
import { useOutcomeColors } from './useColors';

const T = localized({
  en: {
    title: 'Today’s goals',
    streak: (n: number) => `${n}-day streak`,
    noStreak: 'Finish all three to start a streak',
    keepStreak: (n: number) => `Finish all three to make it ${n} days`,
    allDone: 'All done for today. Come back tomorrow!',
    claim: 'Claim',
    claimed: '✓ Claimed',
    reward: (chips: string, xp: number) => `+$${chips} · +${xp} XP`,
    claimA11y: (goal: string, reward: string) => `Claim ${goal}: ${reward}`,
    goalA11y: (goal: string, done: number, target: number, reward: string) => `${goal}. ${done} of ${target}. Reward ${reward}. Opens practice`,
    streakA11y: (n: number) => `Daily goal streak: ${n} days`,
  },
  es: {
    title: 'Metas de hoy',
    streak: (n: number) => `Racha de ${n} ${n === 1 ? 'día' : 'días'}`,
    noStreak: 'Completa las tres para empezar una racha',
    keepStreak: (n: number) => `Completa las tres para llegar a ${n} días`,
    allDone: '¡Todo listo por hoy! Vuelve mañana.',
    claim: 'Cobrar',
    claimed: '✓ Cobrado',
    reward: (chips: string, xp: number) => `+$${chips} · +${xp} XP`,
    claimA11y: (goal: string, reward: string) => `Cobrar ${goal}: ${reward}`,
    goalA11y: (goal: string, done: number, target: number, reward: string) =>
      `${goal}. ${done} de ${target}. Premio ${reward}. Abre la práctica`,
    streakA11y: (n: number) => `Racha de metas diarias: ${n} días`,
  },
});

/**
 * Today's local day. Rechecked every minute (so midnight is caught while the app
 * stays open) and whenever the app comes back to the foreground.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => localDay(new Date()));
  useEffect(() => {
    const check = () => setToday(localDay(new Date()));
    const id = setInterval(check, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return today;
}

/** Takes the day's snapshot (for goals and progress history) when the app opens on a new day. */
export function useDailySnapshot() {
  const { ready, stats, updateStats } = useSettings();
  const today = useToday();
  const snapshotDay = stats.goals?.day;
  useEffect(() => {
    // Only roll forward: a clock or time zone moved back a day isn't a new day.
    if (!ready || (snapshotDay && snapshotDay >= today)) return;
    // A write to the settings store (external to this component), not local state.
    updateStats((s) => {
      const next = rolloverDay(s, today);
      return next ? { ...s, ...next } : s;
    });
  }, [ready, today, snapshotDay, updateStats]);
}

/** Today's goals, shown on the home screen. */
export function DailyGoalsCard() {
  const { stats, settings, addChips, updateStats } = useSettings();
  const today = useToday();
  const goals = todaysGoals(stats, today);
  const ids = goals.map((g) => g.id);
  // Until today's snapshot is in, yesterday's claims don't count.
  const live = stats.goals.day === today;
  const claimed = live ? stats.goals.claimed : [];
  const streak = currentStreak(stats.goals, today);
  const allClaimed = ids.every((id) => claimed.includes(id));
  const claiming = useRef(new Set<string>());

  const claim = (g: GoalDef) => {
    const key = `${today}:${g.id}`;
    // Guards a fast double tap before the next render (the chips would be paid twice).
    if (!live || claimed.includes(g.id) || claiming.current.has(key)) return;
    claiming.current.add(key);
    const r = goalReward(g, stats.peakChips);
    addChips(r.chips);
    updateStats((s) => ({ ...s, xp: s.xp + r.xp, goals: claimGoal(s.goals, g.id, today, ids) }));
    if (settings.soundEffects) playSound('chips');
  };

  const streakNote = allClaimed ? T.allDone : streak > 0 && stats.goals.lastCompleteDay !== today ? T.keepStreak(streak + 1) : T.noStreak;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {T.title}
        </Text>
        <View style={[styles.flame, streak === 0 && styles.flameOff]} accessible accessibilityLabel={T.streakA11y(streak)}>
          <Text style={styles.flameIcon}>🔥</Text>
          <Text style={[styles.flameText, streak === 0 && { color: colors.muted }]}>{T.streak(streak)}</Text>
        </View>
      </View>
      {goals.map((g) => (
        <GoalRow
          key={g.id}
          goal={g}
          done={goalProgress(g, stats, today)}
          claimed={claimed.includes(g.id)}
          reward={goalReward(g, stats.peakChips)}
          canClaim={live}
          onClaim={() => claim(g)}
        />
      ))}
      <Text style={styles.note}>{streakNote}</Text>
    </View>
  );
}

function GoalRow({
  goal,
  done,
  claimed,
  reward,
  canClaim,
  onClaim,
}: {
  goal: GoalDef;
  done: number;
  claimed: boolean;
  reward: { chips: number; xp: number };
  canClaim: boolean;
  onClaim: () => void;
}) {
  const { good } = useOutcomeColors();
  const title = goalTitle(goal);
  const rewardText = T.reward(formatChips(reward.chips), reward.xp);
  const complete = done >= goal.target;
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={T.goalA11y(title, done, goal.target, rewardText)}
        onPress={() => router.push(goal.route as Href)}
      >
        <View style={styles.rowHead}>
          <Text style={[styles.goal, claimed && styles.goalDone]}>{title}</Text>
          <Text style={styles.count}>
            {done}/{goal.target}
          </Text>
        </View>
        <Meter value={done / goal.target} color={complete ? good : colors.gold} height={6} />
        <Text style={styles.reward}>{rewardText}</Text>
      </Pressable>
      {claimed ? (
        <Text style={[styles.claimed, { color: good }]}>{T.claimed}</Text>
      ) : complete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={T.claimA11y(title, rewardText)}
          accessibilityState={{ disabled: !canClaim }}
          disabled={!canClaim}
          onPress={onClaim}
          style={({ pressed }) => [styles.claim, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <Text style={styles.claimText}>{T.claim}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: spacing(2),
    gap: spacing(1.5),
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.45)',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing(1) },
  title: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  flame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232,197,71,0.18)',
    paddingHorizontal: spacing(1),
    paddingVertical: 3,
    borderRadius: 999,
  },
  flameOff: { backgroundColor: colors.feltDark, opacity: 0.85 },
  flameIcon: { fontSize: 15 },
  flameText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  rowMain: { flex: 1, gap: 4 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing(1) },
  goal: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  goalDone: { color: colors.muted },
  count: { color: colors.muted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  reward: { color: colors.muted, fontSize: 12 },
  claim: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    minHeight: 44,
    justifyContent: 'center',
  },
  claimText: { color: colors.black, fontWeight: '900', fontSize: 15 },
  claimed: { fontWeight: '800', fontSize: 13 },
  note: { color: colors.muted, fontSize: 13 },
});
