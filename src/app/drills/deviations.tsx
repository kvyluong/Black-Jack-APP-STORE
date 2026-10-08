// Count Plays trainer: flash cards for the plays that change with the true count,
// with Leitner spaced review saved to stats.deviations.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { playSound } from '../../audio/sounds';
import { HandView } from '../../components/HandView';
import { PlayingCard } from '../../components/PlayingCard';
import { Button, H2, P, Panel, Screen } from '../../components/ui';
import { useOutcomeColors } from '../../components/useColors';
import { SYSTEM_NAME } from '../../engine/counting';
import {
  Choice,
  DECK,
  LEARNED_BOX,
  Question,
  answerFor,
  buildSession,
  cardLabel,
  choiceLabel,
  choicesFor,
  dayText,
  deckCard,
  indexFor,
  indexPrompt,
  isCorrect,
  learnedCount,
  nextReviewDay,
  playAtIndex,
  review,
  ruleText,
  signed,
} from '../../engine/deviations';
import { localDay } from '../../engine/progression';
import type { DeviationProgress } from '../../engine/records';
import { Rules } from '../../engine/rules';
import { basicAction } from '../../engine/strategy';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    introTitle: 'Count plays',
    intro1: 'A few hands are played differently when the count is high or low. At a true count of +3 or more, take insurance. At 0 or more, stand on 16 against a 10.',
    intro2: 'You’ll learn them a few at a time, most valuable first. Get one right and it comes back later; miss it and you’ll see it again soon.',
    hiLoNote: (system: string) => `These indexes are for Hi-Lo. You count with ${system}, so your own indexes differ; switch to Hi-Lo in Settings to use them at the table.`,
    start: 'Start session',
    again: 'Another session',
    status: (learned: number, total: number) => `${learned} of ${total} plays learned`,
    nextReview: (when: string) => `Next review: ${when}`,
    progress: (n: number, total: number) => `Card ${n} of ${total}`,
    score: (right: number, total: number) => `${right}/${total} correct`,
    trueCount: 'True count',
    dealerShows: 'Dealer shows',
    you: 'You',
    noSurrender: 'Surrender isn’t offered on this hand.',
    insuranceAsk: 'The dealer shows an Ace. Insurance?',
    playIt: 'Play it',
    nameIt: 'Name the index',
    correct: '✓ Correct',
    wrongPlay: (play: string) => `✗ The right play is ${play}`,
    wrongIndex: (i: string) => `✗ The index is ${i}`,
    next: 'Next',
    finish: 'See results',
    doneTitle: 'Session done',
    seeAll: 'See all plays',
    hideAll: 'Hide plays',
    colPlay: 'Play',
    colIndex: 'Index',
    colState: 'Status',
    newCard: 'New',
    box: (n: number) => `Box ${n}`,
    learned: '✓ Learned',
    indexLabel: (n: number) => `True count ${n >= 0 ? 'plus' : 'minus'} ${Math.abs(n)}`,
  },
  es: {
    introTitle: 'Jugadas por conteo',
    intro1: 'Algunas manos se juegan distinto cuando el conteo está alto o bajo. Con un conteo real de +3 o más, toma el seguro. Con 0 o más, plántate con 16 contra un 10.',
    intro2: 'Las aprenderás de a poco, empezando por las más valiosas. Si aciertas una, vuelve más adelante; si fallas, la verás de nuevo pronto.',
    hiLoNote: (system: string) => `Estos índices son para Hi-Lo. Tú cuentas con ${system}, así que tus índices son otros; cambia a Hi-Lo en Ajustes para usarlos en la mesa.`,
    start: 'Empezar sesión',
    again: 'Otra sesión',
    status: (learned: number, total: number) => `${learned} de ${total} jugadas aprendidas`,
    nextReview: (when: string) => `Próximo repaso: ${when}`,
    progress: (n: number, total: number) => `Tarjeta ${n} de ${total}`,
    score: (right: number, total: number) => `${right}/${total} correctas`,
    trueCount: 'Conteo real',
    dealerShows: 'El crupier muestra',
    you: 'Tú',
    noSurrender: 'En esta mano no se puede rendirse.',
    insuranceAsk: 'El crupier muestra un As. ¿Seguro?',
    playIt: 'Juégala',
    nameIt: 'Di el índice',
    correct: '✓ Correcto',
    wrongPlay: (play: string) => `✗ La jugada correcta es ${play}`,
    wrongIndex: (i: string) => `✗ El índice es ${i}`,
    next: 'Siguiente',
    finish: 'Ver resultados',
    doneTitle: 'Sesión terminada',
    seeAll: 'Ver todas las jugadas',
    hideAll: 'Ocultar jugadas',
    colPlay: 'Jugada',
    colIndex: 'Índice',
    colState: 'Estado',
    newCard: 'Nueva',
    box: (n: number) => `Caja ${n}`,
    learned: '✓ Aprendida',
    indexLabel: (n: number) => `Conteo real ${n >= 0 ? 'más' : 'menos'} ${Math.abs(n)}`,
  },
});

type Phase = 'start' | 'quiz' | 'done';

export default function DeviationsScreen() {
  const { settings, stats, updateStats } = useSettings();
  const { rules } = settings;
  const progress: DeviationProgress = stats.deviations ?? { cards: {} };
  const [phase, setPhase] = useState<Phase>('start');
  const [today, setToday] = useState(() => localDay(new Date()));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Choice | number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  // Cards already answered this session: only the first answer can move a card up a box.
  const [answered, setAnswered] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const start = () => {
    const day = localDay(new Date());
    setToday(day);
    setQuestions(buildSession(progress, day, rules));
    setStep(0);
    setPicked(null);
    setResults([]);
    setAnswered([]);
    setShowAll(false);
    setPhase('quiz');
  };

  const choose = (c: Choice | number) => {
    if (picked !== null) return;
    const q = questions[step];
    const ok = isCorrect(q, c, rules);
    const promote = !answered.includes(q.id);
    setPicked(c);
    setResults([...results, ok]);
    if (promote) setAnswered([...answered, q.id]);
    if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong');
    updateStats((s) => {
      const cards = s.deviations?.cards ?? {};
      return { ...s, deviations: { ...s.deviations, cards: { ...cards, [q.id]: review(cards[q.id], ok, today, promote) } } };
    });
  };

  const next = () => {
    setPicked(null);
    if (step + 1 >= questions.length) setPhase('done');
    else setStep(step + 1);
  };

  const hiLoNote = settings.countingSystem !== 'hiLo' && (
    <Panel style={styles.note}>
      <P>{T.hiLoNote(SYSTEM_NAME[settings.countingSystem])}</P>
    </Panel>
  );
  const status = (
    <>
      <P>{T.status(learnedCount(progress), DECK.length)}</P>
      <P muted>{T.nextReview(dayText(nextReviewDay(progress, today), today))}</P>
    </>
  );
  const reference = (
    <>
      <Button title={showAll ? T.hideAll : T.seeAll} variant="ghost" onPress={() => setShowAll(!showAll)} />
      {showAll && <PlaysTable progress={progress} rules={rules} />}
    </>
  );

  if (phase === 'quiz') {
    const q = questions[step];
    return (
      <Screen>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{T.progress(step + 1, questions.length)}</Text>
          <Text style={styles.score}>{T.score(results.filter(Boolean).length, results.length)}</Text>
        </View>
        {hiLoNote}
        <QuestionView key={step} q={q} rules={rules} picked={picked} onPick={choose} onNext={next} last={step + 1 >= questions.length} />
      </Screen>
    );
  }

  if (phase === 'done') {
    const right = results.filter(Boolean).length;
    return (
      <Screen>
        <Panel>
          <H2>{T.doneTitle}</H2>
          <Text style={styles.big}>{T.score(right, results.length)}</Text>
          {status}
          <Button title={T.again} onPress={start} />
        </Panel>
        {hiLoNote}
        {reference}
      </Screen>
    );
  }

  const firstTime = Object.keys(progress.cards).length === 0;
  return (
    <Screen>
      {firstTime ? (
        <Panel>
          <H2>{T.introTitle}</H2>
          <P>{T.intro1}</P>
          <P muted>{T.intro2}</P>
        </Panel>
      ) : (
        <Panel>{status}</Panel>
      )}
      {hiLoNote}
      <Button title={T.start} onPress={start} />
      {reference}
    </Screen>
  );
}

/** One flash card: "play it" (hand + true count) or "name the index". */
function QuestionView({
  q,
  rules,
  picked,
  onPick,
  onNext,
  last,
}: {
  q: Question;
  rules: Rules;
  picked: Choice | number | null;
  onPick: (c: Choice | number) => void;
  onNext: () => void;
  last: boolean;
}) {
  const { good, bad } = useOutcomeColors();
  const card = deckCard(q.id);
  const index = indexFor(card, rules);
  let ok = false;
  let feedback: { title: string; reason?: string } | null = null;
  let body;

  if (q.kind === 'play') {
    const { answer, reason } = answerFor(card, q.cards, q.dealerUp.rank, q.trueCount, rules);
    ok = picked === answer;
    if (picked !== null) feedback = { title: ok ? T.correct : T.wrongPlay(choiceLabel(answer)), reason };
    // Basic strategy would surrender here, but this card drills the hit/stand index.
    const surrenderHidden =
      !!card.dev && !card.surrender && rules.lateSurrender &&
      basicAction({ cards: q.cards, dealerUp: q.dealerUp.rank, rules, canDouble: true, canSplit: true, canSurrender: true }) === 'surrender';
    body = (
      <>
        <Text style={styles.kind}>{T.playIt}</Text>
        <View style={styles.tcBox} accessible accessibilityLabel={`${T.trueCount} ${signed(q.trueCount)}`}>
          <Text style={styles.tcLabel}>{T.trueCount}</Text>
          <Text style={styles.tcValue}>{signed(q.trueCount)}</Text>
        </View>
        <View style={styles.table}>
          <Text style={styles.label}>{T.dealerShows}</Text>
          <PlayingCard card={q.dealerUp} />
          <View style={{ height: spacing(2) }} />
          <HandView cards={q.cards} label={T.you} />
        </View>
        {!card.dev && <P style={styles.center}>{T.insuranceAsk}</P>}
        {surrenderHidden && <P muted style={styles.center}>{T.noSurrender}</P>}
        <View style={styles.actions}>
          {choicesFor(card, q.cards).map((c) => (
            <Button
              key={c}
              title={choiceLabel(c)}
              variant={picked !== null && c === answer ? 'primary' : picked === c ? 'danger' : 'secondary'}
              onPress={() => onPick(c)}
              style={styles.actionButton}
            />
          ))}
        </View>
      </>
    );
  } else {
    ok = picked === index;
    if (picked !== null) feedback = { title: ok ? T.correct : T.wrongIndex(signed(index)) };
    body = (
      <>
        <Text style={styles.kind}>{T.nameIt}</Text>
        <Panel>
          <Text style={styles.prompt}>{indexPrompt(card)}</Text>
        </Panel>
        <View style={styles.actions}>
          {q.choices.map((n) => (
            <Button
              key={n}
              title={signed(n)}
              accessibilityLabel={T.indexLabel(n)}
              variant={picked !== null && n === index ? 'primary' : picked === n ? 'danger' : 'secondary'}
              onPress={() => onPick(n)}
              style={styles.indexButton}
            />
          ))}
        </View>
      </>
    );
  }

  return (
    <>
      {body}
      {feedback && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
          <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 17 }} accessibilityLiveRegion="polite">
            {feedback.title}
          </Text>
          {feedback.reason && <Text style={styles.reason}>{feedback.reason}</Text>}
          <Text style={styles.rule}>{ruleText(card, rules)}</Text>
          <Button title={last ? T.finish : T.next} onPress={onNext} />
        </Panel>
      )}
    </>
  );
}

/** Reference table: every play, its index, and how well you know it. */
function PlaysTable({ progress, rules }: { progress: DeviationProgress; rules: Rules }) {
  const { good } = useOutcomeColors();
  return (
    <Panel>
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cell, styles.head, { flex: 2 }]}>{T.colPlay}</Text>
        <Text style={[styles.cell, styles.head, styles.num]}>{T.colIndex}</Text>
        <Text style={[styles.cell, styles.head, styles.stateCol]}>{T.colState}</Text>
      </View>
      {DECK.map((c) => {
        const mem = progress.cards[c.id];
        const learned = !!mem && mem.box >= LEARNED_BOX;
        return (
          <View key={c.id} style={styles.row}>
            <View style={{ flex: 2 }}>
              <Text style={styles.cell}>{cardLabel(c)}</Text>
              <Text style={styles.sub}>{choiceLabel(playAtIndex(c))}</Text>
            </View>
            <Text style={[styles.cell, styles.num]}>{signed(indexFor(c, rules))}</Text>
            <Text style={[styles.cell, styles.stateCol, learned && { color: good }]}>
              {!mem ? T.newCard : learned ? T.learned : T.box(mem.box)}
            </Text>
          </View>
        );
      })}
    </Panel>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  score: { color: colors.gold, fontWeight: '700' },
  note: { borderLeftWidth: 4, borderLeftColor: colors.warn },
  big: { color: colors.text, fontSize: 28, fontWeight: '800' },
  kind: { color: colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  tcBox: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.feltDark,
    borderRadius: radius.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3),
  },
  tcLabel: { color: colors.muted, fontSize: 13 },
  tcValue: { color: colors.gold, fontSize: 32, fontWeight: '800' },
  table: { alignItems: 'center', paddingVertical: spacing(1) },
  label: { color: colors.muted, marginBottom: spacing(1) },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  actionButton: { minWidth: 96, flexGrow: 1 },
  indexButton: { minWidth: 64, flexGrow: 1 },
  prompt: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  reason: { color: colors.text, fontSize: 15, lineHeight: 22 },
  rule: { color: colors.gold, fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(0.75), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.muted },
  headRow: { paddingTop: 0 },
  head: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  cell: { color: colors.text, fontSize: 15 },
  sub: { color: colors.muted, fontSize: 13 },
  num: { width: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stateCol: { width: 96, textAlign: 'right' },
});
