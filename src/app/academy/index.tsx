import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SystemBadge, colorLegend } from '../../components/academy';
import { Button, H2, P, Panel, Screen } from '../../components/ui';
import {
  LearningPreference,
  MAX_LEVEL,
  PREFERENCE_LABEL,
  dailyWorkout,
  isDue,
  MODES,
  modesFor,
} from '../../engine/academy';
import { SYSTEM_NAME, systemNote } from '../../engine/counting';
import { localDay } from '../../engine/progression';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const PREFS: LearningPreference[] = ['see', 'hear', 'do', 'read', 'mix'];

const T = localized({
  en: {
    intro: (name: string) => `Five ways to learn the ${name} count. Start with the style you enjoy, then mix them.`,
    howLearn: 'How do you like to learn?',
    prefNote:
      'Your choice only sets which exercises come first. Research finds that everyone learns best from a mix, which is why the daily workout uses several.',
    workoutTitle: 'Today’s workout',
    streak: (n: number) => `🔥 ${n}-day streak`,
    startStreak: 'Start a streak',
    workoutNote: 'Three short exercises, mixed up. A few minutes a day beats one long session: spacing practice out helps it stick.',
    goAgain: 'Done for today. Go again',
    startWorkout: 'Start workout',
    allExercises: 'All exercises',
    level: (n: number, max: number) => `Lv ${n}/${max}`,
    levelA11y: (n: number, max: number) => `Level ${n} of ${max}`,
    due: ' · due for review',
    why: (w: string) => `Why it works: ${w}`,
  },
  es: {
    intro: (name: string) => `Cinco formas de aprender el conteo ${name}. Empieza con el estilo que más te guste y luego combínalos.`,
    howLearn: '¿Cómo te gusta aprender?',
    prefNote:
      'Tu elección solo define qué ejercicios salen primero. Las investigaciones muestran que todos aprendemos mejor combinando, por eso el entrenamiento diario usa varios.',
    workoutTitle: 'Entrenamiento de hoy',
    streak: (n: number) => `🔥 Racha de ${n} ${n === 1 ? 'día' : 'días'}`,
    startStreak: 'Empieza una racha',
    workoutNote: 'Tres ejercicios cortos, mezclados. Unos minutos al día valen más que una sesión larga: espaciar la práctica ayuda a recordar.',
    goAgain: 'Listo por hoy. Otra vez',
    startWorkout: 'Empezar entrenamiento',
    allExercises: 'Todos los ejercicios',
    level: (n: number, max: number) => `Nv ${n}/${max}`,
    levelA11y: (n: number, max: number) => `Nivel ${n} de ${max}`,
    due: ' · toca repasar',
    why: (w: string) => `Por qué funciona: ${w}`,
  },
});

/** Counting Academy hub: pick how you like to learn, do today's workout, or any mode. */
export default function Academy() {
  const { stats, updateStats, settings } = useSettings();
  const system = settings.countingSystem;
  const academy = stats.academy;
  const pref = academy.pref ?? 'mix';
  const today = localDay(new Date());
  const workout = dailyWorkout(academy.progress, today, pref);
  const doneToday = academy.lastWorkoutDay === today;

  const setPref = (p: LearningPreference) => updateStats((s) => ({ ...s, academy: { ...s.academy, pref: p } }));

  return (
    <Screen>
      <P>{T.intro(SYSTEM_NAME[system])}</P>
      <SystemBadge />
      <Text style={styles.small}>
        {colorLegend(system, settings.colorblind)}. {systemNote(system)}
      </Text>

      <Panel>
        <Text style={styles.label}>{T.howLearn}</Text>
        <View style={styles.chips}>
          {PREFS.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: p === pref }}
              onPress={() => setPref(p)}
              style={[styles.chip, p === pref && styles.chipOn]}
            >
              <Text style={[styles.chipText, p === pref && { color: colors.black }]}>{PREFERENCE_LABEL[p]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.small}>{T.prefNote}</Text>
      </Panel>

      <Panel style={styles.workout}>
        <View style={styles.row}>
          <Text style={styles.workoutTitle}>{T.workoutTitle}</Text>
          <Text style={styles.streak}>{academy.streak > 0 ? T.streak(academy.streak) : T.startStreak}</Text>
        </View>
        <Text style={styles.small}>{T.workoutNote}</Text>
        {workout.map((id, k) => (
          <Text key={id} style={styles.step}>
            {k + 1}. {MODES.find((m) => m.id === id)!.title}
          </Text>
        ))}
        <Button
          title={doneToday ? T.goAgain : T.startWorkout}
          onPress={() => router.push({ pathname: '/academy/[mode]', params: { mode: workout[0], workout: workout.join(','), step: '0' } })}
        />
      </Panel>

      <H2>{T.allExercises}</H2>
      {modesFor(pref).map((m) => {
        const p = academy.progress[m.id];
        const due = isDue(p, today) && (p?.played ?? 0) > 0;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/academy/[mode]', params: { mode: m.id } })}
            style={({ pressed }) => [styles.mode, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.row}>
                <Text style={styles.modeTitle}>{m.title}</Text>
                <Text style={styles.level} accessibilityLabel={T.levelA11y(p?.level ?? 1, MAX_LEVEL)}>
                  {T.level(p?.level ?? 1, MAX_LEVEL)}
                </Text>
              </View>
              <Text style={styles.forWho}>
                {m.forWho}
                {due ? T.due : ''}
              </Text>
              <Text style={styles.how}>{m.how}</Text>
              <Text style={styles.why}>{T.why(m.why)}</Text>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '700', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  chip: { borderWidth: 1.5, borderColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.gold },
  chipText: { color: colors.gold, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  workout: { borderWidth: 2, borderColor: colors.gold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(1) },
  workoutTitle: { color: colors.gold, fontSize: 18, fontWeight: '900' },
  streak: { color: colors.text, fontWeight: '700' },
  step: { color: colors.text, fontSize: 15 },
  mode: { backgroundColor: colors.feltDark, borderRadius: radius.md, padding: spacing(2) },
  modeTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  level: { color: colors.gold, fontWeight: '800' },
  forWho: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  how: { color: colors.text, fontSize: 14, lineHeight: 20 },
  why: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
