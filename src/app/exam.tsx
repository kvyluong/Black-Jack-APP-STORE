// Casino Conditions test: one full shoe with no help, then a report card.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DiscardTray } from '../components/table/DiscardTray';
import { ExamHooks, TableScreen } from '../components/table/TableScreen';
import { Button, H2, P, Panel, Screen, STEP_LABEL } from '../components/ui';
import { useOutcomeColors } from '../components/useColors';
import { SYSTEM_NAME, isBalanced } from '../engine/counting';
import { CARDS_PER_DECK, formatDecks, questionFor, scoreDeckGuess } from '../engine/decks';
import {
  BetRecord,
  DECK_QUIZZES,
  EXAM_STACK_UNITS,
  ExamInput,
  PASS,
  addExam,
  deckQuizDue,
  deckQuizPoints,
  examResult,
  gradeExam,
} from '../engine/exam';
import { GameState, currentTrueCount } from '../engine/game';
import { localDay } from '../engine/progression';
import { formatTrueCount } from '../engine/strategy';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const T = localized({
  en: {
    decimal: '.',
    title: 'The final exam',
    intro:
      'Play one full shoe, until the cut card comes out, the way you would in a casino. No hints, no count on screen, and no corrections until the end.',
    rules: [
      'You choose every bet. Raise with the count and bet the minimum when it’s neutral or negative.',
      'Twice during the shoe you’ll be asked how many decks are left. Read the discard tray.',
      'At the end, give the running count and (for balanced systems) the true count.',
      'The dealer is quicker than at practice, and the other players talk.',
    ],
    countPlays: 'Count plays (Hi-Lo index numbers) are graded.',
    noCountPlays: (system: string) => `Basic strategy is graded (count plays are Hi-Lo only; you count with ${system}).`,
    chips: (units: number) => `You play with ${units} units of test chips. Your real chips aren’t touched.`,
    passMarks: 'To pass',
    marks: (balanced: boolean) =>
      [
        'Running count exactly right',
        balanced ? 'True count within ±1' : null,
        'Playing decisions at least 95% right',
        'Bet score at least 0.7',
        'Decks-left estimates within half a deck on average',
      ].filter((x): x is string => x !== null),
    start: 'Start the shoe',
    last: (grade: number, passed: boolean) => `Last test: ${grade}/100 · ${passed ? 'passed ✓' : 'not passed ✗'}`,
    decksQ: 'How many decks are left?',
    decksHint: 'Look at the discard tray. Answer in half decks.',
    decksA11y: (d: string) => `${d} decks left`,
    shoeOver: 'The cut card is out. End of the shoe.',
    rcQ: 'What’s the running count?',
    tcQ: 'And the true count?',
    tcHint: 'Running count ÷ decks left, to the nearest whole number.',
    submit: 'Submit',
    passed: 'PASSED ✓',
    notYet: 'NOT YET ✗',
    grade: (n: number) => `${n} / 100`,
    hands: 'Hands played',
    play: 'Playing decisions',
    count: 'Running count',
    countVal: (guess: string, actual: string) => `You said ${guess} · actual ${actual}`,
    trueCount: 'True count',
    bets: 'Bet score',
    betHint: 'Your bet vs the count’s bet each round (1.00 = always right).',
    decks: 'Decks left',
    decksVal: (err: string) => `Off by ${err} decks on average`,
    skipped: 'Not asked',
    need: (mark: string) => `Pass: ${mark}`,
    exact: 'exact',
    within: (n: string) => `within ${n}`,
    atLeast: (n: string) => `${n} or more`,
    again: 'Try again',
    leaks: 'See Your Leaks',
    back: 'Back to Road to the Casino',
  },
  es: {
    decimal: ',',
    title: 'El examen final',
    intro:
      'Juega un zapato completo, hasta que salga la carta de corte, como lo harías en un casino. Sin pistas, sin conteo en pantalla y sin correcciones hasta el final.',
    rules: [
      'Tú eliges cada apuesta. Sube con el conteo y apuesta el mínimo cuando sea neutral o negativo.',
      'Dos veces durante el zapato te preguntaremos cuántas barajas quedan. Mira la bandeja de descartes.',
      'Al final, di el conteo continuo y (en sistemas balanceados) el conteo real.',
      'El crupier reparte más rápido que en la práctica y los demás jugadores conversan.',
    ],
    countPlays: 'Se califican las jugadas por conteo (índices de Hi-Lo).',
    noCountPlays: (system: string) =>
      `Se califica la estrategia básica (las jugadas por conteo son solo para Hi-Lo; tú cuentas con ${system}).`,
    chips: (units: number) => `Juegas con ${units} unidades de fichas de prueba. Tus fichas reales no se tocan.`,
    passMarks: 'Para aprobar',
    marks: (balanced: boolean) =>
      [
        'Conteo continuo exacto',
        balanced ? 'Conteo real con un margen de ±1' : null,
        'Al menos 95% de decisiones correctas',
        'Puntaje de apuestas de 0,7 o más',
        'Estimaciones de barajas restantes con un error promedio de media baraja o menos',
      ].filter((x): x is string => x !== null),
    start: 'Empezar el zapato',
    last: (grade: number, passed: boolean) => `Último examen: ${grade}/100 · ${passed ? 'aprobado ✓' : 'no aprobado ✗'}`,
    decksQ: '¿Cuántas barajas quedan?',
    decksHint: 'Mira la bandeja de descartes. Responde en medias barajas.',
    decksA11y: (d: string) => `Quedan ${d} barajas`,
    shoeOver: 'Salió la carta de corte. Fin del zapato.',
    rcQ: '¿Cuál es el conteo continuo?',
    tcQ: '¿Y el conteo real?',
    tcHint: 'Conteo continuo ÷ barajas restantes, al número entero más cercano.',
    submit: 'Enviar',
    passed: 'APROBADO ✓',
    notYet: 'AÚN NO ✗',
    grade: (n: number) => `${n} / 100`,
    hands: 'Manos jugadas',
    play: 'Decisiones de juego',
    count: 'Conteo continuo',
    countVal: (guess: string, actual: string) => `Dijiste ${guess} · real ${actual}`,
    trueCount: 'Conteo real',
    bets: 'Puntaje de apuestas',
    betHint: 'Tu apuesta frente a la que pedía el conteo en cada ronda (1,00 = siempre correcta).',
    decks: 'Barajas restantes',
    decksVal: (err: string) => `Error promedio de ${err} barajas`,
    skipped: 'No se preguntó',
    need: (mark: string) => `Para aprobar: ${mark}`,
    exact: 'exacto',
    within: (n: string) => `margen de ${n}`,
    atLeast: (n: string) => `${n} o más`,
    again: 'Intentar de nuevo',
    leaks: 'Ver tus fugas',
    back: 'Volver a Camino al casino',
  },
});

type Phase = 'intro' | 'table' | 'count' | 'true' | 'report';

/** What the test collects during the shoe. */
interface Tally {
  hands: number;
  decisions: number;
  correct: number;
  bets: BetRecord[];
  deckErrors: number[];
  /** Cards dealt after which a decks-left question comes up. */
  deckPoints: number[];
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
/** A decimal in the app language (Spanish uses a comma). */
const num = (n: number, digits = 2) => n.toFixed(digits).replace('.', T.decimal);

export default function ExamScreen() {
  const { ready, settings, stats, updateStats } = useSettings();
  const { rules, countingSystem } = settings;
  const balanced = isBalanced(countingSystem);
  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState(0);
  const [tally, setTally] = useState<Tally>(() => freshTally(rules.decks * CARDS_PER_DECK, rules.penetration));
  const [final, setFinal] = useState<GameState | null>(null);
  const [rcGuess, setRcGuess] = useState(0);
  const [tcGuess, setTcGuess] = useState(0);
  const [input, setInput] = useState<ExamInput | null>(null);

  const start = () => {
    setTally(freshTally(rules.decks * CARDS_PER_DECK, rules.penetration));
    setFinal(null);
    setRcGuess(0);
    setTcGuess(0);
    setInput(null);
    setAttempt((n) => n + 1);
    setPhase('table');
  };

  const hooks: ExamHooks = {
    onBet: (units, ideal) => setTally((t) => ({ ...t, bets: [...t.bets, { units, ideal }] })),
    onDecision: (ok) => setTally((t) => ({ ...t, decisions: t.decisions + 1, correct: t.correct + (ok ? 1 : 0) })),
    onRoundEnd: (hands) => setTally((t) => ({ ...t, hands: t.hands + hands })),
    onShoeEnd: (g) => {
      setFinal(g);
      setPhase('count');
    },
    gate: (g) => {
      const dealt = g.shoeSize - g.shoe.length;
      const asked = tally.deckErrors.length;
      if (!deckQuizDue(dealt, tally.deckPoints, asked)) return null;
      return (
        <DecksLeftQuestion
          key={asked}
          decks={g.rules.decks}
          dealt={dealt}
          onAnswer={(error) => setTally((t) => ({ ...t, deckErrors: [...t.deckErrors, error] }))}
        />
      );
    },
  };

  /** Grades the shoe and saves the result. */
  const finish = (trueGuess: number | null) => {
    if (!final) return;
    const x: ExamInput = {
      hands: tally.hands,
      decisions: tally.decisions,
      correct: tally.correct,
      bets: tally.bets,
      countGuess: rcGuess,
      countActual: final.runningCount,
      trueGuess,
      trueActual: trueGuess === null ? null : currentTrueCount(final),
      deckErrors: tally.deckErrors,
    };
    setInput(x);
    const result = examResult(x, gradeExam(x), localDay(new Date()));
    updateStats((s) => ({ ...s, exams: addExam(s.exams ?? [], result) }));
    setPhase('report');
  };

  if (!ready) return <Screen>{null}</Screen>;

  if (phase === 'table') {
    return (
      <TableScreen
        key={attempt}
        mode="exam"
        exam={hooks}
      />
    );
  }

  if (phase === 'count' || phase === 'true') {
    const rc = phase === 'count';
    return (
      <Screen>
        <Panel>
          <Text style={styles.center}>{T.shoeOver}</Text>
          <Text style={styles.question}>{rc ? T.rcQ : T.tcQ}</Text>
          {!rc && <P muted>{T.tcHint}</P>}
          <Stepper value={rc ? rcGuess : tcGuess} onChange={rc ? setRcGuess : setTcGuess} big={rc && !balanced} />
          <Button
            title={T.submit}
            onPress={() => (rc && balanced ? setPhase('true') : finish(rc ? null : tcGuess))}
          />
        </Panel>
      </Screen>
    );
  }

  if (phase === 'report' && input) {
    return <ReportCard input={input} onAgain={start} />;
  }

  const last = stats.exams?.[stats.exams.length - 1];
  return (
    <Screen>
      <H2>{T.title}</H2>
      <P>{T.intro}</P>
      <Panel>
        {T.rules.map((r) => (
          <Text key={r} style={styles.bullet}>
            • {r}
          </Text>
        ))}
        <Text style={styles.bullet}>
          • {countingSystem === 'hiLo' ? T.countPlays : T.noCountPlays(SYSTEM_NAME[countingSystem])}
        </Text>
        <Text style={styles.bullet}>• {T.chips(EXAM_STACK_UNITS)}</Text>
      </Panel>
      <Panel>
        <Text style={styles.label}>{T.passMarks}</Text>
        {T.marks(balanced).map((m) => (
          <Text key={m} style={styles.bullet}>
            ✓ {m}
          </Text>
        ))}
      </Panel>
      {last && <P muted>{T.last(last.grade, last.passed)}</P>}
      <Button title={T.start} onPress={start} />
    </Screen>
  );
}

const freshTally = (shoeSize: number, penetration: number): Tally => ({
  hands: 0,
  decisions: 0,
  correct: 0,
  bets: [],
  deckErrors: [],
  deckPoints: deckQuizPoints(shoeSize, penetration).slice(0, DECK_QUIZZES),
});

/** −/+ answer picker (with ±5 steps for big KO counts). */
function Stepper({ value, onChange, big }: { value: number; onChange: (n: number) => void; big?: boolean }) {
  return (
    <View style={styles.stepper}>
      {big && (
        <Button title="−5" accessibilityLabel={`${STEP_LABEL.down} (5)`} variant="ghost" onPress={() => onChange(value - 5)} />
      )}
      <Button title="−" accessibilityLabel={STEP_LABEL.down} variant="ghost" onPress={() => onChange(value - 1)} />
      <Text style={styles.guess} accessibilityLiveRegion="polite">
        {signed(value)}
      </Text>
      <Button title="+" accessibilityLabel={STEP_LABEL.up} variant="ghost" onPress={() => onChange(value + 1)} />
      {big && (
        <Button title="+5" accessibilityLabel={`${STEP_LABEL.up} (5)`} variant="ghost" onPress={() => onChange(value + 5)} />
      )}
    </View>
  );
}

/** Between rounds: "How many decks are left?" from the tray, no feedback until the report. */
function DecksLeftQuestion({ decks, dealt, onAnswer }: { decks: number; dealt: number; onAnswer: (error: number) => void }) {
  // Fixed for this question (the choices are shuffled once).
  const [q] = useState(() => questionFor(decks, dealt));
  return (
    <Panel>
      <Text style={styles.question}>{T.decksQ}</Text>
      <P muted>{T.decksHint}</P>
      <DiscardTray cards={dealt} decks={decks} deckPx={14} />
      <View style={styles.choices}>
        {q.choices.map((c) => (
          <Button
            key={c}
            title={formatDecks(c)}
            accessibilityLabel={T.decksA11y(formatDecks(c))}
            variant="secondary"
            style={styles.choice}
            onPress={() => onAnswer(scoreDeckGuess(c, q.exact).error)}
          />
        ))}
      </View>
    </Panel>
  );
}

/** The report card after the shoe. */
function ReportCard({ input, onAgain }: { input: ExamInput; onAgain: () => void }) {
  const { lang } = useSettings();
  const { good, bad } = useOutcomeColors();
  const r = useMemo(() => gradeExam(input), [input]);
  const rows = useMemo(
    () => [
      { label: T.hands, value: String(r.hands), ok: null, need: null },
      {
        label: T.play,
        value: `${Math.round(r.playAccuracy * 100)}% (${input.correct}/${input.decisions})`,
        ok: r.checks.play,
        need: T.atLeast(`${PASS.playAccuracy * 100}%`),
      },
      {
        label: T.count,
        value: T.countVal(signed(input.countGuess), signed(input.countActual)),
        ok: r.checks.count,
        need: T.exact,
      },
      {
        label: T.trueCount,
        value:
          input.trueGuess === null || input.trueActual === null
            ? T.skipped
            : T.countVal(signed(input.trueGuess), formatTrueCount(input.trueActual)),
        ok: r.checks.trueCount,
        need: T.within(`±${PASS.trueError}`),
      },
      { label: T.bets, value: num(r.betScore), ok: r.checks.bet, need: T.atLeast(num(PASS.betScore, 1)), hint: T.betHint },
      {
        label: T.decks,
        value: r.deckError === null ? T.skipped : T.decksVal(num(r.deckError)),
        ok: r.checks.decks,
        need: T.within(formatDecks(PASS.deckError)),
      },
    ],
    // `lang`: the labels follow the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r, input, lang],
  );
  const verdict = r.passed ? good : bad;
  return (
    <Screen>
      <Panel style={{ ...styles.verdict, borderColor: verdict }}>
        <Text style={[styles.verdictText, { color: verdict }]}>{r.passed ? T.passed : T.notYet}</Text>
        <Text style={styles.grade}>{T.grade(r.grade)}</Text>
      </Panel>
      <Panel>
        {rows.map((row) => {
          const color = row.ok === null ? colors.text : row.ok ? good : bad;
          const a11y = [row.label, row.value, row.need ? T.need(row.need) : ''].filter(Boolean).join('. ');
          return (
            <View key={row.label} style={styles.row} accessible accessibilityLabel={a11y}>
              <Text style={[styles.mark, { color }]}>{row.ok === null ? '•' : row.ok ? '✓' : '✗'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={[styles.value, { color }]}>{row.value}</Text>
                {row.need && <Text style={styles.need}>{T.need(row.need)}</Text>}
                {'hint' in row && row.hint && <Text style={styles.need}>{row.hint}</Text>}
              </View>
            </View>
          );
        })}
      </Panel>
      <Button title={T.again} onPress={onAgain} />
      <Button title={T.leaks} variant="secondary" onPress={() => router.push('/leaks')} />
      <Button title={T.back} variant="ghost" onPress={() => router.navigate('/ready')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { color: colors.muted, textAlign: 'center' },
  question: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  bullet: { color: colors.text, fontSize: 15, lineHeight: 22 },
  label: { color: colors.gold, fontWeight: '800', fontSize: 15 },
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center', alignItems: 'center' },
  guess: { color: colors.text, fontSize: 28, fontWeight: '800', minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  choice: { minWidth: 56, flexGrow: 1 },
  verdict: { borderWidth: 2, alignItems: 'center' },
  verdictText: { fontSize: 24, fontWeight: '900' },
  grade: { color: colors.text, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: spacing(1.5), paddingVertical: spacing(1), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.muted },
  mark: { fontSize: 20, fontWeight: '900', width: 22, textAlign: 'center' },
  value: { fontSize: 16, fontWeight: '700' },
  need: { color: colors.muted, fontSize: 13 },
});
