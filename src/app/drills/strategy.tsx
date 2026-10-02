import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HandView } from '../../components/HandView';
import { PlayingCard } from '../../components/PlayingCard';
import { Button, Panel, Screen } from '../../components/ui';
import { strategyQuestion } from '../../engine/drills';
import { ACTION_LABEL, Action, recommend } from '../../engine/strategy';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';

export default function StrategyDrill() {
  const { settings, stats, updateStats } = useSettings();
  const { rules } = settings;
  const [q, setQ] = useState(() => strategyQuestion());
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
    setScore({ right: score.right + (ok ? 1 : 0), total: score.total + 1, streak });
    updateStats((s) => ({
      ...s,
      decisions: s.decisions + 1,
      correctDecisions: s.correctDecisions + (ok ? 1 : 0),
      bestStrategyStreak: Math.max(s.bestStrategyStreak, streak),
    }));
  };

  const next = () => {
    setPicked(null);
    setQ(strategyQuestion());
  };

  const ok = picked === advice.action;

  return (
    <Screen>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>
          {score.right}/{score.total} correct
        </Text>
        <Text style={styles.score}>
          Streak {score.streak} · Best {Math.max(stats.bestStrategyStreak, score.streak)}
        </Text>
      </View>

      <View style={styles.table}>
        <Text style={styles.label}>Dealer shows</Text>
        <PlayingCard card={q.dealerUp} />
        <View style={{ height: spacing(2) }} />
        <HandView cards={q.cards} label="You" />
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
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? colors.good : colors.bad }}>
          <Text style={{ color: ok ? colors.good : colors.bad, fontWeight: '800', fontSize: 17 }}>
            {ok ? '✓ Correct' : `✗ The best play is ${ACTION_LABEL[advice.action]}`}
          </Text>
          <Text style={styles.reason}>{advice.reason}</Text>
          <Button title="Next hand" onPress={next} />
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
