// Daily practice reminders: when to send them and what they say. Pure logic, no React.
import { getLessons } from '../content/lessons';
import { localized, tr } from '../i18n/lang';
import { CATEGORY_INFO, LeakCategory } from './leaks';
import { BENCHMARK_TEXT, BenchmarkId } from './progress';

/** Default reminder time (local hour) until the player sets one. */
export const DEFAULT_REMINDER_HOUR = 19;
/** Reminders queued ahead. If the player stops opening the app, they go quiet after these. */
export const REMINDERS_AHEAD = 2;
/** Reminder hours players can pick: 8 AM to 9 PM, nothing at night. */
export const EARLIEST_REMINDER_HOUR = 8;
export const LATEST_REMINDER_HOUR = 21;

/** Moves the reminder hour by `delta`, kept within the daytime range. */
export const stepReminderHour = (hour: number, delta: number) =>
  Math.min(LATEST_REMINDER_HOUR, Math.max(EARLIEST_REMINDER_HOUR, hour + delta));

/**
 * The next reminder times: one a day at `hour`, starting today unless today's goal is
 * already claimed or the hour has passed. Only `count` are queued, so a player who
 * stops opening the app gets at most that many before the reminders stop.
 */
export function reminderTimes(now: Date, hour: number, keptToday: boolean, count = REMINDERS_AHEAD): Date[] {
  const at = (dayOffset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
  const first = keptToday || at(0) <= now ? 1 : 0;
  return Array.from({ length: count }, (_, i) => at(first + i));
}

/** An hour of the day as players read it: "7 PM" in English, "19:00" in Spanish. */
export function formatHour(hour: number): string {
  const h12 = hour % 12 || 12;
  return tr(`${h12} ${hour < 12 ? 'AM' : 'PM'}`, `${hour}:00`);
}

/** Reminder copy: practice-focused, never casino-style. */
export function reminderText(streak: number): { title: string; body: string } {
  if (streak > 0) {
    return {
      title: tr(`Keep your ${streak}-day streak`, `Mantén tu racha de ${streak} ${streak === 1 ? 'día' : 'días'}`),
      body: tr('One daily goal is all it takes today.', 'Hoy basta con una meta diaria.'),
    };
  }
  return {
    title: tr('Your daily goals are ready', 'Tus metas diarias están listas'),
    body: tr('A few minutes of practice starts a streak.', 'Unos minutos de práctica empiezan una racha.'),
  };
}

export interface ReminderText {
  title: string;
  body: string;
}

/** What the reminder can point to: the player's real next step and weakest spot. */
export interface ReminderContext {
  streak: number;
  /** The next benchmark (from nextStep), if any. */
  next?: BenchmarkId;
  /** For next = 'lessons': the next lesson's id. */
  nextLesson?: string;
  /** The weakest drillable category and its accuracy, 0–100. */
  leak?: { category: LeakCategory; pct: number };
  /** Missed spots due for review today. */
  reviewDue?: number;
}

const HINT = localized({
  en: {
    lesson: (title: string) => `Next lesson: “${title}”. A few minutes is all it takes.`,
    step: (title: string) => `Your next step: ${title}. A few minutes today moves it along.`,
    leak: (title: string, pct: number) => `${title}: ${pct}% right so far. A short drill tightens it up.`,
    review: (n: number) => `${n} ${n === 1 ? 'hand you missed is' : 'hands you missed are'} due for review.`,
  },
  es: {
    lesson: (title: string) => `Siguiente lección: «${title}». Bastan unos minutos.`,
    step: (title: string) => `Tu siguiente paso: ${title}. Unos minutos hoy te acercan.`,
    leak: (title: string, pct: number) => `${title}: ${pct}% de aciertos hasta ahora. Un ejercicio corto lo mejora.`,
    review: (n: number) => (n === 1 ? 'Toca repasar 1 mano que fallaste.' : `Toca repasar ${n} manos que fallaste.`),
  },
});

/** The specific lines a reminder can use, most useful first. */
export function reminderHints(ctx: ReminderContext): string[] {
  const hints: string[] = [];
  if (ctx.next === 'lessons') {
    const lesson = getLessons().find((l) => l.id === ctx.nextLesson);
    if (lesson) hints.push(HINT.lesson(lesson.title));
  } else if (ctx.next) {
    hints.push(HINT.step(BENCHMARK_TEXT[ctx.next].title));
  }
  if (ctx.reviewDue) hints.push(HINT.review(ctx.reviewDue));
  if (ctx.leak && ctx.leak.pct < 100) hints.push(HINT.leak(CATEGORY_INFO[ctx.leak.category].title, ctx.leak.pct));
  return hints;
}

/**
 * The text for each queued reminder (one a day, see reminderTimes). The title keeps the
 * streak; the body points at the player's real next step or weakest spot, a different one
 * each day so it doesn't read the same twice. Practice-focused, never casino-style.
 */
export function reminderTexts(ctx: ReminderContext, count = REMINDERS_AHEAD): ReminderText[] {
  const base = reminderText(ctx.streak);
  const hints = reminderHints(ctx);
  return Array.from({ length: count }, (_, i) => ({ title: base.title, body: hints.length ? hints[i % hints.length] : base.body }));
}
