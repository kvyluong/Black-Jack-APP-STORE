import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { H2, P, Screen } from '../../components/ui';
import { LESSONS, Lesson } from '../../content/lessons';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const UNITS: Lesson['unit'][] = ['Basics', 'Strategy', 'Counting'];

export default function LessonList() {
  const { stats } = useSettings();
  return (
    <Screen>
      <P muted>Work through the lessons in order. Each one ends with a short quiz.</P>
      {UNITS.map((unit) => (
        <View key={unit} style={{ gap: spacing(1) }}>
          <H2>{unit}</H2>
          {LESSONS.filter((l) => l.unit === unit).map((l) => {
            const n = LESSONS.indexOf(l) + 1;
            const done = stats.lessonsCompleted.includes(l.id);
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/learn/[id]', params: { id: l.id } })}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.badge, done && styles.badgeDone]}>
                  <Text style={[styles.badgeText, done && { color: colors.black }]}>{done ? '✓' : n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{l.title}</Text>
                  <Text style={styles.summary}>{l.summary}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.feltDark,
    padding: spacing(1.5),
    borderRadius: radius.md,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: colors.gold },
  badgeText: { color: colors.gold, fontWeight: '800' },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  summary: { color: colors.muted, fontSize: 14, marginTop: 2 },
});
