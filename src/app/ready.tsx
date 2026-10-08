// Road to the Casino: "Am I ready for a real casino?" as a score and a checklist of benchmarks.
import { Href, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Meter } from '../components/progress/Meter';
import { Button, H2, P, Panel, Screen } from '../components/ui';
import { useOutcomeColors } from '../components/useColors';
import { SYSTEM_NAME } from '../engine/counting';
import { BENCHMARK_TEXT, Benchmark, benchmarks, nextStep, readyHeadline, readyScore, weightsText } from '../engine/progress';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const T = localized({
  en: {
    question: 'Am I ready for a real casino?',
    score: 'Casino-ready score',
    scoreA11y: (n: number, headline: string) => `Casino-ready score ${n} out of 100. ${headline}`,
    nextLabel: 'NEXT STEP',
    readyBody: 'Every benchmark is done. Keep your skills sharp with a daily workout, and always play within your means.',
    practice: 'Practice',
    practiceA11y: (title: string) => `Practice ${title}`,
    done: '✓ Done',
    inProgress: '◐ In progress',
    notStarted: '○ Not started',
    benchmarks: 'Benchmarks',
    how: (w: string) => `How the score works: a weighted average of your progress on each benchmark (${w}). It reaches 100 only when every benchmark is done.`,
    hiLoNote: (system: string) => `You count with ${system}, but count plays use Hi-Lo true count indices. Learn them as Hi-Lo plays.`,
    cardA11y: (title: string, status: string, p: number, detail: string) => `${title}. ${status}. ${p} percent. ${detail}`,
  },
  es: {
    question: '¿Estoy listo para un casino de verdad?',
    score: 'Puntaje para el casino',
    scoreA11y: (n: number, headline: string) => `Puntaje para el casino: ${n} de 100. ${headline}`,
    nextLabel: 'SIGUIENTE PASO',
    readyBody: 'Cumpliste todas las metas. Mantén tus habilidades con un entrenamiento diario y juega siempre dentro de tus posibilidades.',
    practice: 'Practicar',
    practiceA11y: (title: string) => `Practicar ${title}`,
    done: '✓ Listo',
    inProgress: '◐ En progreso',
    notStarted: '○ Sin empezar',
    benchmarks: 'Metas',
    how: (w: string) => `Cómo se calcula: un promedio ponderado de tu progreso en cada meta (${w}). Solo llega a 100 cuando cumples todas.`,
    hiLoNote: (system: string) => `Cuentas con ${system}, pero las jugadas por conteo usan índices de conteo real Hi-Lo. Apréndelas como jugadas Hi-Lo.`,
    cardA11y: (title: string, status: string, p: number, detail: string) => `${title}. ${status}. ${p} por ciento. ${detail}`,
  },
});

const go = (b: Benchmark) => router.push(b.route as Href);

export default function ReadyScreen() {
  const { stats, settings } = useSettings();
  const list = benchmarks(stats);
  const score = readyScore(list);
  const next = nextStep(list);
  const headline = readyHeadline(list);
  const hiLoNote = settings.countingSystem !== 'hiLo' ? T.hiLoNote(SYSTEM_NAME[settings.countingSystem]) : null;

  return (
    <Screen>
      <Panel style={styles.hero}>
        <Text style={styles.question}>{T.question}</Text>
        <View style={styles.scoreRow} accessible accessibilityLabel={T.scoreA11y(score, headline)}>
          <Text style={styles.score}>{score}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.scoreLabel}>{T.score}</Text>
            <Meter value={score / 100} height={10} />
            <Text style={styles.headline}>{headline}</Text>
          </View>
        </View>
        {next ? (
          <View style={styles.next}>
            <Text style={styles.label}>{T.nextLabel}</Text>
            <Text style={styles.nextTitle}>{BENCHMARK_TEXT[next.id].title}</Text>
            <P muted style={styles.small}>
              {BENCHMARK_TEXT[next.id].goal}
            </P>
            <P style={styles.small}>{next.detail}</P>
            <Button title={T.practice} accessibilityLabel={T.practiceA11y(BENCHMARK_TEXT[next.id].title)} onPress={() => go(next)} />
          </View>
        ) : (
          <P>🏆 {T.readyBody}</P>
        )}
      </Panel>

      <H2>{T.benchmarks}</H2>
      {list.map((b) => (
        <BenchmarkCard key={b.id} b={b} isNext={b.id === next?.id} note={b.id === 'deviations' ? hiLoNote : null} />
      ))}

      <P muted style={styles.small}>
        {T.how(weightsText())}
      </P>
    </Screen>
  );
}

function BenchmarkCard({ b, isNext, note }: { b: Benchmark; isNext: boolean; note: string | null }) {
  const { good } = useOutcomeColors();
  const text = BENCHMARK_TEXT[b.id];
  const p = Math.floor(b.progress * 100);
  const status = b.done ? T.done : b.started ? T.inProgress : T.notStarted;
  const statusColor = b.done ? good : b.started ? colors.gold : colors.muted;
  return (
    <Panel style={isNext ? styles.cardNext : undefined}>
      <View accessible accessibilityLabel={T.cardA11y(text.title, status, p, b.detail)} style={{ gap: 6 }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{text.title}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        </View>
        <Text style={styles.goal}>{text.goal}</Text>
        <View style={styles.meterRow}>
          <View style={{ flex: 1 }}>
            <Meter value={b.progress} color={b.done ? good : colors.gold} />
          </View>
          <Text style={styles.pct}>{p}%</Text>
        </View>
        <Text style={styles.detail}>{b.detail}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.why}>{text.why}</Text>
        <Button
          title={T.practice}
          variant={isNext ? 'primary' : 'secondary'}
          accessibilityLabel={T.practiceA11y(text.title)}
          onPress={() => go(b)}
          style={styles.practice}
        />
      </View>
      {note && <Text style={styles.note}>ⓘ {note}</Text>}
    </Panel>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 2, borderColor: colors.gold, gap: spacing(1.5) },
  question: { color: colors.text, fontSize: 20, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  score: { color: colors.gold, fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'], minWidth: 72, textAlign: 'center' },
  scoreLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  headline: { color: colors.text, fontSize: 16, fontWeight: '700' },
  next: { backgroundColor: colors.feltDark, borderRadius: radius.md, padding: spacing(1.5), gap: 6 },
  label: { color: colors.gold, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  nextTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  small: { fontSize: 14, lineHeight: 20 },
  cardNext: { borderWidth: 1, borderColor: 'rgba(232,197,71,0.6)' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing(1) },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  status: { fontSize: 13, fontWeight: '800' },
  goal: { color: colors.muted, fontSize: 14 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  pct: { color: colors.text, fontWeight: '800', fontSize: 14, minWidth: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  detail: { color: colors.text, fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), marginTop: 4 },
  why: { flex: 1, color: colors.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  practice: { paddingVertical: spacing(1), paddingHorizontal: spacing(1.5) },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
