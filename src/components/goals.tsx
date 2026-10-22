// Daily goals card for the home screen, and the once-a-day stats snapshot behind it.
import { Href, router } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { playSound } from '../audio/sounds';
import { formatChips, localDay } from '../engine/progression';
import { DEFAULT_REMINDER_HOUR, formatHour, reminderText, reminderTimes } from '../engine/reminders';
import { remindersSupported, requestReminderPermission, scheduleReminders } from '../notifications/reminders';
import {
  GoalDef,
  MAX_FREEZES,
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
import { Icon } from './Icon';
import { Meter } from './progress/Meter';
import { useOutcomeColors } from './useColors';

/** Streak-freeze blue (matches the Split button tint). */
const ICE = '#8CC8FF';

const T = localized({
  en: {
    title: 'Today’s goals',
    streak: (n: number) => `${n}-day streak`,
    noStreak: 'Claim one goal to start a streak',
    keepStreak: (n: number) => `Claim one goal to make it ${n} days`,
    earnFreeze: 'Streak kept for today. Claim all three to earn a streak freeze',
    freezeFull: 'Streak kept for today. Your freezes are full',
    allDone: 'All done for today. Come back tomorrow!',
    freezes: (n: number) => `${n}`,
    freezesA11y: (n: number) => `${n} streak ${n === 1 ? 'freeze' : 'freezes'}: each covers one missed day`,
    frozeNote: (n: number) => `A streak freeze covered ${n === 1 ? 'the day you missed' : `the ${n} days you missed`}. Your streak is safe`,
    askTitle: 'Streak started!',
    askBody: (time: string) =>
      `Want one reminder a day at ${time} to keep it going? Only when you haven't practiced yet. Change it anytime in Settings.`,
    remindMe: 'Remind me',
    notNow: 'Not now',
    claim: 'Claim',
    claimed: '✓ Claimed',
    reward: (chips: string, xp: number) => `+$${chips} · +${xp} XP`,
    claimA11y: (goal: string, reward: string) => `Claim ${goal}: ${reward}`,
    goalA11y: (goal: string, done: number, target: number, reward: string) => `${goal}. ${done} of ${target}. Reward ${reward}. Opens practice`,
    streakA11y: (n: number) => `Daily goal streak: ${n} days`,
    today: 'Today',
    ready: 'Reward ready',
    summaryA11y: (done: number, total: number, streak: number) => `Today’s goals: ${done} of ${total} done, ${streak}-day streak. Show goals`,
  },
  es: {
    title: 'Metas de hoy',
    streak: (n: number) => `Racha de ${n} ${n === 1 ? 'día' : 'días'}`,
    noStreak: 'Cobra una meta para empezar una racha',
    keepStreak: (n: number) => `Cobra una meta para llegar a ${n} días`,
    earnFreeze: 'Racha asegurada por hoy. Cobra las tres para ganar un congelador de racha',
    freezeFull: 'Racha asegurada por hoy. Tus congeladores están llenos',
    allDone: '¡Todo listo por hoy! Vuelve mañana.',
    freezes: (n: number) => `${n}`,
    freezesA11y: (n: number) => `${n} ${n === 1 ? 'congelador' : 'congeladores'} de racha: cada uno cubre un día perdido`,
    frozeNote: (n: number) =>
      `Un congelador cubrió ${n === 1 ? 'el día que faltaste' : `los ${n} días que faltaste`}. Tu racha sigue`,
    askTitle: '¡Racha iniciada!',
    askBody: (time: string) =>
      `¿Quieres un recordatorio al día a las ${time} para mantenerla? Solo si aún no has practicado. Puedes cambiarlo en Ajustes.`,
    remindMe: 'Recuérdame',
    notNow: 'Ahora no',
    claim: 'Cobrar',
    claimed: '✓ Cobrado',
    reward: (chips: string, xp: number) => `+$${chips} · +${xp} XP`,
    claimA11y: (goal: string, reward: string) => `Cobrar ${goal}: ${reward}`,
    goalA11y: (goal: string, done: number, target: number, reward: string) =>
      `${goal}. ${done} de ${target}. Premio ${reward}. Abre la práctica`,
    streakA11y: (n: number) => `Racha de metas diarias: ${n} días`,
    today: 'Hoy',
    ready: 'Premio listo',
    summaryA11y: (done: number, total: number, streak: number) =>
      `Metas de hoy: ${done} de ${total} listas, racha de ${streak} días. Ver metas`,
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
    // rolloverDay decides whether a later saved day (clock moved back) means a fresh start.
    if (!ready || snapshotDay === today) return;
    // A write to the settings store (external to this component), not local state.
    updateStats((s) => {
      const next = rolloverDay(s, today);
      return next ? { ...s, ...next } : s;
    });
  }, [ready, today, snapshotDay, updateStats]);
}

/** Keeps the queued practice reminders in step with today's goals and the Settings switch. */
export function useReminders() {
  const { lang, settings, stats } = useSettings();
  const today = useToday();
  const on = settings.reminders;
  const hour = settings.reminderHour;
  const kept = stats.goals.lastCompleteDay === today;
  const streak = currentStreak(stats.goals, today);
  useEffect(() => {
    void scheduleReminders(on ? reminderTimes(new Date(), hour, kept) : [], reminderText(streak));
    // lang: the queued text is rewritten in the new language.
  }, [on, hour, kept, streak, today, lang]);
}

/** The local hour you're practicing at, as the reminder time (evening if it's very early or late). */
const practiceHour = () => {
  const h = new Date().getHours();
  return h >= 8 && h <= 21 ? h : DEFAULT_REMINDER_HOUR;
};

/** Today's goals, shown on the home screen. `collapsible`: starts as one line that opens on tap. */
export function DailyGoalsCard({ collapsible = false }: { collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible);
  const { stats, settings, addChips, updateStats, updateSettings } = useSettings();
  const today = useToday();
  const goals = todaysGoals(stats, today);
  const ids = goals.map((g) => g.id);
  // Until today's snapshot is in, yesterday's claims don't count.
  const live = stats.goals.day === today;
  const claimed = live ? stats.goals.claimed : [];
  const streak = currentStreak(stats.goals, today);
  const allClaimed = ids.every((id) => claimed.includes(id));
  const claiming = useRef(new Set<string>());
  // Once the saved goals change (a claim landed, a new day, or Reset progress), they are the
  // guard again; clearing lets a goal be claimed after a reset on the same day.
  useEffect(() => {
    claiming.current.clear();
  }, [stats.goals]);

  const claim = (g: GoalDef) => {
    const key = `${today}:${g.id}`;
    // Guards a fast double tap before the next render (the chips would be paid twice).
    if (!live || claimed.includes(g.id) || claiming.current.has(key)) return;
    claiming.current.add(key);
    const r = goalReward(g, stats.peakChips);
    addChips(r.chips);
    updateStats((s) => ({ ...s, xp: s.xp + r.xp, goals: claimGoal(s.goals, g.id, today, ids) }));
    if (settings.soundEffects) playSound('chips');
    // The first claimed goal starts a streak: the moment to offer a daily reminder (once).
    if (!stats.remindersAsked && !settings.reminders && remindersSupported()) {
      updateStats((s) => ({ ...s, remindersAsked: true }));
      const hour = practiceHour();
      setTimeout(() => {
        Alert.alert(T.askTitle, T.askBody(formatHour(hour)), [
          { text: T.notNow, style: 'cancel' },
          {
            text: T.remindMe,
            onPress: async () => {
              if (await requestReminderPermission()) updateSettings({ reminders: true, reminderHour: hour });
            },
          },
        ]);
      }, 700);
    }
  };

  if (!open) {
    const doneCount = goals.filter((g) => goalProgress(g, stats, today) >= g.target).length;
    const rewardReady = goals.some((g) => goalProgress(g, stats, today) >= g.target && !claimed.includes(g.id));
    return (
      <Pressable
        style={({ pressed }) => [styles.summary, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={T.summaryA11y(doneCount, goals.length, streak)}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.summaryTitle}>{T.today}</Text>
        <View style={styles.dots}>
          {goals.map((g) => (
            <View key={g.id} style={[styles.dot, goalProgress(g, stats, today) >= g.target && styles.dotDone]} />
          ))}
        </View>
        {rewardReady && <Text style={styles.readyBadge}>{T.ready}</Text>}
        <View style={styles.summaryStreakRow}>
          <Icon name="streak" size={16} color={streak === 0 ? colors.muted : colors.gold} />
          <Text style={[styles.summaryStreak, streak === 0 && { color: colors.muted }]}>{streak}</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    );
  }

  const freezes = stats.goals.freezes ?? 0;
  const frozen = stats.goals.frozen?.day === today ? stats.goals.frozen.count : 0;
  const keptToday = stats.goals.lastCompleteDay === today && claimed.length > 0;
  const streakNote = allClaimed
    ? T.allDone
    : keptToday
      ? freezes >= MAX_FREEZES
        ? T.freezeFull
        : T.earnFreeze
      : streak > 0
        ? T.keepStreak(streak + 1)
        : T.noStreak;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {T.title}
        </Text>
        <View style={styles.pills}>
          {freezes > 0 && (
            <View style={styles.freeze} accessible accessibilityLabel={T.freezesA11y(freezes)}>
              <Icon name="freeze" size={14} color={ICE} />
              <Text style={styles.freezeText}>{T.freezes(freezes)}</Text>
            </View>
          )}
          <View style={[styles.flame, streak === 0 && styles.flameOff]} accessible accessibilityLabel={T.streakA11y(streak)}>
            <Icon name="streak" size={16} color={streak === 0 ? colors.muted : colors.gold} />
            <Text style={[styles.flameText, streak === 0 && { color: colors.muted }]}>{T.streak(streak)}</Text>
          </View>
        </View>
      </View>
      {frozen > 0 && <Text style={styles.frozeNote}>{T.frozeNote(frozen)}</Text>}
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
  },
  summaryTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  dots: { flexDirection: 'row', gap: 6, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.gold },
  dotDone: { backgroundColor: colors.gold },
  readyBadge: { color: colors.black, backgroundColor: colors.gold, fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  summaryStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryStreak: { color: colors.gold, fontWeight: '800' },
  chev: { color: colors.muted, fontSize: 22 },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: spacing(2),
    gap: spacing(1.5),
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
  pills: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  freeze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(140,200,255,0.16)',
    paddingHorizontal: spacing(1),
    paddingVertical: 3,
    borderRadius: 999,
  },
  freezeText: { color: ICE, fontWeight: '800', fontSize: 14 },
  frozeNote: { color: ICE, fontSize: 13, fontWeight: '700' },
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
