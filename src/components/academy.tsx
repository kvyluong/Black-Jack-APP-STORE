// The Counting Academy's practice modes. Each reports back how accurate the
// round was; the screen around it handles levels, XP and review scheduling.
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { playSound } from '../audio/sounds';
import { speak, spokenCount, stopSpeaking } from '../audio/speak';
import {
  cardGroups,
  cardRun,
  countStory,
  flashMs,
  groupChoices,
  groupValue,
  roundLength,
  spokenEvery,
  tagOf,
  tapSeconds,
  visualHints,
} from '../engine/academy';
import { Card } from '../engine/cards';
import { localized } from '../i18n/lang';
import type { SoundName } from '../engine/dealSchedule';
import { useSettings } from '../state/settings';
import { colors, radius, spacing, tagColor, tagSymbol } from '../theme';
import { useOutcomeColors } from './useColors';
import { PlayingCard } from './PlayingCard';
import { Button, P, Panel } from './ui';

export interface RoundResult {
  /** 0–1. 90%+ levels up. */
  accuracy: number;
  /** Correct answers, for XP. */
  correct: number;
}

interface ModeProps {
  level: number;
  onFinish: (r: RoundResult) => void;
}

const T = localized({
  en: {
    prompt: 'What’s the running count?',
    guessA11y: (n: string) => `Your count: ${n}`,
    check: 'Check',
    exact: '✓ Exactly right',
    close: (n: string) => `Close: it was ${n}`,
    wrong: (n: string) => `✗ it was ${n}`,
    finish: 'Finish',
    combo: (n: number) => `Combo ×${n}`,
    perCard: (s: string) => `${s}s per card`,
    timeLeft: 'Time left',
    runningA11y: (n: number) => `Running count ${n}`,
    colorMeta: (i: number, n: number, level: number, glow: boolean) =>
      `Card ${i}/${n} · Level ${level}: ${glow ? 'color hints on' : 'no color hints'}`,
    legendCb: 'Blue ▲ = +1 · Gray ● = 0 · Orange ▼ = −1',
    legend: 'Green ▲ = +1 · Gray ● = 0 · Red ▼ = −1',
    soundMeta: (i: number, n: number, every: number | null, eyesFree: boolean) =>
      `Card ${i}/${n} · ${every ? `Count spoken every ${every === 1 ? 'card' : `${every} cards`}` : 'No spoken count'}${eyesFree ? ' · Eyes-free' : ''}`,
    soundLegend: 'High pip = +1 · Click = 0 · Low pip = −1. Turn your sound on.',
    groupMeta: (i: number, n: number, size: number) => `Group ${i}/${n} · ${size === 2 ? 'Pairs' : `Groups of ${size}`}`,
    groupWas: (n: string) => `That group is ${n}`,
    groupTip: 'Tip: a high card and a low card cancel to 0. Count only what’s left.',
    oneAtATime: 'One line at a time: keep the count as you read',
    readAll: 'Read the round, then give the count',
    nextLine: 'Next line',
    haveCount: 'I have the count',
  },
  es: {
    prompt: '¿Cuál es el conteo continuo?',
    guessA11y: (n: string) => `Tu conteo: ${n}`,
    check: 'Comprobar',
    exact: '✓ ¡Exacto!',
    close: (n: string) => `Casi: era ${n}`,
    wrong: (n: string) => `✗ era ${n}`,
    finish: 'Terminar',
    combo: (n: number) => `Combo ×${n}`,
    perCard: (s: string) => `${s} s por carta`,
    timeLeft: 'Tiempo restante',
    runningA11y: (n: number) => `Conteo continuo ${n}`,
    colorMeta: (i: number, n: number, level: number, glow: boolean) =>
      `Carta ${i}/${n} · Nivel ${level}: ${glow ? 'con pistas de color' : 'sin pistas de color'}`,
    legendCb: 'Azul ▲ = +1 · Gris ● = 0 · Naranja ▼ = −1',
    legend: 'Verde ▲ = +1 · Gris ● = 0 · Rojo ▼ = −1',
    soundMeta: (i: number, n: number, every: number | null, eyesFree: boolean) =>
      `Carta ${i}/${n} · ${every ? `Conteo en voz alta cada ${every === 1 ? 'carta' : `${every} cartas`}` : 'Sin conteo en voz alta'}${eyesFree ? ' · Sin mirar' : ''}`,
    soundLegend: 'Tono agudo = +1 · Clic = 0 · Tono grave = −1. Activa el sonido.',
    groupMeta: (i: number, n: number, size: number) => `Grupo ${i}/${n} · ${size === 2 ? 'Parejas' : `Grupos de ${size}`}`,
    groupWas: (n: string) => `Ese grupo vale ${n}`,
    groupTip: 'Consejo: una carta alta y una baja se anulan y dan 0. Cuenta solo lo que queda.',
    oneAtATime: 'Una línea a la vez: lleva el conteo mientras lees',
    readAll: 'Lee la ronda y luego da el conteo',
    nextLine: 'Siguiente línea',
    haveCount: 'Ya tengo el conteo',
  },
});

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const TAG_SOUND = (t: number): SoundName => (t > 0 ? 'tag_plus' : t < 0 ? 'tag_minus' : 'tag_zero');

/** Scoring for "what's the count?" answers: exact is full marks, off by one is half. */
function countAccuracy(guess: number, actual: number) {
  return guess === actual ? 1 : Math.abs(guess - actual) === 1 ? 0.5 : 0;
}

/** Stepper to enter a running count, then reveal the answer with every card's tag. */
function CountAnswer({ cards, onDone }: { cards: Card[]; onDone: (r: RoundResult) => void }) {
  const { settings } = useSettings();
  const oc = useOutcomeColors();
  const actual = cards.reduce((s, c) => s + tagOf(c), 0);
  const [guess, setGuess] = useState(0);
  const [checked, setChecked] = useState(false);
  const acc = countAccuracy(guess, actual);
  return (
    <Panel>
      <Text style={styles.prompt}>{T.prompt}</Text>
      <View style={styles.stepper}>
        <Button title="−" variant="ghost" disabled={checked} onPress={() => setGuess(guess - 1)} style={styles.step} />
        <Text style={styles.guess} accessibilityLabel={T.guessA11y(signed(guess))}>
          {signed(guess)}
        </Text>
        <Button title="+" variant="ghost" disabled={checked} onPress={() => setGuess(guess + 1)} style={styles.step} />
      </View>
      {!checked ? (
        <Button
          title={T.check}
          onPress={() => {
            setChecked(true);
            if (settings.soundEffects) playSound(acc === 1 ? 'correct' : 'wrong');
          }}
        />
      ) : (
        <>
          <Text style={[styles.verdict, { color: acc === 1 ? oc.good : acc > 0 ? colors.warn : oc.bad }]}>
            {acc === 1 ? T.exact : acc > 0 ? T.close(signed(actual)) : T.wrong(signed(actual))}
          </Text>
          <View style={styles.review}>
            {cards.map((c, i) => (
              <PlayingCard key={i} card={c} size="xs" showTag />
            ))}
          </View>
          <Button title={T.finish} onPress={() => onDone({ accuracy: acc, correct: Math.round(acc * cards.length * 0.5) })} />
        </>
      )}
    </Panel>
  );
}

/** Do it: tap each card's tag before the clock runs out. */
export function TagTap({ level, onFinish }: ModeProps) {
  const { settings } = useSettings();
  const cb = settings.colorblind;
  const cards = useMemo(() => cardRun(roundLength('tagTap', level)), [level]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const clock = useState(() => new Animated.Value(1))[0];
  const seconds = tapSeconds(level);

  const answer = (value: number | null) => {
    if (flash) return; // already answered this card
    clock.stopAnimation();
    const ok = value === tagOf(cards[i]);
    if (settings.soundEffects) playSound(ok ? TAG_SOUND(tagOf(cards[i])) : 'wrong');
    setFlash(ok ? 'ok' : 'no');
    setCombo(ok ? combo + 1 : 0);
    const nextRight = right + (ok ? 1 : 0);
    setRight(nextRight);
    setTimeout(() => {
      setFlash(null);
      if (i + 1 >= cards.length) onFinish({ accuracy: nextRight / cards.length, correct: nextRight });
      else setI(i + 1);
    }, 220);
  };

  useEffect(() => {
    clock.setValue(1);
    const anim = Animated.timing(clock, { toValue: 0, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && answer(null));
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <View style={{ gap: spacing(2) }}>
      <View style={styles.row}>
        <Text style={styles.meta}>
          {i + 1}/{cards.length}
        </Text>
        <Text style={styles.meta}>{combo >= 3 ? T.combo(combo) : T.perCard(seconds.toFixed(1))}</Text>
      </View>
      <View style={styles.track} accessibilityLabel={T.timeLeft}>
        <Animated.View style={[styles.fill, { width: clock.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <View style={[styles.stage, flash === 'ok' && styles.ok, flash === 'no' && styles.no]}>
        <PlayingCard card={cards[i]} size="lg" />
      </View>
      <View style={styles.tagButtons}>
        {[-1, 0, 1].map((v) => (
          <Button key={v} title={`${tagSymbol(v)} ${signed(v)}`} variant="secondary" onPress={() => answer(v)} style={{ ...styles.tagButton, borderColor: tagColor(v, cb) }} />
        ))}
      </View>
    </View>
  );
}

/** Shared flash-card runner for the See and Hear modes. */
function useFlashRun(level: number, onCard: (card: Card, index: number, running: number) => void) {
  const cards = useMemo(() => cardRun(roundLength('colorCount', level)), [level]);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const running = cards.slice(0, i + 1).reduce((s, c) => s + tagOf(c), 0);
  useEffect(() => {
    if (done) return;
    onCard(cards[i], i, running);
    const id = setTimeout(() => (i + 1 >= cards.length ? setDone(true) : setI(i + 1)), flashMs(level));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, done]);
  return { cards, i, done, running };
}

/** See it: color-coded cards and a count meter, with the hints fading as you level up. */
export function ColorCount({ level, onFinish }: ModeProps) {
  const cb = useSettings().settings.colorblind;
  const hints = visualHints(level);
  const { cards, i, done, running } = useFlashRun(level, () => {});
  if (done) return <CountAnswer cards={cards} onDone={onFinish} />;
  const tag = tagOf(cards[i]);
  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={styles.meta}>{T.colorMeta(i + 1, cards.length, level, hints.glow)}</Text>
      <View style={styles.colorStage}>
        {hints.meter && (
          <View style={styles.meter} accessibilityLabel={T.runningA11y(running)}>
            <View style={[styles.meterFill, { height: `${50 + Math.max(-10, Math.min(10, running)) * 5}%`, backgroundColor: tagColor(running, cb) }]} />
            <Text style={styles.meterText}>{signed(running)}</Text>
          </View>
        )}
        <View style={[styles.glow, hints.glow && { borderColor: tagColor(tag, cb), shadowColor: tagColor(tag, cb) }]}>
          <PlayingCard key={i} card={cards[i]} size="lg" showTag={hints.badge} />
        </View>
      </View>
      <P muted style={{ textAlign: 'center' }}>
        {cb ? T.legendCb : T.legend}
      </P>
    </View>
  );
}

/** Hear it: each card plays its tag sound; early levels also say the running count. */
export function SoundCount({ level, onFinish }: ModeProps) {
  const every = spokenEvery(level);
  const eyesFree = level >= 4;
  const { cards, i, done } = useFlashRun(level, (card, index, running) => {
    playSound(TAG_SOUND(tagOf(card)));
    if (every && (index + 1) % every === 0) setTimeout(() => speak(spokenCount(running)), 250);
  });
  useEffect(() => () => stopSpeaking(), []);
  if (done) return <CountAnswer cards={cards} onDone={onFinish} />;
  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={styles.meta}>{T.soundMeta(i + 1, cards.length, every, eyesFree)}</Text>
      <View style={styles.stage}>
        <PlayingCard key={i} card={cards[i]} size="lg" faceDown={eyesFree} />
      </View>
      <P muted style={{ textAlign: 'center' }}>
        {T.soundLegend}
      </P>
    </View>
  );
}

/** Chunk it: call the total of each pair or group in one go. */
export function PairCancel({ level, onFinish }: ModeProps) {
  const { settings } = useSettings();
  const groups = useMemo(() => cardGroups(level), [level]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [shown, setShown] = useState<{ ok: boolean; value: number } | null>(null);
  const group = groups[i];
  const choices = groupChoices(group.length);

  const answer = (v: number) => {
    if (shown) return;
    const value = groupValue(group);
    const ok = v === value;
    if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong');
    setShown({ ok, value });
    const nextRight = right + (ok ? 1 : 0);
    setRight(nextRight);
    setTimeout(
      () => {
        setShown(null);
        if (i + 1 >= groups.length) onFinish({ accuracy: nextRight / groups.length, correct: nextRight });
        else setI(i + 1);
      },
      ok ? 350 : 1100,
    );
  };

  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={styles.meta}>{T.groupMeta(i + 1, groups.length, group.length)}</Text>
      <View style={[styles.groupRow, shown && (shown.ok ? styles.ok : styles.no)]}>
        {group.map((c, k) => (
          <PlayingCard key={`${i}-${k}`} card={c} size="md" showTag={!!shown} />
        ))}
      </View>
      {shown && !shown.ok && <Text style={[styles.verdict, { color: colors.bad }]}>{T.groupWas(signed(shown.value))}</Text>}
      <View style={styles.tagButtons}>
        {choices.map((v) => (
          <Button key={v} title={signed(v)} variant="secondary" onPress={() => answer(v)} style={styles.choice} />
        ))}
      </View>
      <P muted style={{ textAlign: 'center' }}>
        {T.groupTip}
      </P>
    </View>
  );
}

/** Read it: a written round at the table. Later levels reveal it one line at a time. */
export function ReadCount({ level, onFinish }: ModeProps) {
  const story = useMemo(() => countStory(level), [level]);
  const oneAtATime = level >= 3;
  const [line, setLine] = useState(oneAtATime ? 0 : story.lines.length - 1);
  const [answering, setAnswering] = useState(false);
  if (answering) return <CountAnswer cards={story.cards} onDone={onFinish} />;
  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={styles.meta}>{oneAtATime ? T.oneAtATime : T.readAll}</Text>
      <Panel style={styles.story}>
        {story.lines.map((l, k) => {
          const visible = oneAtATime ? k === line : true;
          return visible ? (
            <Text key={k} style={styles.storyLine}>
              {l}
            </Text>
          ) : null;
        })}
      </Panel>
      {oneAtATime && line < story.lines.length - 1 ? (
        <Button title={T.nextLine} onPress={() => setLine(line + 1)} />
      ) : (
        <Button title={T.haveCount} onPress={() => setAnswering(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
  step: { minWidth: 64 },
  guess: { color: colors.text, fontSize: 36, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  verdict: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  review: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.muted, fontWeight: '600', textAlign: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.35)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold },
  stage: { alignItems: 'center', justifyContent: 'center', minHeight: 170, borderRadius: radius.md, borderWidth: 3, borderColor: 'transparent' },
  ok: { borderColor: colors.good },
  no: { borderColor: colors.bad },
  tagButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  tagButton: { flex: 1, minWidth: 90, paddingVertical: spacing(2.5) },
  choice: { minWidth: 56, flexGrow: 1 },
  colorStage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(3), minHeight: 190 },
  meter: { width: 34, height: 170, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', overflow: 'hidden' },
  meterFill: { width: '100%' },
  meterText: { position: 'absolute', top: 6, width: '100%', textAlign: 'center', color: colors.text, fontWeight: '900', fontSize: 12 },
  glow: { borderRadius: radius.md, borderWidth: 4, borderColor: 'transparent', padding: 4, shadowOpacity: 0.9, shadowRadius: 14 },
  groupRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing(1), padding: spacing(1), borderRadius: radius.md, borderWidth: 3, borderColor: 'transparent' },
  story: { gap: spacing(1) },
  storyLine: { color: colors.text, fontSize: 17, lineHeight: 25 },
});
