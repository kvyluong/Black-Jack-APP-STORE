// Welcome-back warm-up: five quick questions from the lessons you finished last,
// one try each with the explanation, then "pick up where you left off".
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { playSound } from '../audio/sounds';
import { Button, P, Panel, Screen } from '../components/ui';
import { useOutcomeColors } from '../components/useColors';
import { useWelcomeBack } from '../components/WelcomeBack';
import { nextStepTarget } from '../components/nextStepTarget';
import { getLessons } from '../content/lessons';
import { WARMUP_SIZE, warmupQuestions } from '../engine/checkpoint';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const T = localized({
  en: {
    progress: (n: number, total: number) => `Question ${n} of ${total}`,
    from: (lesson: string) => `From “${lesson}”`,
    correct: '✓ Correct. ',
    wrong: (answer: string) => `✗ The answer is ${answer}. `,
    next: 'Next question',
    finish: 'See results',
    none: 'Finish a lesson first, and the warm-up will quiz you on it when you come back.',
    doneTitle: 'Warmed up',
    doneBody: (right: number, total: number) => `${right} of ${total} right.`,
    doneGood: 'It’s all still there. Pick up where you left off:',
    doneReview: (lesson: string) => `Worth a quick reread of “${lesson}” before you go on. Or pick up where you left off:`,
    reread: (lesson: string) => `Reread “${lesson}”`,
    pickUp: 'Pick up where you left off',
  },
  es: {
    progress: (n: number, total: number) => `Pregunta ${n} de ${total}`,
    from: (lesson: string) => `De «${lesson}»`,
    correct: '✓ ¡Correcto! ',
    wrong: (answer: string) => `✗ La respuesta es ${answer}. `,
    next: 'Siguiente pregunta',
    finish: 'Ver resultados',
    none: 'Termina primero una lección y el calentamiento te preguntará sobre ella cuando vuelvas.',
    doneTitle: 'Calentamiento terminado',
    doneBody: (right: number, total: number) => `${right} de ${total} correctas.`,
    doneGood: 'Todo sigue ahí. Sigue donde lo dejaste:',
    doneReview: (lesson: string) => `Vale la pena releer «${lesson}» antes de seguir. O sigue donde lo dejaste:`,
    reread: (lesson: string) => `Releer «${lesson}»`,
    pickUp: 'Sigue donde lo dejaste',
  },
});

export default function Warmup() {
  const { stats, settings } = useSettings();
  const { good, bad } = useOutcomeColors();
  const { dismiss } = useWelcomeBack();
  const lessons = getLessons();
  // Fixed when the screen opens, so answering doesn't reshuffle it.
  const questions = useMemo(
    () => warmupQuestions(getLessons(), stats.lessonsCompleted, WARMUP_SIZE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.language],
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [misses, setMisses] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const pickUp = () => {
    dismiss();
    router.replace(nextStepTarget(stats, settings.experienced).href);
  };

  if (!questions.length) {
    return (
      <Screen>
        <P muted>{T.none}</P>
        <Button title={T.pickUp} onPress={pickUp} />
      </Screen>
    );
  }

  const title = (id: string) => lessons.find((l) => l.id === id)?.title ?? '';

  if (finished) {
    const right = questions.length - misses.length;
    // The lesson with the most misses, to suggest a reread.
    const weakest = misses.length ? [...misses].sort((a, b) => misses.filter((m) => m === b).length - misses.filter((m) => m === a).length)[0] : null;
    return (
      <Screen>
        <Panel style={{ backgroundColor: colors.feltDark }}>
          <Text style={styles.title} accessibilityRole="header">
            {T.doneTitle}
          </Text>
          <Text style={styles.big}>{T.doneBody(right, questions.length)}</Text>
          <P muted>{weakest ? T.doneReview(title(weakest)) : T.doneGood}</P>
        </Panel>
        <Button title={T.pickUp} onPress={pickUp} />
        {weakest && (
          <Button
            title={T.reread(title(weakest))}
            variant="secondary"
            onPress={() => {
              dismiss();
              router.replace({ pathname: '/learn/[id]', params: { id: weakest } });
            }}
          />
        )}
      </Screen>
    );
  }

  const q = questions[i];
  const answered = picked !== null;
  const ok = picked === q.answer;

  const choose = (oi: number) => {
    if (answered) return;
    setPicked(oi);
    if (oi !== q.answer) setMisses((m) => [...m, q.lessonId]);
    if (settings.soundEffects) playSound(oi === q.answer ? 'correct' : 'wrong');
  };

  const next = () => {
    if (i + 1 >= questions.length) setFinished(true);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };

  return (
    <Screen>
      <View style={styles.head}>
        <Text style={styles.count}>{T.progress(i + 1, questions.length)}</Text>
        <Text style={styles.from} numberOfLines={2}>
          {T.from(title(q.lessonId))}
        </Text>
      </View>
      <Panel>
        <Text style={styles.question}>{q.question}</Text>
        <View style={styles.options}>
          {q.options.map((opt, oi) => (
            <Button
              key={oi}
              title={opt}
              variant={answered && oi === q.answer ? 'primary' : answered && oi === picked ? 'danger' : 'secondary'}
              onPress={() => choose(oi)}
              style={{ flexGrow: 1 }}
            />
          ))}
        </View>
        {answered && (
          <Text style={{ color: ok ? good : bad, fontSize: 15, lineHeight: 21 }} accessibilityLiveRegion="polite">
            {ok ? T.correct : T.wrong(q.options[q.answer])}
            {q.explanation}
          </Text>
        )}
      </Panel>
      {answered && <Button title={i + 1 >= questions.length ? T.finish : T.next} onPress={next} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  count: { color: colors.gold, fontWeight: '700' },
  from: { color: colors.muted, fontSize: 13 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  big: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  question: { color: colors.text, fontSize: 17, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
});
