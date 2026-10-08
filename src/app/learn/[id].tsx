import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayingCard } from '../../components/PlayingCard';
import { Button, H2, P, Panel, Screen } from '../../components/ui';
import { getLesson, getLessons } from '../../content/lessons';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

const T = localized({
  en: {
    notFound: 'Lesson not found.',
    quiz: 'Quiz',
    correct: '✓ Correct. ',
    wrong: '✗ Not quite. Try again. ',
    complete: 'Lesson complete! 🎉',
    next: (title: string) => `Next: ${title}`,
  },
  es: {
    notFound: 'No se encontró la lección.',
    quiz: 'Cuestionario',
    correct: '✓ ¡Correcto! ',
    wrong: '✗ No exactamente. Inténtalo de nuevo. ',
    complete: '¡Lección completada! 🎉',
    next: (title: string) => `Siguiente: ${title}`,
  },
});

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // useSettings() re-renders this screen when the language changes; getLesson reads the current one.
  const { updateStats } = useSettings();
  const lesson = getLesson(id);
  const { good, bad } = useOutcomeColors();
  const [answers, setAnswers] = useState<Record<number, number>>({});

  if (!lesson) {
    return (
      <Screen>
        <P>{T.notFound}</P>
      </Screen>
    );
  }

  const allCorrect = lesson.quiz.every((q, i) => answers[i] === q.answer);
  const lessons = getLessons();
  const next = lessons[lessons.indexOf(lesson) + 1];

  const choose = (qi: number, oi: number) => {
    if (answers[qi] === lesson.quiz[qi].answer) return;
    const updated = { ...answers, [qi]: oi };
    setAnswers(updated);
    if (lesson.quiz.every((q, i) => updated[i] === q.answer)) {
      updateStats((s) =>
        s.lessonsCompleted.includes(lesson.id) ? s : { ...s, lessonsCompleted: [...s.lessonsCompleted, lesson.id] },
      );
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.title }} />
      {lesson.sections.map((sec, i) => (
        <View key={i} style={{ gap: spacing(1) }}>
          {sec.heading && <H2>{sec.heading}</H2>}
          <P>{sec.body}</P>
          {sec.cards && (
            <View style={styles.cards}>
              {sec.cards.map((rank, j) => (
                <PlayingCard key={j} card={{ rank, suit: (['♠', '♥', '♣', '♦'] as const)[j % 4] }} size="sm" showTag={sec.showTags} tagSystem="hiLo" />
              ))}
            </View>
          )}
        </View>
      ))}

      <H2>{T.quiz}</H2>
      {lesson.quiz.map((q, qi) => {
        const picked = answers[qi];
        const answered = picked !== undefined;
        const correct = picked === q.answer;
        return (
          <Panel key={qi}>
            <Text style={styles.question}>{q.question}</Text>
            <View style={styles.options}>
              {q.options.map((opt, oi) => (
                <Button
                  key={oi}
                  title={opt}
                  variant={answered && oi === picked ? (correct ? 'primary' : 'danger') : 'secondary'}
                  onPress={() => choose(qi, oi)}
                  style={{ flexGrow: 1 }}
                />
              ))}
            </View>
            {answered && (
              <Text style={{ color: correct ? good : bad, fontSize: 15 }}>
                {correct ? T.correct : T.wrong}
                {correct ? q.explanation : ''}
              </Text>
            )}
          </Panel>
        );
      })}

      {allCorrect && (
        <Panel style={{ borderColor: colors.gold, borderWidth: 1 }}>
          <Text style={styles.done}>{T.complete}</Text>
          {lesson.practice && (
            <Button title={lesson.practice.label} onPress={() => router.push(lesson.practice!.href)} />
          )}
          {next && (
            <Button
              title={T.next(next.title)}
              variant="secondary"
              onPress={() => router.replace({ pathname: '/learn/[id]', params: { id: next.id } })}
            />
          )}
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  question: { color: colors.text, fontSize: 17, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  done: { color: colors.gold, fontSize: 18, fontWeight: '800', textAlign: 'center' },
});
