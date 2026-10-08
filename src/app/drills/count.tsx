import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayingCard } from '../../components/PlayingCard';
import { Button, P, Panel, Screen, Segmented, STEP_LABEL } from '../../components/ui';
import { Card } from '../../engine/cards';
import { runningCount } from '../../engine/counting';
import { countDrillCards } from '../../engine/drills';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

type Phase = 'setup' | 'running' | 'answer' | 'result';

const T = localized({
  en: {
    intro: 'Keep the Hi-Lo running count as the cards flash by: +1 for 2–6, 0 for 7–9, −1 for 10s and Aces.',
    speed: 'Speed',
    slow: 'Slow',
    medium: 'Medium',
    fast: 'Fast',
    pro: 'Pro',
    length: 'Length',
    cards: (n: number) => `${n} cards`,
    fullDeck: 'Full deck',
    perFlash: 'Cards at a time',
    one: 'One',
    two: 'Two (cancel pairs)',
    start: 'Start',
    stop: 'Stop',
    question: 'What’s the running count?',
    guess: (n: string) => `Your guess: ${n}`,
    check: 'Check',
    perfect: '✓ Perfect count!',
    wrong: (n: string) => `✗ The count was ${n}`,
    review: 'Here’s every card with its tag:',
    again: 'Try again',
    change: 'Change settings',
  },
  es: {
    intro: 'Lleva el conteo continuo Hi-Lo mientras pasan las cartas: +1 para 2–6, 0 para 7–9, −1 para los 10 y los Ases.',
    speed: 'Velocidad',
    slow: 'Lenta',
    medium: 'Media',
    fast: 'Rápida',
    pro: 'Pro',
    length: 'Duración',
    cards: (n: number) => `${n} cartas`,
    fullDeck: 'Baraja completa',
    perFlash: 'Cartas a la vez',
    one: 'Una',
    two: 'Dos (se anulan en pareja)',
    start: 'Empezar',
    stop: 'Detener',
    question: '¿Cuál es el conteo continuo?',
    guess: (n: string) => `Tu respuesta: ${n}`,
    check: 'Comprobar',
    perfect: '✓ ¡Conteo perfecto!',
    wrong: (n: string) => `✗ El conteo era ${n}`,
    review: 'Aquí está cada carta con su valor:',
    again: 'Intentar de nuevo',
    change: 'Cambiar ajustes',
  },
});

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

export default function CountDrill() {
  const { updateStats } = useSettings();
  const speeds = [
    { label: T.slow, value: 1500 },
    { label: T.medium, value: 1000 },
    { label: T.fast, value: 600 },
    { label: T.pro, value: 350 },
  ];
  const lengths = [
    { label: T.cards(10), value: 10 },
    { label: T.cards(20), value: 20 },
    { label: T.fullDeck, value: 52 },
  ];
  const { good, bad } = useOutcomeColors();
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
          <P>{T.intro}</P>
          <Panel>
            <Text style={styles.label}>{T.speed}</Text>
            <Segmented options={speeds} value={speed} onChange={setSpeed} />
            <Text style={styles.label}>{T.length}</Text>
            <Segmented options={lengths} value={length} onChange={setLength} />
            <Text style={styles.label}>{T.perFlash}</Text>
            <Segmented options={[{ label: T.one, value: 1 }, { label: T.two, value: 2 }]} value={perFlash} onChange={setPerFlash} />
          </Panel>
          <Button title={T.start} onPress={start} />
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
          <Button title={T.stop} variant="ghost" onPress={() => { clearTimer(); setPhase('setup'); }} />
        </View>
      )}

      {(phase === 'answer' || phase === 'result') && (
        <>
          <Panel>
            <Text style={styles.prompt}>{T.question}</Text>
            <View style={styles.stepper}>
              <Button title="−" accessibilityLabel={STEP_LABEL.down} variant="ghost" disabled={phase === 'result'} onPress={() => setGuess(guess - 1)} style={styles.step} />
              <Text style={styles.guess} accessibilityLabel={T.guess(signed(guess))}>
                {signed(guess)}
              </Text>
              <Button title="+" accessibilityLabel={STEP_LABEL.up} variant="ghost" disabled={phase === 'result'} onPress={() => setGuess(guess + 1)} style={styles.step} />
            </View>
            {phase === 'answer' && <Button title={T.check} onPress={check} />}
          </Panel>

          {phase === 'result' && (
            <>
              <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
                <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 18 }}>
                  {ok ? T.perfect : T.wrong(signed(actual))}
                </Text>
                <Text style={styles.label}>{T.review}</Text>
                <View style={styles.review}>
                  {cards.map((c, i) => (
                    <PlayingCard key={i} card={c} size="sm" showTag />
                  ))}
                </View>
              </Panel>
              <Button title={T.again} onPress={start} />
              <Button title={T.change} variant="ghost" onPress={() => setPhase('setup')} />
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
