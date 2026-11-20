// Welcome back: a short warm-up for players returning after a week or more away,
// built from the lessons they finished most recently. Pure logic, no React.
import type { Lesson, QuizQuestion } from '../content/lessons';
import type { GoalsState } from './progress';

/** Questions in the warm-up. */
export const WARMUP_SIZE = 5;

export interface WarmupQuestion extends QuizQuestion {
  lessonId: string;
}

/**
 * Up to `n` quiz questions from the lessons you finished last, newest lesson first
 * (lessonsCompleted is in the order they were finished). Empty with no lessons done.
 */
export function warmupQuestions(lessons: Lesson[], completed: string[], n = WARMUP_SIZE): WarmupQuestion[] {
  const out: WarmupQuestion[] = [];
  const seen = new Set<string>();
  for (let i = completed.length - 1; i >= 0 && out.length < n; i--) {
    const id = completed[i];
    if (seen.has(id)) continue;
    seen.add(id);
    const lesson = lessons.find((l) => l.id === id);
    for (const q of lesson?.quiz ?? []) {
      if (out.length >= n) break;
      out.push({ ...q, lessonId: id });
    }
  }
  return out;
}

/** The lesson finished most recently, if any. */
export function lastLesson(lessons: Lesson[], completed: string[]): Lesson | undefined {
  for (let i = completed.length - 1; i >= 0; i--) {
    const lesson = lessons.find((l) => l.id === completed[i]);
    if (lesson) return lesson;
  }
  return undefined;
}

/**
 * Days away to welcome back from, when today's open came after a long gap and the
 * checkpoint hasn't been dismissed; otherwise null. Only for players who had started.
 */
export function returningAway(goals: GoalsState | undefined, today: string, started: boolean): number | null {
  const r = goals?.returned;
  return started && r && r.day === today ? r.away : null;
}
