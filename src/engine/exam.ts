// Full Shoe Test: one full shoe with no hints, no count on screen and no
// feedback, then a report card. Pure grading logic (no React).
import { localized } from '../i18n/lang';
import { Rng } from './cards';
import { ExamResult } from './records';

/** How many times during the shoe you're asked how many decks are left. */
export const DECK_QUIZZES = 2;
/** Saved results kept. */
export const EXAMS_KEPT = 20;

/** Pass marks. All of them must be met. */
export const PASS = {
  /** The running count at the end of the shoe must be exact. */
  countError: 0,
  /** True count within ±1 (balanced systems only). */
  trueError: 1,
  /** Basic strategy (and Hi-Lo count plays) at least 95% right. */
  playAccuracy: 0.95,
  /** Average decks-left estimate within half a deck. */
  deckError: 0.5,
} as const;

/** Points per part of the grade (out of 100). Parts you weren't asked (KO's true count) are left out and the rest scaled up. */
export const WEIGHTS = { play: 35, count: 25, trueCount: 20, decks: 20 } as const;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Picks the points in the shoe (cards dealt) after which you're asked how many
 * decks are left: one in the first half of the dealt shoe, one in the second,
 * so they land on random rounds.
 */
export function deckQuizPoints(shoeSize: number, penetration: number, rng: Rng = Math.random): number[] {
  const dealt = shoeSize * penetration;
  const first = dealt * (0.15 + rng() * 0.3);
  const second = dealt * (0.5 + rng() * 0.35);
  return [Math.round(first), Math.round(second)];
}

/** Whether a decks-left question is due before the next deal. */
export function deckQuizDue(cardsDealt: number, points: number[], asked: number): boolean {
  return asked < points.length && cardsDealt >= points[asked];
}

export interface ExamInput {
  /** Your hands played over the shoe (split hands included). */
  hands: number;
  /** Decisions graded, and how many were right. */
  decisions: number;
  correct: number;
  countGuess: number;
  countActual: number;
  /** null for unbalanced systems (KO), where you aren't asked. */
  trueGuess: number | null;
  trueActual: number | null;
  /** Absolute errors of the decks-left estimates, in decks. */
  deckErrors: number[];
}

export interface ExamReport {
  hands: number;
  playAccuracy: number;
  countError: number;
  trueError: number | null;
  deckError: number | null;
  /** 0–100. */
  grade: number;
  passed: boolean;
  /** Which pass marks were met (null when that part wasn't asked). */
  checks: { play: boolean; count: boolean; trueCount: boolean | null; decks: boolean | null };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Grades a finished shoe. Each part earns its weight in full when perfect and
 * falls off linearly: play by its 0–1 score; the running count loses
 * a quarter per point off (0 at 4 off); the true count a third per point off
 * (0 at 3 off); decks left two thirds per deck off (0 at 1.5 decks off).
 */
export function gradeExam(x: ExamInput): ExamReport {
  const playAccuracy = x.decisions ? x.correct / x.decisions : 1;
  const countError = Math.abs(x.countGuess - x.countActual);
  const trueError = x.trueGuess === null || x.trueActual === null ? null : round2(Math.abs(x.trueGuess - x.trueActual));
  const deckError = x.deckErrors.length ? round2(mean(x.deckErrors)) : null;

  const parts: [number, number][] = [
    [WEIGHTS.play, playAccuracy],
    [WEIGHTS.count, clamp01(1 - countError / 4)],
  ];
  if (trueError !== null) parts.push([WEIGHTS.trueCount, clamp01(1 - trueError / 3)]);
  if (deckError !== null) parts.push([WEIGHTS.decks, clamp01(1 - deckError / 1.5)]);
  const max = parts.reduce((s, [w]) => s + w, 0);
  const grade = Math.round((parts.reduce((s, [w, v]) => s + w * v, 0) / max) * 100);

  const checks = {
    play: playAccuracy >= PASS.playAccuracy,
    count: countError <= PASS.countError,
    trueCount: trueError === null ? null : trueError <= PASS.trueError,
    decks: deckError === null ? null : deckError <= PASS.deckError,
  };
  const passed = checks.play && checks.count && checks.trueCount !== false && checks.decks !== false;
  return { hands: x.hands, playAccuracy, countError, trueError, deckError, grade, passed, checks };
}

/** The saved record for a finished test. */
export function examResult(x: ExamInput, r: ExamReport, day: string): ExamResult {
  return {
    day,
    hands: r.hands,
    playAccuracy: r.playAccuracy,
    countGuess: x.countGuess,
    countActual: x.countActual,
    trueGuess: x.trueGuess,
    trueActual: x.trueActual,
    deckError: r.deckError,
    grade: r.grade,
    passed: r.passed,
  };
}

/** Adds a result to the saved list, keeping the most recent ones. */
export const addExam = (exams: ExamResult[], result: ExamResult) => [...exams, result].slice(-EXAMS_KEPT);

const T = localized({
  en: {
    chatter: [
      'Hot shoe tonight!',
      'Dealer’s on fire.',
      'Come on, face card!',
      'I can feel a blackjack coming.',
      'Same seat every Friday.',
      'Nice cards, everybody.',
      'Cocktails, anyone?',
      'Monkey! Monkey!',
      'Who ordered the nachos?',
      'One more shoe, then I’m done.',
      'Shuffle up and deal!',
      'Did you see that?',
    ],
  },
  es: {
    chatter: [
      '¡Qué zapato tan caliente!',
      'El crupier está imparable.',
      '¡Vamos, una figura!',
      'Siento que viene un blackjack.',
      'Mismo asiento cada viernes.',
      '¡Qué buenas cartas!',
      '¿Alguien quiere un cóctel?',
      '¡Que salga un 10!',
      '¿Quién pidió los nachos?',
      'Un zapato más y me voy.',
      '¡Barajen y repartan!',
      '¿Viste eso?',
    ],
  },
});

/** A short line a computer player says at the table during the test. */
export function chatterLine(rng: Rng = Math.random): string {
  return T.chatter[Math.floor(rng() * T.chatter.length)];
}
