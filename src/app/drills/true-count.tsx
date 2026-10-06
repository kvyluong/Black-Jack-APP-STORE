import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, P, Panel, Screen } from '../../components/ui';
import { trueCountQuestion } from '../../engine/drills';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

const T = localized({
  en: {
    formula: 'True count = running count ÷ decks remaining.',
    correctOf: (right: number, total: number) => `${right}/${total} correct`,
    running: (n: string) => `Running count ${n}`,
    decksLeft: (d: number) => `${d} deck${d === 1 ? '' : 's'} left`,
    question: 'What’s the true count?',
    correct: '✓ Correct',
    wrong: (n: string) => `✗ It’s ${n}`,
    next: 'Next',
  },
  es: {
    formula: 'Conteo real = conteo continuo ÷ barajas restantes.',
    correctOf: (right: number, total: number) => `${right}/${total} correctas`,
    running: (n: string) => `Conteo continuo ${n}`,
    decksLeft: (d: number) => `${d === 1 ? 'Queda' : 'Quedan'} ${d} baraja${d === 1 ? '' : 's'}`,
    question: '¿Cuál es el conteo real?',
    correct: '✓ Correcto',
    wrong: (n: string) => `✗ Es ${n}`,
    next: 'Siguiente',
  },
});

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
      <P muted>{T.formula}</P>
      <Text style={styles.score}>
        {T.correctOf(score.right, score.total)}
      </Text>
      <Panel style={{ alignItems: 'center' }}>
        <Text style={styles.big}>{T.running(signed(q.running))}</Text>
        <Text style={styles.big}>{T.decksLeft(q.decks)}</Text>
        <Text style={styles.muted}>{T.question}</Text>
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
            {ok ? T.correct : T.wrong(signed(q.answer))}
          </Text>
          <Text style={styles.explain}>
            {signed(q.running)} ÷ {q.decks} = {signed(q.answer)}
          </Text>
          <Button title={T.next} onPress={next} />
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
