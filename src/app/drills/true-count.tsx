import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, P, Panel, Screen } from '../../components/ui';
import { trueCountQuestion } from '../../engine/drills';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

export default function TrueCountDrill() {
  const { settings } = useSettings();
  const { good, bad } = useOutcomeColors();
  const maxDecks = Math.max(2, settings.rules.decks);
  const [q, setQ] = useState(() => trueCountQuestion(maxDecks));
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const choose = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    setScore((s) => ({ right: s.right + (n === q.answer ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setPicked(null);
    setQ(trueCountQuestion(maxDecks));
  };

  const ok = picked === q.answer;

  return (
    <Screen>
      <P muted>True count = running count ÷ decks remaining.</P>
      <Text style={styles.score}>
        {score.right}/{score.total} correct
      </Text>
      <Panel style={{ alignItems: 'center' }}>
        <Text style={styles.big}>Running count {signed(q.running)}</Text>
        <Text style={styles.big}>
          {q.decks} deck{q.decks === 1 ? '' : 's'} left
        </Text>
        <Text style={styles.muted}>What’s the true count?</Text>
      </Panel>
      <View style={styles.options}>
        {q.options.map((n) => (
          <Button
            key={n}
            title={signed(n)}
            variant={picked !== null && n === q.answer ? 'primary' : picked === n ? 'danger' : 'secondary'}
            onPress={() => choose(n)}
            style={styles.option}
          />
        ))}
      </View>
      {picked !== null && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
          <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 17 }}>
            {ok ? '✓ Correct' : `✗ It's ${signed(q.answer)}`}
          </Text>
          <Text style={styles.explain}>
            {signed(q.running)} ÷ {q.decks} = {signed(q.answer)}
          </Text>
          <Button title="Next" onPress={next} />
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { color: colors.gold, fontWeight: '700' },
  big: { color: colors.text, fontSize: 24, fontWeight: '800' },
  muted: { color: colors.muted, marginTop: spacing(1) },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  option: { minWidth: 72, flexGrow: 1 },
  explain: { color: colors.text, fontSize: 16 },
});
