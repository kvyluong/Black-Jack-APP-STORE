import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayingCard } from '../../components/PlayingCard';
import { Button, P, Panel, Screen, Segmented } from '../../components/ui';
import { Card } from '../../engine/cards';
import { runningCount } from '../../engine/counting';
import { countDrillCards } from '../../engine/drills';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';

type Phase = 'setup' | 'running' | 'answer' | 'result';

const SPEEDS = [
  { label: 'Slow', value: 1500 },
  { label: 'Medium', value: 1000 },
  { label: 'Fast', value: 600 },
  { label: 'Pro', value: 350 },
];
const LENGTHS = [
  { label: '10 cards', value: 10 },
  { label: '20 cards', value: 20 },
  { label: 'Full deck', value: 52 },
];

export default function CountDrill() {
  const { updateStats } = useSettings();
  const [phase, setPhase] = useState<Phase>('setup');
  const [speed, setSpeed] = useState(1000);
  const [length, setLength] = useState(20);
  const [perFlash, setPerFlash] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  const start = () => {
    const drawn = countDrillCards(length);
    setCards(drawn);
    setIndex(0);
    setGuess(0);
    setPhase('running');
    clearTimer();
    let i = 0;
    timer.current = setInterval(() => {
      i += perFlash;
      if (i >= drawn.length) {
        clearTimer();
        setPhase('answer');
      } else {
        setIndex(i);
      }
    }, speed);
  };

  const actual = runningCount(cards);
  const ok = guess === actual;

  const check = () => {
    setPhase('result');
    if (ok) updateStats((s) => ({ ...s, countDrillsPassed: s.countDrillsPassed + 1 }));
  };

  return (
    <Screen>
      {phase === 'setup' && (
        <>
          <P>Keep the Hi-Lo running count as the cards flash by: +1 for 2–6, 0 for 7–9, −1 for 10s and Aces.</P>
          <Panel>
            <Text style={styles.label}>Speed</Text>
            <Segmented options={SPEEDS} value={speed} onChange={setSpeed} />
            <Text style={styles.label}>Length</Text>
            <Segmented options={LENGTHS} value={length} onChange={setLength} />
            <Text style={styles.label}>Cards at a time</Text>
            <Segmented options={[{ label: 'One', value: 1 }, { label: 'Two (cancel pairs)', value: 2 }]} value={perFlash} onChange={setPerFlash} />
          </Panel>
          <Button title="Start" onPress={start} />
        </>
      )}

      {phase === 'running' && (
        <View style={styles.stage}>
          <View style={styles.flash}>
            {cards.slice(index, index + perFlash).map((c, i) => (
              <PlayingCard key={`${index}-${i}`} card={c} size="lg" />
            ))}
          </View>
          <Text style={styles.progress}>
            {Math.min(index + perFlash, cards.length)} / {cards.length}
          </Text>
          <Button title="Stop" variant="ghost" onPress={() => { clearTimer(); setPhase('setup'); }} />
        </View>
      )}

      {(phase === 'answer' || phase === 'result') && (
        <>
          <Panel>
            <Text style={styles.prompt}>What's the running count?</Text>
            <View style={styles.stepper}>
              <Button title="−" variant="ghost" disabled={phase === 'result'} onPress={() => setGuess(guess - 1)} style={styles.step} />
              <Text style={styles.guess}>
                {guess > 0 ? '+' : ''}
                {guess}
              </Text>
              <Button title="+" variant="ghost" disabled={phase === 'result'} onPress={() => setGuess(guess + 1)} style={styles.step} />
            </View>
            {phase === 'answer' && <Button title="Check" onPress={check} />}
          </Panel>

          {phase === 'result' && (
            <>
              <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? colors.good : colors.bad }}>
                <Text style={{ color: ok ? colors.good : colors.bad, fontWeight: '800', fontSize: 18 }}>
                  {ok ? '✓ Perfect count!' : `✗ The count was ${actual > 0 ? '+' : ''}${actual}`}
                </Text>
                <Text style={styles.label}>Here's every card with its tag:</Text>
                <View style={styles.review}>
                  {cards.map((c, i) => (
                    <PlayingCard key={i} card={c} size="sm" showTag />
                  ))}
                </View>
              </Panel>
              <Button title="Try again" onPress={start} />
              <Button title="Change settings" variant="ghost" onPress={() => setPhase('setup')} />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontWeight: '600', marginTop: spacing(1) },
  stage: { alignItems: 'center', paddingVertical: spacing(4), gap: spacing(3) },
  flash: { flexDirection: 'row', gap: spacing(2), minHeight: 140 },
  progress: { color: colors.muted, fontSize: 16 },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
  step: { minWidth: 64 },
  guess: { color: colors.text, fontSize: 36, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  review: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
});
