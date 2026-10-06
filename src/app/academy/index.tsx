import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { localDay } from '../../engine/progression';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const PREFS: LearningPreference[] = ['see', 'hear', 'do', 'read', 'mix'];

/** Counting Academy hub: pick how you like to learn, do today's workout, or any mode. */
export default function Academy() {
  const { stats, updateStats } = useSettings();
  const academy = stats.academy;
  const pref = academy.pref ?? 'mix';
  const today = localDay(new Date());
  const workout = dailyWorkout(academy.progress, today, pref);
  const doneToday = academy.lastWorkoutDay === today;

  const setPref = (p: LearningPreference) => updateStats((s) => ({ ...s, academy: { ...s.academy, pref: p } }));

  return (
    <Screen>
      <P>Five ways to learn the Hi-Lo count. Start with the style you enjoy, then mix them.</P>

      <Panel>
        <Text style={styles.label}>How do you like to learn?</Text>
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
        <Text style={styles.small}>
          Your choice only sets which exercises come first. Research finds that everyone learns best from a mix, which is why the daily workout uses
          several.
        </Text>
      </Panel>

      <Panel style={styles.workout}>
        <View style={styles.row}>
          <Text style={styles.workoutTitle}>Today's workout</Text>
          <Text style={styles.streak}>{academy.streak > 0 ? `🔥 ${academy.streak}-day streak` : 'Start a streak'}</Text>
        </View>
        <Text style={styles.small}>
          Three short exercises, mixed up. A few minutes a day beats one long session: spacing practice out helps it stick.
        </Text>
        {workout.map((id, k) => (
          <Text key={id} style={styles.step}>
            {k + 1}. {MODES.find((m) => m.id === id)!.title}
          </Text>
        ))}
        <Button
          title={doneToday ? 'Done for today. Go again' : 'Start workout'}
          onPress={() => router.push({ pathname: '/academy/[mode]', params: { mode: workout[0], workout: workout.join(','), step: '0' } })}
        />
      </Panel>

      <H2>All exercises</H2>
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
                <Text style={styles.level}>
                  Lv {p?.level ?? 1}/{MAX_LEVEL}
                </Text>
              </View>
              <Text style={styles.forWho}>
                {m.forWho}
                {due ? ' · due for review' : ''}
              </Text>
              <Text style={styles.how}>{m.how}</Text>
              <Text style={styles.why}>Why it works: {m.why}</Text>
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
