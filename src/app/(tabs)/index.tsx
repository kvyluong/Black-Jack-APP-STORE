// Home: one clear next step, today's goals in a line, and a quick way to play.
import { Href, Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ListedFeature, featureInfo } from '../../components/featureInfo';
import { DailyGoalsCard } from '../../components/goals';
import { Meter } from '../../components/progress/Meter';
import { Button, P, Screen } from '../../components/ui';
import { useUnlocks } from '../../components/useUnlocks';
import { getLessons } from '../../content/lessons';
import { formatChips, levelInfo } from '../../engine/progression';
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
    newFor: (names: string, more: number) => `New for you: ${names}${more ? ` and ${more} more` : ''}`,
    level: (n: number, title: string) => `Lv ${n} · ${title}`,
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
    newFor: (names: string, more: number) => `Nuevo para ti: ${names}${more ? ` y ${more} más` : ''}`,
    level: (n: number, title: string) => `Nv ${n} · ${title}`,
  },
});

export default function Home() {
  const { ready, stats, settings } = useSettings();
  const unlocks = useUnlocks();

  // Brand-new players get the guided first hands before anything else.
  if (ready && !stats.onboarded && stats.handsPlayed === 0) return <Redirect href="/welcome" />;

  const list = benchmarks(stats);
  const score = readyScore(list);
  const next = nextStep(list);
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

  const fresh = unlocks.newOnes.filter((f): f is ListedFeature => f !== 'tables' && f !== 'lessons' && f !== 'tableCount');

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logo}>♠ ♥ ♣ ♦</Text>
          <P muted style={{ fontSize: 14 }}>
            {T.tagline}
          </P>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.chips}>${formatChips(settings.bankroll)}</Text>
          <Text style={styles.level}>{T.level(lvl.level, lvl.title)}</Text>
        </View>
      </View>

      <View style={styles.next}>
        <Text style={styles.eyebrow}>{T.nextStep}</Text>
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
        <Button title={cta} onPress={() => router.push(href)} />
      </View>

      <DailyGoalsCard collapsible />

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

      <Button title={`🃏  ${T.quickPlay}`} variant="secondary" onPress={() => router.push('/play')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  logo: { color: colors.gold, fontSize: 18, letterSpacing: 4 },
  chips: { color: colors.gold, fontSize: 20, fontWeight: '900' },
  level: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  next: { backgroundColor: colors.feltDark, borderRadius: radius.lg, padding: spacing(2.5), gap: spacing(1.25), borderWidth: 2, borderColor: colors.gold },
  eyebrow: { color: colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  nextTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  nextBody: { color: colors.muted, fontSize: 15 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  scoreText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  newBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(232,197,71,0.12)', borderRadius: radius.md, padding: spacing(1.5), borderWidth: 1, borderColor: 'rgba(232,197,71,0.4)' },
  newText: { color: colors.gold, fontWeight: '700', flex: 1 },
  chev: { color: colors.gold, fontSize: 22 },
});
