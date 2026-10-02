import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayingCard } from '../../components/PlayingCard';
import { Button, H2, P, Panel, Screen } from '../../components/ui';
import { LESSONS, getLesson } from '../../content/lessons';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = getLesson(id);
  const { updateStats } = useSettings();
  const [answers, setAnswers] = useState<Record<number, number>>({});

  if (!lesson) {
    return (
      <Screen>
        <P>Lesson not found.</P>
      </Screen>
    );
  }

  const allCorrect = lesson.quiz.every((q, i) => answers[i] === q.answer);
  const next = LESSONS[LESSONS.indexOf(lesson) + 1];

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
                <PlayingCard key={j} card={{ rank, suit: (['♠', '♥', '♣', '♦'] as const)[j % 4] }} size="sm" showTag={sec.showTags} />
              ))}
            </View>
          )}
        </View>
      ))}

      <H2>Quiz</H2>
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
              <Text style={{ color: correct ? colors.good : colors.bad, fontSize: 15 }}>
                {correct ? '✓ Correct. ' : '✗ Not quite. Try again. '}
                {correct ? q.explanation : ''}
              </Text>
            )}
          </Panel>
        );
      })}

      {allCorrect && (
        <Panel style={{ borderColor: colors.gold, borderWidth: 1 }}>
          <Text style={styles.done}>Lesson complete! 🎉</Text>
          {lesson.practice && (
            <Button title={lesson.practice.label} onPress={() => router.push(lesson.practice!.href)} />
          )}
          {next && (
            <Button
              title={`Next: ${next.title}`}
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
