import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ColorCount, PairCancel, ReadCount, RoundResult, SoundCount, TagTap } from '../../components/academy';
import { Button, P, Panel, Screen } from '../../components/ui';
import { AcademyMode, MAX_LEVEL, MODES, academyXp, newProgress, recordRound } from '../../engine/academy';
import { levelInfo, localDay } from '../../engine/progression';
import { useSettings } from '../../state/settings';
import { colors } from '../../theme';

const COMPONENTS = { tagTap: TagTap, colorCount: ColorCount, soundCount: SoundCount, pairCancel: PairCancel, readCount: ReadCount };

/** Runs one Academy exercise, then records the result (level, review date, XP). */
export default function AcademyExercise() {
  const params = useLocalSearchParams<{ mode: AcademyMode; workout?: string; step?: string }>();
  const mode = MODES.find((m) => m.id === params.mode) ?? MODES[0];
  const workout = params.workout ? (params.workout.split(',') as AcademyMode[]) : null;
  const step = Number(params.step ?? 0);
  const { stats, updateStats } = useSettings();
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
            {workout ? `Workout ${step + 1}/${workout.length} · ` : ''}Level {progress.level}/{MAX_LEVEL}
          </P>
          <Mode key={round} level={progress.level} onFinish={finish} />
        </>
      ) : (
        <Panel style={{ alignItems: 'stretch' }}>
          <Text style={styles.big}>{Math.round(result.r.accuracy * 100)}% accurate</Text>
          {result.leveledUp ? (
            <Text style={styles.up}>★ Level up! Now level {result.modeLevel}</Text>
          ) : (
            <Text style={styles.note}>
              {result.r.accuracy >= 0.9 ? 'Top level. Keep it sharp.' : 'Score 90% or more to level up.'}
            </Text>
          )}
          <Text style={styles.note}>
            +{result.xp} XP{result.newLevel ? ` · You're now player level ${result.newLevel}!` : ''}
          </Text>
          <Text style={styles.note}>Next review: {result.due === today ? 'today' : result.due}</Text>
          {nextInWorkout ? (
            <Button
              title={`Next: ${MODES.find((m) => m.id === nextInWorkout)!.title}`}
              onPress={() => router.replace({ pathname: '/academy/[mode]', params: { mode: nextInWorkout, workout: params.workout!, step: String(step + 1) } })}
            />
          ) : (
            <>
              {workout && <Text style={styles.up}>Workout complete! See you tomorrow.</Text>}
              <Button
                title="Again"
                variant="secondary"
                onPress={() => {
                  setResult(null);
                  setRound(round + 1);
                }}
              />
              <Button title="Back to the Academy" variant="ghost" onPress={() => router.back()} />
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
