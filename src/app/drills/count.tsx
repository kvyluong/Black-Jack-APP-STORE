import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SystemBadge } from '../../components/academy';
import { PlayingCard } from '../../components/PlayingCard';
import { Button, P, Panel, Screen, Segmented, STEP_LABEL } from '../../components/ui';
import { Card } from '../../engine/cards';
import { SYSTEM_NAME, describeTags, runningCount, signedTag } from '../../engine/counting';
import { countDrillCards } from '../../engine/drills';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

type Phase = 'setup' | 'running' | 'answer' | 'result';
type Pace = 'auto' | 'self';

/** A full single deck, counted one card at a time, is what the saved records track. */
const FULL_DECK = 52;
/** Common benchmark for being casino ready: a full deck counted exactly in under 30 seconds. */
const TARGET_MS = 30000;

const T = localized({
  en: {
    intro: (name: string, tags: string) => `Keep the ${name} running count as the cards go by. Tags: ${tags}.`,
    koNote:
      'KO practice starts from 0 so you can check the tags. In a real shoe KO starts at 4 − 4 × decks (6 decks: −20; 1 deck: 0).',
    speed: 'Speed',
    slow: 'Slow',
    medium: 'Medium',
    fast: 'Fast',
    pro: 'Pro',
    pace: 'Pace',
    auto: 'Auto flash',
    self: 'Tap to advance',
    selfNote: 'Self-paced: tap the card for the next one. Timed from the first card to the last, so full decks count toward your best time.',
    length: 'Length',
    cards: (n: number) => `${n} cards`,
    fullDeck: 'Full deck',
    perFlash: 'Cards at a time',
    one: 'One',
    two: 'Two (cancel pairs)',
    best: (s: string) => `Best full deck: ${s} s`,
    noBest: 'Best full deck: not yet (full deck, one card at a time, tap to advance)',
    perfectDecks: (n: number) => `Perfect full decks: ${n}`,
    target: 'Casino-ready target: a full deck, exact, in under 30 s.',
    start: 'Start',
    stop: 'Stop',
    nextCard: 'Next card',
    nextA11y: (i: number, n: number) => `Card ${i} of ${n}. Tap for the next card`,
    done: 'Done: give the count',
    question: 'What’s the running count?',
    guess: (n: string) => `Your guess: ${n}`,
    check: 'Check',
    perfect: '✓ Perfect count!',
    wrong: (n: string) => `✗ The count was ${n}`,
    time: (s: string) => `Time: ${s} s`,
    newBest: (s: string) => `★ New best full deck: ${s} s`,
    underTarget: '✓ Under 30 seconds: casino ready speed!',
    review: 'Here’s every card with its tag:',
    again: 'Try again',
    change: 'Change settings',
  },
  es: {
    intro: (name: string, tags: string) => `Lleva el conteo continuo ${name} mientras pasan las cartas. Valores: ${tags}.`,
    koNote:
      'La práctica de KO empieza en 0 para que revises los valores. En un zapato real KO empieza en 4 − 4 × barajas (6 barajas: −20; 1 baraja: 0).',
    speed: 'Velocidad',
    slow: 'Lenta',
    medium: 'Media',
    fast: 'Rápida',
    pro: 'Pro',
    pace: 'Ritmo',
    auto: 'Automático',
    self: 'Toca para avanzar',
    selfNote: 'A tu ritmo: toca la carta para ver la siguiente. Se mide de la primera a la última carta, así las barajas completas cuentan para tu mejor tiempo.',
    length: 'Duración',
    cards: (n: number) => `${n} cartas`,
    fullDeck: 'Baraja completa',
    perFlash: 'Cartas a la vez',
    one: 'Una',
    two: 'Dos (se anulan en pareja)',
    best: (s: string) => `Mejor baraja completa: ${s} s`,
    noBest: 'Mejor baraja completa: aún no (baraja completa, una carta a la vez, toca para avanzar)',
    perfectDecks: (n: number) => `Barajas completas perfectas: ${n}`,
    target: 'Meta para el casino: una baraja completa, exacta, en menos de 30 s.',
    start: 'Empezar',
    stop: 'Detener',
    nextCard: 'Siguiente carta',
    nextA11y: (i: number, n: number) => `Carta ${i} de ${n}. Toca para la siguiente`,
    done: 'Listo: da el conteo',
    question: '¿Cuál es el conteo continuo?',
    guess: (n: string) => `Tu respuesta: ${n}`,
    check: 'Comprobar',
    perfect: '✓ ¡Conteo perfecto!',
    wrong: (n: string) => `✗ El conteo era ${n}`,
    time: (s: string) => `Tiempo: ${s} s`,
    newBest: (s: string) => `★ Nueva mejor baraja completa: ${s} s`,
    underTarget: '✓ Menos de 30 segundos: ¡velocidad de casino!',
    review: 'Aquí está cada carta con su valor:',
    again: 'Intentar de nuevo',
    change: 'Cambiar ajustes',
  },
});

const seconds = (ms: number) => (ms / 1000).toFixed(1);

/** Running count drill in the player's counting system, with timed full-deck records. */
export default function CountDrill() {
  const { settings, stats, updateStats } = useSettings();
  const system = settings.countingSystem;
  const records = stats.countRecords;
  const speeds = [
    { label: T.slow, value: 1500 },
    { label: T.medium, value: 1000 },
    { label: T.fast, value: 600 },
    { label: T.pro, value: 350 },
  ];
  const lengths = [
    { label: T.cards(10), value: 10 },
    { label: T.cards(20), value: 20 },
    { label: T.fullDeck, value: FULL_DECK },
  ];
  const { good, bad } = useOutcomeColors();
  const [phase, setPhase] = useState<Phase>('setup');
  const [pace, setPace] = useState<Pace>('auto');
  const [speed, setSpeed] = useState(1000);
  const [length, setLength] = useState(20);
  const [perFlash, setPerFlash] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(0);
  /** Self-paced time from the first card shown to the last card shown, in ms. */
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const shownAt = useRef(0);

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
    setElapsed(null);
    setNewBest(false);
    setPhase('running');
    clearTimer();
    shownAt.current = Date.now();
    if (pace === 'self') return;
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

  /** Self-paced: show the next card(s); the clock stops when the last card appears. */
  const advance = () => {
    const next = index + perFlash;
    if (next >= cards.length) {
      setPhase('answer');
      return;
    }
    setIndex(next);
    if (next + perFlash >= cards.length) setElapsed(Date.now() - shownAt.current);
  };

  const actual = runningCount(cards, system);
  const ok = guess === actual;
  const lastShown = index + perFlash >= cards.length;
  const isFullDeckRun = cards.length === FULL_DECK && perFlash === 1;

  const check = () => {
    setPhase('result');
    if (!ok) return;
    const timed = isFullDeckRun && pace === 'self' && elapsed !== null ? elapsed : null;
    setNewBest(timed !== null && (records.bestDeckMs === null || timed < records.bestDeckMs));
    updateStats((s) => ({
      ...s,
      countDrillsPassed: s.countDrillsPassed + 1,
      ...(isFullDeckRun
        ? {
            countRecords: {
              perfectDecks: s.countRecords.perfectDecks + 1,
              bestDeckMs: timed === null ? s.countRecords.bestDeckMs : Math.min(timed, s.countRecords.bestDeckMs ?? Infinity),
            },
          }
        : {}),
    }));
  };

  return (
    <Screen>
      {phase === 'setup' && (
        <>
          <SystemBadge />
          <P>{T.intro(SYSTEM_NAME[system], describeTags(system))}</P>
          {system === 'ko' && <P muted>{T.koNote}</P>}
          <Panel>
            <Text style={styles.label}>{T.pace}</Text>
            <Segmented<Pace> options={[{ label: T.auto, value: 'auto' }, { label: T.self, value: 'self' }]} value={pace} onChange={setPace} />
            {pace === 'auto' ? (
              <>
                <Text style={styles.label}>{T.speed}</Text>
                <Segmented options={speeds} value={speed} onChange={setSpeed} />
              </>
            ) : (
              <Text style={styles.note}>{T.selfNote}</Text>
            )}
            <Text style={styles.label}>{T.length}</Text>
            <Segmented options={lengths} value={length} onChange={setLength} />
            <Text style={styles.label}>{T.perFlash}</Text>
            <Segmented options={[{ label: T.one, value: 1 }, { label: T.two, value: 2 }]} value={perFlash} onChange={setPerFlash} />
          </Panel>
          <Panel>
            <Text style={styles.record}>{records.bestDeckMs !== null ? T.best(seconds(records.bestDeckMs)) : T.noBest}</Text>
            <Text style={styles.note}>{T.perfectDecks(records.perfectDecks)}</Text>
            <Text style={styles.note}>{T.target}</Text>
          </Panel>
          <Button title={T.start} onPress={start} />
        </>
      )}

      {phase === 'running' && (
        <View style={styles.stage}>
          {pace === 'self' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={T.nextA11y(Math.min(index + perFlash, cards.length), cards.length)}
              onPress={advance}
              style={({ pressed }) => [styles.flash, styles.tapArea, pressed && { opacity: 0.85 }]}
            >
              {cards.slice(index, index + perFlash).map((c, i) => (
                <PlayingCard key={`${index}-${i}`} card={c} size="lg" />
              ))}
            </Pressable>
          ) : (
            <View style={styles.flash}>
              {cards.slice(index, index + perFlash).map((c, i) => (
                <PlayingCard key={`${index}-${i}`} card={c} size="lg" />
              ))}
            </View>
          )}
          <Text style={styles.progress}>
            {Math.min(index + perFlash, cards.length)} / {cards.length}
          </Text>
          {pace === 'self' && <Button title={lastShown ? T.done : T.nextCard} onPress={advance} />}
          <Button
            title={T.stop}
            variant="ghost"
            onPress={() => {
              clearTimer();
              setPhase('setup');
            }}
          />
        </View>
      )}

      {(phase === 'answer' || phase === 'result') && (
        <>
          <Panel>
            <Text style={styles.prompt}>{T.question}</Text>
            <View style={styles.stepper}>
              <Button title="−" accessibilityLabel={STEP_LABEL.down} variant="ghost" disabled={phase === 'result'} onPress={() => setGuess(guess - 1)} style={styles.step} />
              <Text style={styles.guess} accessibilityLabel={T.guess(signedTag(guess))}>
                {signedTag(guess)}
              </Text>
              <Button title="+" accessibilityLabel={STEP_LABEL.up} variant="ghost" disabled={phase === 'result'} onPress={() => setGuess(guess + 1)} style={styles.step} />
            </View>
            {phase === 'answer' && <Button title={T.check} onPress={check} />}
          </Panel>

          {phase === 'result' && (
            <>
              <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
                <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 18 }}>{ok ? T.perfect : T.wrong(signedTag(actual))}</Text>
                {pace === 'self' && elapsed !== null && <Text style={styles.record}>{T.time(seconds(elapsed))}</Text>}
                {newBest && elapsed !== null && <Text style={styles.record}>{T.newBest(seconds(elapsed))}</Text>}
                {ok && isFullDeckRun && pace === 'self' && elapsed !== null && elapsed < TARGET_MS && (
                  <Text style={{ color: good, fontWeight: '700' }}>{T.underTarget}</Text>
                )}
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
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  record: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  stage: { alignItems: 'center', paddingVertical: spacing(4), gap: spacing(3) },
  flash: { flexDirection: 'row', gap: spacing(2), minHeight: 140 },
  tapArea: { padding: spacing(1), borderRadius: 12 },
  progress: { color: colors.muted, fontSize: 16 },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
  step: { minWidth: 64 },
  guess: { color: colors.text, fontSize: 36, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  review: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
});
