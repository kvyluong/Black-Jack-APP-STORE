import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { playSound } from '../../audio/sounds';
import { HandView } from '../../components/HandView';
import { StreakBadge } from '../../components/juice';
import { PlayingCard } from '../../components/PlayingCard';
import { Button, Panel, Screen } from '../../components/ui';
import { strategyQuestion } from '../../engine/drills';
import { CATEGORY_INFO, LeakCategory, focusedQuestion, recordDecision } from '../../engine/leaks';
import { streakPitch } from '../../engine/juice';
import { ACTION_LABEL, Action, recommend } from '../../engine/strategy';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

const T = localized({
  en: {
    correctOf: (right: number, total: number) => `${right}/${total} correct`,
    streak: (streak: number, best: number) => `Streak ${streak} · Best ${best}`,
    drillTitle: (category: string) => `Drill: ${category}`,
    dealerShows: 'Dealer shows',
    you: 'You',
    correct: '✓ Correct',
    best: (action: string) => `✗ The best play is ${action}`,
    next: 'Next hand',
  },
  es: {
    correctOf: (right: number, total: number) => `${right}/${total} correctas`,
    streak: (streak: number, best: number) => `Racha ${streak} · Mejor ${best}`,
    drillTitle: (category: string) => `Ejercicio: ${category}`,
    dealerShows: 'El crupier muestra',
    you: 'Tú',
    correct: '✓ Correcto',
    best: (action: string) => `✗ La mejor jugada es ${action}`,
    next: 'Siguiente mano',
  },
});

export default function StrategyDrill() {
  const { settings, stats, updateStats } = useSettings();
  const { good, bad } = useOutcomeColors();
  const { rules } = settings;
  // Opened from Your Leaks with ?focus=soft etc. to drill only that kind of hand.
  const { focus } = useLocalSearchParams<{ focus?: LeakCategory }>();
  const nextQuestion = () => (focus && focus in CATEGORY_INFO ? focusedQuestion(focus) : strategyQuestion());
  const [q, setQ] = useState(nextQuestion);
  const [picked, setPicked] = useState<Action | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });

  const advice = recommend({
    cards: q.cards,
    dealerUp: q.dealerUp.rank,
    rules,
    canDouble: true,
    canSplit: true,
    canSurrender: rules.lateSurrender,
  });
  const actions: Action[] = ['hit', 'stand', 'double', 'split', ...(rules.lateSurrender ? (['surrender'] as Action[]) : [])];

  const choose = (a: Action) => {
    if (picked) return;
    setPicked(a);
    const ok = a === advice.action;
    const streak = ok ? score.streak + 1 : 0;
    if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong', ok ? streakPitch(streak) : 1);
    setScore({ right: score.right + (ok ? 1 : 0), total: score.total + 1, streak });
    updateStats((s) => ({
      ...s,
      leaks: recordDecision(s.leaks, { cards: q.cards, dealerUp: q.dealerUp.rank, canSplit: true, chosen: a, best: advice.action }),
      decisions: s.decisions + 1,
      correctDecisions: s.correctDecisions + (ok ? 1 : 0),
      bestStrategyStreak: Math.max(s.bestStrategyStreak, streak),
    }));
  };

  const next = () => {
    setPicked(null);
    setQ(nextQuestion());
  };

  const ok = picked === advice.action;

  return (
    <Screen>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>
          {T.correctOf(score.right, score.total)}
        </Text>
        <Text style={styles.score}>{T.streak(score.streak, Math.max(stats.bestStrategyStreak, score.streak))}</Text>
      </View>

      {focus && focus in CATEGORY_INFO && <Stack.Screen options={{ title: T.drillTitle(CATEGORY_INFO[focus].title) }} />}
      <StreakBadge streak={score.streak} />

      <View style={styles.table}>
        <Text style={styles.label}>{T.dealerShows}</Text>
        <PlayingCard card={q.dealerUp} />
        <View style={{ height: spacing(2) }} />
        <HandView cards={q.cards} label={T.you} />
      </View>

      <View style={styles.actions}>
        {actions.map((a) => (
          <Button
            key={a}
            title={ACTION_LABEL[a]}
            variant={picked && a === advice.action ? 'primary' : picked === a ? 'danger' : 'secondary'}
            onPress={() => choose(a)}
            style={styles.actionButton}
          />
        ))}
      </View>

      {picked && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
          <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 17 }}>
            {ok ? T.correct : T.best(ACTION_LABEL[advice.action])}
          </Text>
          <Text style={styles.reason}>{advice.reason}</Text>
          <Button title={T.next} onPress={next} />
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  score: { color: colors.gold, fontWeight: '700' },
  table: { alignItems: 'center', paddingVertical: spacing(2) },
  label: { color: colors.muted, marginBottom: spacing(1) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  actionButton: { minWidth: 96, flexGrow: 1 },
  reason: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
