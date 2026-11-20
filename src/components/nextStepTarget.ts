// Where "your next step" leads: the next lesson while there are lessons left, then the
// weakest casino-ready benchmark. Shared by Home and the welcome-back checkpoint.
import { Href } from 'expo-router';

import { getLessons } from '../content/lessons';
import { BENCHMARK_TEXT, ProgressStats, benchmarks, nextStep } from '../engine/progress';
import { localized } from '../i18n/lang';

const T = localized({
  en: {
    lesson: (n: number, title: string) => `Lesson ${n}: ${title}`,
    readyTitle: 'You’re casino-ready',
    readyBody: 'Every benchmark done. Keep sharp at the table.',
  },
  es: {
    lesson: (n: number, title: string) => `Lección ${n}: ${title}`,
    readyTitle: 'Estás listo para el casino',
    readyBody: 'Todas las metas cumplidas. Mantente en forma en la mesa.',
  },
});

export interface NextStepTarget {
  title: string;
  body: string;
  href: Href;
  /** False once every benchmark is done (the step is just "take a seat"). */
  pending: boolean;
}

export function nextStepTarget(stats: ProgressStats, experienced: boolean): NextStepTarget {
  const next = nextStep(benchmarks(stats), experienced);
  if (next?.id === 'lessons') {
    const lessons = getLessons();
    const i = Math.max(0, lessons.findIndex((l) => !stats.lessonsCompleted.includes(l.id)));
    const lesson = lessons[i];
    return { title: T.lesson(i + 1, lesson.title), body: lesson.summary, href: `/learn/${lesson.id}` as Href, pending: true };
  }
  if (next) return { title: BENCHMARK_TEXT[next.id].title, body: next.detail, href: next.route as Href, pending: true };
  return { title: T.readyTitle, body: T.readyBody, href: '/tables', pending: false };
}
