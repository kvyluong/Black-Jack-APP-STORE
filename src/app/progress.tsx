// Your Progress: strategy accuracy, hands played, full-deck speed and casino-conditions grades over time.
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToday } from '../components/goals';
import { Chart, Datum, niceMax } from '../components/progress/Chart';
import { Button, H2, P, Panel, Screen } from '../components/ui';
import {
  DECK_TARGET_MS,
  accuracyByDay,
  bestDeckTimeline,
  currentStreak,
  daysBetween,
  formatSeconds,
  handsByDay,
  historyWithToday,
  shortDay,
} from '../engine/progress';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const T = localized({
  en: {
    emptyTitle: 'Your charts start here',
    emptyBody: 'Play a few hands or try a drill. Each day you practice adds a point to these charts, so you can watch yourself improve.',
    play: 'Play a few hands',
    drills: 'Try a drill',
    accuracyAll: 'Accuracy',
    handsWeek: 'Hands, last 7 days',
    bestDeck: 'Best full deck',
    streak: 'Goal streak',
    days: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
    accTitle: 'Strategy accuracy per day',
    accSub: 'Last 30 days · table and strategy drill · goal 99%',
    accEmpty: 'No decisions in the last 30 days yet. Play a hand or two to start this chart.',
    accReadout: (p: number, right: number, total: number) => `${p}% (${right}/${total})`,
    accSummaryOne: (p: number, day: string) => `Strategy accuracy: ${p}% on ${day}.`,
    accSummary: (a: number, b: number, days: number) =>
      `Strategy accuracy ${b > a ? 'rose' : b < a ? 'fell' : 'held'} from ${a}% to ${b}% over ${days} days.`,
    goal99: '99% goal',
    handsTitle: 'Hands played per day',
    handsSub: 'Last 14 days',
    handsEmpty: 'No hands in the last two weeks.',
    handsReadout: (n: number) => `${n} ${n === 1 ? 'hand' : 'hands'}`,
    handsSummary: (total: number, best: number) => `${total} hands in the last 14 days; best day ${best}.`,
    deckTitle: 'Best full-deck count time',
    deckSub: 'Each new record for an exact 52-card count · goal 30 s',
    deckEmpty: 'Count a full deck exactly in the running count drill to set your first time.',
    deckDrill: 'Running count drill',
    deckSummaryOne: (t: string) => `Best full-deck time: ${t}.`,
    deckSummary: (a: string, b: string, n: number) => `Best full-deck time improved from ${a} to ${b} over ${n} records.`,
    goal30: '30 s goal',
    examTitle: 'Casino conditions grades',
    examSub: 'Your last 10 tests · ✓ passed, ✗ not passed',
    examEmpty: 'Take the casino conditions test to see your grades here.',
    exam: 'Take the test',
    examReadout: (g: number, passed: boolean) => `Grade ${g} · ${passed ? '✓ passed' : '✗ not passed'}`,
    examSummary: (n: number, last: number, best: number, passed: number) =>
      `${n} ${n === 1 ? 'test' : 'tests'}. Latest grade ${last}, best ${best}, passed ${passed}.`,
  },
  es: {
    emptyTitle: 'Tus gráficas empiezan aquí',
    emptyBody: 'Juega unas manos o prueba un ejercicio. Cada día que practicas suma un punto a estas gráficas para que veas cómo mejoras.',
    play: 'Juega unas manos',
    drills: 'Prueba un ejercicio',
    accuracyAll: 'Precisión',
    handsWeek: 'Manos, últimos 7 días',
    bestDeck: 'Mejor baraja completa',
    streak: 'Racha de metas',
    days: (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`,
    accTitle: 'Precisión de estrategia por día',
    accSub: 'Últimos 30 días · mesa y ejercicio de estrategia · meta 99%',
    accEmpty: 'Aún no hay decisiones en los últimos 30 días. Juega una o dos manos para empezar esta gráfica.',
    accReadout: (p: number, right: number, total: number) => `${p}% (${right}/${total})`,
    accSummaryOne: (p: number, day: string) => `Precisión de estrategia: ${p}% el ${day}.`,
    accSummary: (a: number, b: number, days: number) =>
      `La precisión de estrategia ${b > a ? 'subió' : b < a ? 'bajó' : 'se mantuvo'} de ${a}% a ${b}% en ${days} días.`,
    goal99: 'meta 99%',
    handsTitle: 'Manos jugadas por día',
    handsSub: 'Últimos 14 días',
    handsEmpty: 'No hay manos en las últimas dos semanas.',
    handsReadout: (n: number) => `${n} ${n === 1 ? 'mano' : 'manos'}`,
    handsSummary: (total: number, best: number) => `${total} manos en los últimos 14 días; mejor día ${best}.`,
    deckTitle: 'Mejor tiempo contando una baraja completa',
    deckSub: 'Cada nuevo récord de un conteo exacto de 52 cartas · meta 30 s',
    deckEmpty: 'Cuenta una baraja completa sin errores en el ejercicio de conteo continuo para registrar tu primer tiempo.',
    deckDrill: 'Ejercicio de conteo continuo',
    deckSummaryOne: (t: string) => `Mejor tiempo con baraja completa: ${t}.`,
    deckSummary: (a: string, b: string, n: number) => `Tu mejor tiempo con baraja completa mejoró de ${a} a ${b} en ${n} récords.`,
    goal30: 'meta 30 s',
    examTitle: 'Calificaciones en condiciones de casino',
    examSub: 'Tus últimas 10 pruebas · ✓ aprobada, ✗ no aprobada',
    examEmpty: 'Haz la prueba en condiciones de casino para ver aquí tus calificaciones.',
    exam: 'Hacer la prueba',
    examReadout: (g: number, passed: boolean) => `Calificación ${g} · ${passed ? '✓ aprobada' : '✗ no aprobada'}`,
    examSummary: (n: number, last: number, best: number, passed: number) =>
      `${n} ${n === 1 ? 'prueba' : 'pruebas'}. Última calificación ${last}, mejor ${best}, aprobadas ${passed}.`,
  },
});

export default function ProgressScreen() {
  const { stats } = useSettings();
  const today = useToday();
  const points = historyWithToday(stats, today);
  const exams = stats.exams ?? [];
  const deckTimes = bestDeckTimeline(points);
  const isNew = stats.decisions === 0 && stats.handsPlayed === 0 && deckTimes.length === 0 && exams.length === 0;

  const accAll = stats.decisions ? `${Math.round((100 * stats.correctDecisions) / stats.decisions)}%` : '—';
  const week = handsByDay(points, today, 7).reduce((a, d) => a + (d.value ?? 0), 0);
  const best = stats.countRecords?.bestDeckMs;
  const streak = currentStreak(stats.goals, today);

  return (
    <Screen>
      <View style={styles.tiles}>
        <Tile label={T.accuracyAll} value={accAll} />
        <Tile label={T.handsWeek} value={String(week)} />
        <Tile label={T.bestDeck} value={best ? formatSeconds(best) : '—'} />
        <Tile label={T.streak} value={`🔥 ${T.days(streak)}`} />
      </View>

      {isNew ? (
        <Panel style={styles.empty}>
          <Text style={styles.emptyTitle}>📈 {T.emptyTitle}</Text>
          <P muted>{T.emptyBody}</P>
          <Button title={T.play} onPress={() => router.push('/tables')} />
          <Button title={T.drills} variant="secondary" onPress={() => router.push('/drills')} />
        </Panel>
      ) : (
        <>
          <AccuracyChart points={points} today={today} />
          <HandsChart points={points} today={today} />
          <DeckChart times={deckTimes} />
          <ExamChart exams={exams} />
        </>
      )}
    </Screen>
  );
}

type Points = ReturnType<typeof historyWithToday>;

function AccuracyChart({ points, today }: { points: Points; today: string }) {
  const days = accuracyByDay(points, today, 30);
  const shown = days.filter((d) => d.value !== null);
  const vals = shown.map((d) => d.value!);
  // Trim the scale to the data (dots, not bars, so a non-zero baseline is honest), in steps of 10.
  const min = vals.length ? Math.max(0, Math.min(80, Math.floor((Math.min(...vals) - 1) / 10) * 10)) : 80;
  const round = (v: number) => Math.floor(v);
  const data: Datum[] = days.map((d) => ({
    key: d.day,
    value: d.value,
    label: shortDay(d.day),
    readout: d.value === null ? '' : T.accReadout(round(d.value), d.right!, d.total!),
  }));
  const first = shown[0];
  const last = shown[shown.length - 1];
  const summary = !first
    ? T.accEmpty
    : first === last
      ? T.accSummaryOne(round(first.value!), shortDay(first.day))
      : T.accSummary(round(first.value!), round(last.value!), daysBetween(first.day, last.day) + 1);
  return (
    <ChartPanel title={T.accTitle} sub={T.accSub}>
      {first ? (
        <Chart
          data={data}
          kind="dot"
          min={min}
          max={100}
          ticks={[min, (min + 100) / 2, 100]}
          formatTick={(v) => `${Math.round(v)}%`}
          summary={summary}
          reference={{ value: 99, label: T.goal99 }}
        />
      ) : (
        <P muted style={styles.small}>
          {T.accEmpty}
        </P>
      )}
    </ChartPanel>
  );
}

function HandsChart({ points, today }: { points: Points; today: string }) {
  const days = handsByDay(points, today, 14);
  const vals = days.map((d) => d.value ?? 0);
  const total = vals.reduce((a, b) => a + b, 0);
  const max = niceMax(Math.max(...vals));
  const data: Datum[] = days.map((d) => ({ key: d.day, value: d.value, label: shortDay(d.day), readout: T.handsReadout(d.value ?? 0) }));
  return (
    <ChartPanel title={T.handsTitle} sub={T.handsSub}>
      {total > 0 ? (
        <Chart
          data={data}
          kind="column"
          max={max}
          ticks={[0, max / 2, max]}
          formatTick={(v) => String(Math.round(v))}
          summary={T.handsSummary(total, Math.max(...vals))}
        />
      ) : (
        <P muted style={styles.small}>
          {T.handsEmpty}
        </P>
      )}
    </ChartPanel>
  );
}

function DeckChart({ times }: { times: { day: string; ms: number }[] }) {
  const max = niceMax(Math.max(DECK_TARGET_MS, ...times.map((t) => t.ms)) / 1000) * 1000;
  const data: Datum[] = times.slice(-12).map((t) => ({ key: t.day, value: t.ms, label: shortDay(t.day), readout: formatSeconds(t.ms) }));
  const first = times[0];
  const last = times[times.length - 1];
  return (
    <ChartPanel title={T.deckTitle} sub={T.deckSub}>
      {first ? (
        <Chart
          data={data}
          kind="dot"
          max={max}
          ticks={[0, max / 2, max]}
          formatTick={(v) => `${Math.round(v / 1000)} s`}
          summary={
            times.length === 1 ? T.deckSummaryOne(formatSeconds(last.ms)) : T.deckSummary(formatSeconds(first.ms), formatSeconds(last.ms), times.length)
          }
          reference={{ value: DECK_TARGET_MS, label: T.goal30 }}
        />
      ) : (
        <>
          <P muted style={styles.small}>
            {T.deckEmpty}
          </P>
          <Button title={T.deckDrill} variant="secondary" onPress={() => router.push('/drills/count')} />
        </>
      )}
    </ChartPanel>
  );
}

function ExamChart({ exams }: { exams: { day: string; grade: number; passed: boolean }[] }) {
  // Chart the last 10; the summary covers every saved test.
  const shown = exams.slice(-10);
  const data: Datum[] = shown.map((e, i) => ({
    key: `${e.day}-${i}`,
    value: e.grade,
    label: shortDay(e.day),
    readout: T.examReadout(Math.round(e.grade), e.passed),
    badge: e.passed ? '✓' : '✗',
  }));
  const grades = exams.map((e) => Math.round(e.grade));
  return (
    <ChartPanel title={T.examTitle} sub={T.examSub}>
      {exams.length ? (
        <Chart
          data={data}
          kind="column"
          max={100}
          ticks={[0, 50, 100]}
          formatTick={(v) => String(v)}
          summary={T.examSummary(exams.length, grades[grades.length - 1], Math.max(...grades), exams.filter((e) => e.passed).length)}
        />
      ) : (
        <>
          <P muted style={styles.small}>
            {T.examEmpty}
          </P>
          <Button title={T.exam} variant="secondary" onPress={() => router.push('/exam')} />
        </>
      )}
    </ChartPanel>
  );
}

function ChartPanel({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <>
      <H2>{title}</H2>
      <Panel>
        <Text style={styles.sub}>{sub}</Text>
        {children}
      </Panel>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: spacing(1.5),
    gap: 2,
  },
  tileValue: { color: colors.gold, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileLabel: { color: colors.muted, fontSize: 13 },
  empty: { borderWidth: 1, borderColor: 'rgba(232,197,71,0.45)' },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 13 },
  small: { fontSize: 14, lineHeight: 20 },
});
