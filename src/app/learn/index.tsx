import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { H2, P, Screen } from '../../components/ui';
import { getLessons, LessonUnit, UNIT_LABEL } from '../../content/lessons';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const UNITS: LessonUnit[] = ['Basics', 'Strategy', 'Counting'];

const T = localized({
  en: {
    intro: 'Work through the lessons in order. Each one ends with a short quiz.',
    a11y: (n: number, title: string, done: boolean) => `Lesson ${n}: ${title}${done ? ', completed' : ''}`,
  },
  es: {
    intro: 'Sigue las lecciones en orden. Cada una termina con un breve cuestionario.',
    a11y: (n: number, title: string, done: boolean) => `Lección ${n}: ${title}${done ? ', completada' : ''}`,
  },
});

export default function LessonList() {
  const { stats } = useSettings();
  const lessons = getLessons();
  return (
    <Screen>
      <P muted>{T.intro}</P>
      {UNITS.map((unit) => (
        <View key={unit} style={{ gap: spacing(1) }}>
          <H2>{UNIT_LABEL[unit]}</H2>
          {lessons.filter((l) => l.unit === unit).map((l) => {
            const n = lessons.indexOf(l) + 1;
            const done = stats.lessonsCompleted.includes(l.id);
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityLabel={T.a11y(n, l.title, done)}
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
