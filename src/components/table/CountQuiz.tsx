import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { Button } from '../ui';
import { useOutcomeColors } from '../useColors';

export interface Quiz {
  guess: number;
  revealed: boolean;
}

/** Between hands: "what's the running count?" with a −/+ picker. */
export function CountQuiz({ quiz, setQuiz, actual }: { quiz: Quiz; setQuiz: (q: Quiz) => void; actual: number }) {
  const { updateStats } = useSettings();
  const { good, bad } = useOutcomeColors();
  const { guess, revealed } = quiz;
  const ok = guess === actual;
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  return (
    <View style={{ gap: spacing(1) }}>
      <Text style={styles.prompt}>Pop quiz: what’s the running count?</Text>
      <View style={styles.row}>
        <Button title="−" variant="ghost" disabled={revealed} onPress={() => setQuiz({ guess: guess - 1, revealed })} />
        <Text style={styles.guess}>{signed(guess)}</Text>
        <Button title="+" variant="ghost" disabled={revealed} onPress={() => setQuiz({ guess: guess + 1, revealed })} />
        {!revealed && (
          <Button
            title="Check"
            variant="secondary"
            onPress={() => {
              setQuiz({ guess, revealed: true });
              if (ok) updateStats((s) => ({ ...s, countDrillsPassed: s.countDrillsPassed + 1 }));
            }}
          />
        )}
      </View>
      {revealed && (
        <Text style={{ color: ok ? good : bad, fontWeight: '700' }}>{ok ? '✓ Spot on!' : `✗ It was ${signed(actual)}.`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center', alignItems: 'center' },
  guess: { color: colors.text, fontSize: 24, fontWeight: '800', minWidth: 48, textAlign: 'center' },
});
