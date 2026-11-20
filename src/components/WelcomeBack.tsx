// Welcome back: after a week or more away, Home opens with a short warm-up from the
// lessons you finished last and a "pick up where you left off" button.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLessons } from '../content/lessons';
import { WARMUP_SIZE, lastLesson, returningAway, warmupQuestions } from '../engine/checkpoint';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';
import { useToday } from './goals';
import { nextStepTarget } from './nextStepTarget';
import { Button } from './ui';

const T = localized({
  en: {
    eyebrow: 'WELCOME BACK',
    title: (days: number) => `It’s been ${days} days`,
    body: (n: number, lesson: string) => `Warm up with ${n} quick ${n === 1 ? 'question' : 'questions'} from “${lesson}” and the lessons before it, then pick up where you left off.`,
    bodyNoLessons: 'Pick up where you left off. A few hands will bring it back.',
    warmup: (n: number) => `Warm up: ${n} ${n === 1 ? 'question' : 'questions'}`,
    pickUp: 'Pick up where you left off',
    pickUpA11y: (step: string) => `Pick up where you left off: ${step}`,
    dismissA11y: 'Dismiss the welcome back card',
  },
  es: {
    eyebrow: 'BIENVENIDO DE NUEVO',
    title: (days: number) => `Han pasado ${days} días`,
    body: (n: number, lesson: string) =>
      `Calienta con ${n} ${n === 1 ? 'pregunta rápida' : 'preguntas rápidas'} de «${lesson}» y las lecciones anteriores, y luego sigue donde lo dejaste.`,
    bodyNoLessons: 'Sigue donde lo dejaste. Unas manos te pondrán al día.',
    warmup: (n: number) => `Calentamiento: ${n} ${n === 1 ? 'pregunta' : 'preguntas'}`,
    pickUp: 'Sigue donde lo dejaste',
    pickUpA11y: (step: string) => `Sigue donde lo dejaste: ${step}`,
    dismissA11y: 'Cerrar la bienvenida',
  },
});

/** Days away to welcome back from, and how to clear the welcome. */
export function useWelcomeBack() {
  const { stats, updateStats } = useSettings();
  const today = useToday();
  const started = stats.handsPlayed > 0 || stats.lessonsCompleted.length > 0;
  const away = returningAway(stats.goals, today, started);
  const dismiss = () => updateStats((s) => ({ ...s, goals: { ...s.goals, returned: null } }));
  return { away, dismiss };
}

export function WelcomeBackCard() {
  const { stats, settings } = useSettings();
  const { away, dismiss } = useWelcomeBack();
  if (away === null) return null;
  const lessons = getLessons();
  const questions = warmupQuestions(lessons, stats.lessonsCompleted, WARMUP_SIZE);
  const last = lastLesson(lessons, stats.lessonsCompleted);
  const next = nextStepTarget(stats, settings.experienced);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.eyebrow}>{T.eyebrow}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {T.title(away)}
          </Text>
        </View>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={T.dismissA11y}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.body}>{questions.length && last ? T.body(questions.length, last.title) : T.bodyNoLessons}</Text>
      {questions.length > 0 && <Button title={T.warmup(questions.length)} onPress={() => router.push('/warmup')} />}
      <Button
        title={T.pickUp}
        accessibilityLabel={T.pickUpA11y(next.title)}
        variant={questions.length > 0 ? 'secondary' : 'primary'}
        onPress={() => {
          dismiss();
          router.push(next.href);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.feltDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.45)',
    padding: spacing(2),
    gap: spacing(1.25),
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  eyebrow: { color: colors.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'flex-start' },
  closeText: { color: colors.muted, fontSize: 18, fontWeight: '700' },
});
