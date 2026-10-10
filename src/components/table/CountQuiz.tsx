import { StyleSheet, Text, View } from 'react-native';

import { localized } from '../../i18n/lang';
import { usePrefs } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { Button, STEP_LABEL } from '../ui';
import { useOutcomeColors } from '../useColors';

const T = localized({
  en: {
    prompt: 'Pop quiz: what’s the running count?',
    check: 'Check',
    right: '✓ Spot on!',
    wrong: (n: string) => `✗ It was ${n}.`,
  },
  es: {
    prompt: 'Pregunta rápida: ¿cuál es el conteo continuo?',
    check: 'Comprobar',
    right: '✓ ¡Exacto!',
    wrong: (n: string) => `✗ Era ${n}.`,
  },
});

export interface Quiz {
  guess: number;
  revealed: boolean;
}

/** Between hands: "what's the running count?" with a −/+ picker. */
export function CountQuiz({ quiz, setQuiz, actual }: { quiz: Quiz; setQuiz: (q: Quiz) => void; actual: number }) {
  const { updateStats } = usePrefs();
  const { good, bad } = useOutcomeColors();
  const { guess, revealed } = quiz;
  const ok = guess === actual;
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  return (
    <View style={{ gap: spacing(1) }}>
      <Text style={styles.prompt}>{T.prompt}</Text>
      <View style={styles.row}>
        <Button title="−" accessibilityLabel={STEP_LABEL.down} variant="ghost" disabled={revealed} onPress={() => setQuiz({ guess: guess - 1, revealed })} />
        <Text style={styles.guess}>{signed(guess)}</Text>
        <Button title="+" accessibilityLabel={STEP_LABEL.up} variant="ghost" disabled={revealed} onPress={() => setQuiz({ guess: guess + 1, revealed })} />
        {!revealed && (
          <Button
            title={T.check}
            variant="secondary"
            onPress={() => {
              setQuiz({ guess, revealed: true });
              if (ok) updateStats((s) => ({ ...s, countDrillsPassed: s.countDrillsPassed + 1 }));
            }}
          />
        )}
      </View>
      {revealed && (
        <Text style={{ color: ok ? good : bad, fontWeight: '700' }}>{ok ? T.right : T.wrong(signed(actual))}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center', alignItems: 'center' },
  guess: { color: colors.text, fontSize: 24, fontWeight: '800', minWidth: 48, textAlign: 'center' },
});
