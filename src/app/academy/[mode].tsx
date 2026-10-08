import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ColorCount, PairCancel, ReadCount, RoundResult, SoundCount, SystemBadge, TagTap } from '../../components/academy';
import { Button, P, Panel, Screen } from '../../components/ui';
import { AcademyMode, MAX_LEVEL, MODES, academyXp, newProgress, recordRound } from '../../engine/academy';
import { levelInfo, localDay } from '../../engine/progression';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors } from '../../theme';

const T = localized({
  en: {
    progress: (step: number, total: number | null, level: number, max: number) =>
      `${total ? `Workout ${step}/${total} · ` : ''}Level ${level}/${max}`,
    accurate: (pct: number) => `${pct}% accurate`,
    levelUp: (n: number) => `★ Level up! Now level ${n}`,
    topLevel: 'Top level. Keep it sharp.',
    scoreToLevel: 'Score 90% or more to level up.',
    xp: (xp: number, newLevel?: number) => `+${xp} XP${newLevel ? ` · You’re now player level ${newLevel}!` : ''}`,
    nextReview: (due: string | null) => `Next review: ${due ?? 'today'}`,
    next: (title: string) => `Next: ${title}`,
    workoutDone: 'Workout complete! See you tomorrow.',
    again: 'Again',
    back: 'Back to the Academy',
  },
  es: {
    progress: (step: number, total: number | null, level: number, max: number) =>
      `${total ? `Entrenamiento ${step}/${total} · ` : ''}Nivel ${level}/${max}`,
    accurate: (pct: number) => `${pct}% de aciertos`,
    levelUp: (n: number) => `★ ¡Subiste de nivel! Ahora nivel ${n}`,
    topLevel: 'Nivel máximo. Mantente en forma.',
    scoreToLevel: 'Consigue 90% o más para subir de nivel.',
    xp: (xp: number, newLevel?: number) => `+${xp} XP${newLevel ? ` · ¡Ya eres jugador nivel ${newLevel}!` : ''}`,
    nextReview: (due: string | null) => `Próximo repaso: ${due ?? 'hoy'}`,
    next: (title: string) => `Siguiente: ${title}`,
    workoutDone: '¡Entrenamiento completo! Nos vemos mañana.',
    again: 'Otra vez',
    back: 'Volver a la Academia',
  },
});

const COMPONENTS = { tagTap: TagTap, colorCount: ColorCount, soundCount: SoundCount, pairCancel: PairCancel, readCount: ReadCount };

/** Runs one Academy exercise, then records the result (level, review date, XP). */
export default function AcademyExercise() {
  const params = useLocalSearchParams<{ mode: AcademyMode; workout?: string; step?: string }>();
  const mode = MODES.find((m) => m.id === params.mode) ?? MODES[0];
  const workout = params.workout ? (params.workout.split(',') as AcademyMode[]) : null;
  const step = Number(params.step ?? 0);
  const { stats, updateStats, settings } = useSettings();
  const today = localDay(new Date());
  const progress = stats.academy.progress[mode.id] ?? newProgress(today);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ r: RoundResult; leveledUp: boolean; modeLevel: number; xp: number; due: string; newLevel?: number } | null>(null);
  const Mode = COMPONENTS[mode.id];

  const finish = (r: RoundResult) => {
    const { progress: next, leveledUp } = recordRound(progress, r.accuracy, today);
    const xp = academyXp(r.correct, progress.level);
    const lastStep = workout && step === workout.length - 1;
    const before = levelInfo(stats.xp).level;
    updateStats((s) => {
      const finishedWorkout = lastStep && s.academy.lastWorkoutDay !== today;
      const yesterday = localDay(new Date(Date.now() - 86400000));
      return {
        ...s,
        xp: s.xp + xp,
        academy: {
          ...s.academy,
          progress: { ...s.academy.progress, [mode.id]: next },
          ...(finishedWorkout
            ? { lastWorkoutDay: today, streak: s.academy.lastWorkoutDay === yesterday ? s.academy.streak + 1 : 1 }
            : {}),
        },
      };
    });
    const after = levelInfo(stats.xp + xp).level;
    setResult({ r, leveledUp, modeLevel: next.level, xp, due: next.due, newLevel: after > before ? after : undefined });
  };

  const nextInWorkout = workout && step < workout.length - 1 ? workout[step + 1] : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: mode.title }} />
      {!result ? (
        <>
          <P muted style={{ textAlign: 'center' }}>
            {T.progress(step + 1, workout ? workout.length : null, progress.level, MAX_LEVEL)}
          </P>
          <SystemBadge />
          <Mode key={`${round}-${settings.countingSystem}`} level={progress.level} onFinish={finish} />
        </>
      ) : (
        <Panel style={{ alignItems: 'stretch' }}>
          <Text style={styles.big}>{T.accurate(Math.round(result.r.accuracy * 100))}</Text>
          {result.leveledUp ? (
            <Text style={styles.up}>{T.levelUp(result.modeLevel)}</Text>
          ) : (
            <Text style={styles.note}>
              {result.r.accuracy >= 0.9 ? T.topLevel : T.scoreToLevel}
            </Text>
          )}
          <Text style={styles.note}>{T.xp(result.xp, result.newLevel)}</Text>
          <Text style={styles.note}>{T.nextReview(result.due === today ? null : result.due)}</Text>
          {nextInWorkout ? (
            <Button
              title={T.next(MODES.find((m) => m.id === nextInWorkout)!.title)}
              onPress={() => router.replace({ pathname: '/academy/[mode]', params: { mode: nextInWorkout, workout: params.workout!, step: String(step + 1) } })}
            />
          ) : (
            <>
              {workout && <Text style={styles.up}>{T.workoutDone}</Text>}
              <Button
                title={T.again}
                variant="secondary"
                onPress={() => {
                  setResult(null);
                  setRound(round + 1);
                }}
              />
              <Button title={T.back} variant="ghost" onPress={() => router.back()} />
            </>
          )}
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  up: { color: colors.gold, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  note: { color: colors.muted, textAlign: 'center' },
});
