// Home: one clear next step, today's goals in a line, and a quick way to play.
import { Href, Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { PlayingCard } from '../../components/PlayingCard';

import { ListedFeature, featureInfo } from '../../components/featureInfo';
import { DailyGoalsCard, useToday } from '../../components/goals';
import { WeeklySummaryCard } from '../../components/WeeklySummaryCard';
import { Meter } from '../../components/progress/Meter';
import { Button, Screen } from '../../components/ui';
import { useUnlocks } from '../../components/useUnlocks';
import { getLessons } from '../../content/lessons';
import { dueSpots } from '../../engine/leakReview';
import { levelInfo } from '../../engine/progression';
import { BENCHMARK_TEXT, benchmarks, nextStep, readyScore } from '../../engine/progress';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    tagline: 'Learn to play perfectly and count cards',
    nextStep: 'Next step',
    lesson: (n: number, title: string) => `Lesson ${n}: ${title}`,
    continue: 'Continue',
    readyTitle: 'You’re casino-ready',
    readyBody: 'Every benchmark done. Keep sharp at the table.',
    takeSeat: 'Take a seat',
    score: (n: number) => `Casino-ready ${n}%`,
    quickPlay: 'Play a hand',
    quickPlaySub: 'Sit down at a practice table',
    newFor: (names: string, more: number) => `New for you: ${names}${more ? ` and ${more} more` : ''}`,
    level: (n: number, title: string) => `Lv ${n} · ${title}`,
    hands: 'Hands played',
    rightCalls: 'Right calls',
    levelStat: 'Level',
    review: (n: number) => `Daily review: ${n} ${n === 1 ? 'spot' : 'spots'} you missed`,
  },
  es: {
    tagline: 'Aprende a jugar perfecto y a contar cartas',
    nextStep: 'Siguiente paso',
    lesson: (n: number, title: string) => `Lección ${n}: ${title}`,
    continue: 'Continuar',
    readyTitle: 'Estás listo para el casino',
    readyBody: 'Todas las metas cumplidas. Mantente en forma en la mesa.',
    takeSeat: 'Siéntate a jugar',
    score: (n: number) => `Listo para el casino: ${n}%`,
    quickPlay: 'Jugar una mano',
    quickPlaySub: 'Siéntate en una mesa de práctica',
    newFor: (names: string, more: number) => `Nuevo para ti: ${names}${more ? ` y ${more} más` : ''}`,
    level: (n: number, title: string) => `Nv ${n} · ${title}`,
    hands: 'Manos jugadas',
    rightCalls: 'Decisiones correctas',
    levelStat: 'Nivel',
    review: (n: number) => `Repaso diario: ${n} ${n === 1 ? 'jugada que fallaste' : 'jugadas que fallaste'}`,
  },
});

export default function Home() {
  const { ready, stats, settings } = useSettings();
  const unlocks = useUnlocks();
  const today = useToday();

  // Brand-new players get the guided first hands before anything else.
  if (ready && !stats.onboarded && stats.handsPlayed === 0) return <Redirect href="/welcome" />;

  const list = benchmarks(stats);
  const score = readyScore(list);
  const next = nextStep(list, settings.experienced);
  const lvl = levelInfo(stats.xp);

  // The next step: the next lesson while there are lessons left, then the weakest benchmark.
  let title = T.readyTitle;
  let body = T.readyBody;
  let href: Href = '/tables';
  let cta = T.takeSeat;
  if (next?.id === 'lessons') {
    const lessons = getLessons();
    const i = lessons.findIndex((l) => !stats.lessonsCompleted.includes(l.id));
    const lesson = lessons[Math.max(0, i)];
    title = T.lesson(Math.max(0, i) + 1, lesson.title);
    body = lesson.summary;
    href = `/learn/${lesson.id}` as Href;
    cta = T.continue;
  } else if (next) {
    title = BENCHMARK_TEXT[next.id].title;
    body = next.detail;
    href = next.route as Href;
    cta = T.continue;
  }

  const reviewDue = dueSpots(stats.leaks, stats.leakReview, today).length;

  const fresh = unlocks.newOnes.filter((f): f is ListedFeature => f !== 'tables' && f !== 'lessons' && f !== 'tableCount');

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.tagline}>{T.tagline}</Text>
        <View style={styles.levelPill}>
          <Text style={styles.levelBig}>{T.level(lvl.level, lvl.title)}</Text>
        </View>
      </View>

      <WeeklySummaryCard />

      <View style={styles.next}>
        {/* A fanned blackjack, just for looks. */}
        <View style={styles.fan} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View style={[styles.fanCard, { transform: [{ rotate: '-12deg' }] }]}>
            <PlayingCard card={{ rank: 'A', suit: '♠' }} size="sm" />
          </View>
          <View style={[styles.fanCard, { left: 22, top: 4, transform: [{ rotate: '10deg' }] }]}>
            <PlayingCard card={{ rank: 'K', suit: '♥' }} size="sm" />
          </View>
        </View>
        <Text style={styles.eyebrow}>{T.nextStep.toUpperCase()}</Text>
        <Text style={styles.nextTitle}>{title}</Text>
        <Text style={styles.nextBody}>{body}</Text>
        {unlocks.has('ready') && (
          <View style={styles.scoreRow} accessible accessibilityLabel={T.score(score)}>
            <View style={{ flex: 1 }}>
              <Meter value={score / 100} color={colors.gold} height={8} />
            </View>
            <Text style={styles.scoreText}>{T.score(score)}</Text>
          </View>
        )}
        <Button title={cta} onPress={() => router.push(href)} style={styles.cta} />
      </View>

      <DailyGoalsCard collapsible />

      {/* Your play so far, at a glance. */}
      {stats.handsPlayed > 0 && (
        <View style={styles.stats}>
          <Stat value={stats.handsPlayed.toLocaleString('en-US')} label={T.hands} />
          <Stat
            value={stats.decisions > 0 ? `${Math.round((100 * stats.correctDecisions) / stats.decisions)}%` : '–'}
            label={T.rightCalls}
          />
          <Stat value={String(lvl.level)} label={T.levelStat} />
        </View>
      )}

      {reviewDue > 0 && unlocks.has('leaks') && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={T.review(reviewDue)}
          onPress={() => router.push('/drills/review')}
          style={({ pressed }) => [styles.newBox, pressed && { opacity: 0.85 }]}
        >
          <Icon name="leaks" size={18} color={colors.gold} />
          <Text style={[styles.newText, { marginLeft: spacing(1) }]}>{T.review(reviewDue)}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      )}

      {fresh.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/practice')}
          style={({ pressed }) => [styles.newBox, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.newText}>✦ {T.newFor(fresh.slice(0, 2).map((f) => featureInfo(f).title).join(', '), Math.max(0, fresh.length - 2))}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={T.quickPlay}
        onPress={() => router.push('/play')}
        style={({ pressed }) => [styles.quick, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
      >
        <View style={styles.quickFelt}>
          <View style={styles.quickCards} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <PlayingCard faceDown size="xs" />
            <View style={{ marginLeft: -16 }}>
              <PlayingCard card={{ rank: '10', suit: '♦' }} size="xs" />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickTitle}>{T.quickPlay}</Text>
            <Text style={styles.quickSub}>{T.quickPlaySub}</Text>
          </View>
          <Icon name="tables" size={22} color={colors.gold} />
        </View>
      </Pressable>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  tagline: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 19 },
  levelPill: {
    backgroundColor: 'rgba(232,197,71,0.14)',
    borderColor: 'rgba(232,197,71,0.45)',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  levelBig: { color: colors.gold, fontSize: 14, fontWeight: '900' },
  next: {
    backgroundColor: colors.feltDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    padding: spacing(2.5),
    gap: spacing(1.25),
    overflow: 'hidden',
  },
  fan: { position: 'absolute', top: 14, right: 18, width: 70, height: 72, opacity: 0.9 },
  fanCard: { position: 'absolute', left: 0, top: 0 },
  eyebrow: { color: colors.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  nextTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginRight: 76 },
  nextBody: { color: colors.muted, fontSize: 15, marginRight: 76 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  scoreText: { color: colors.gold, fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums'] },
  cta: { borderBottomWidth: 4, borderBottomColor: '#B8962B', marginTop: spacing(0.5) },
  newBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(232,197,71,0.12)', borderRadius: radius.md, padding: spacing(1.5) },
  newText: { color: colors.gold, fontWeight: '700', flex: 1 },
  chev: { color: colors.gold, fontSize: 22 },
  stats: { flexDirection: 'row', gap: spacing(1) },
  stat: {
    flex: 1,
    backgroundColor: colors.feltDark,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  // A little table: wood rail around the felt, rounded at the bottom like the real thing.
  quick: { backgroundColor: colors.rail, borderRadius: 18, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 5 },
  quickFelt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.felt,
    borderRadius: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2.5),
  },
  quickCards: { flexDirection: 'row', transform: [{ rotate: '-6deg' }] },
  quickTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  quickSub: { color: colors.muted, fontSize: 13 },
});
