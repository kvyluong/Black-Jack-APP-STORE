// Spaced review of your leaks: the exact spots you've missed (see engine/leaks) come
// back on a schedule, 1, 3 and then 7 days after a right answer, and back to tomorrow
// after a wrong one. A spot answered right at the 7-day review is learned; it only
// comes back if you miss it again. Pure logic, no React.
import { Card, Rank, Rng, SUITS } from './cards';
import { LeakStats } from './leaks';
import { localDay } from './progression';

// Own copy of progress.addDays: engine/progress imports this module for the daily goal.
function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/** Days until a spot's next review after a right answer, by box. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7];
/** Hands in a daily review. */
export const REVIEW_SESSION = 10;

export interface ReviewSpot {
  /** How many right answers in a row (0 to REVIEW_INTERVALS_DAYS.length). */
  box: number;
  /** Local day (YYYY-MM-DD) it's next due. */
  due: string;
  /** The spot's misses when it was last reviewed: a new miss at the table brings it back early. */
  misses: number;
  /** Learned: right at every interval. */
  done?: boolean;
  /** Last day it was answered in a review (only the first right answer of a day moves it on). */
  lastDay?: string;
}

/** Saved with the stats. Optional: saves from before 1.0.2 don't have it. */
export interface LeakReviewState {
  /** Keyed by the spot's English label, like LeakStats.spots. */
  spots: Record<string, ReviewSpot>;
  /** Review hands answered, ever (the daily goal counts today's). */
  answered: number;
}

export const emptyLeakReview = (): LeakReviewState => ({ spots: {}, answered: 0 });

/**
 * The spots to review today, most urgent first: ones you've never reviewed or missed
 * again since, then the most overdue, then the most missed.
 */
export function dueSpots(leaks: LeakStats | undefined, review: LeakReviewState | undefined, today: string): string[] {
  const out: { key: string; due: string; misses: number }[] = [];
  for (const [key, spot] of Object.entries(leaks?.spots ?? {})) {
    const misses = spot.total - spot.right;
    if (misses <= 0 || !parseSpot(key)) continue;
    const e = review?.spots[key];
    if (!e || misses > e.misses) out.push({ key, due: '', misses });
    else if (!e.done && e.due <= today) out.push({ key, due: e.due, misses });
  }
  return out
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : b.misses - a.misses || (a.key < b.key ? -1 : 1)))
    .map((s) => s.key);
}

/**
 * Today's review: up to REVIEW_SESSION hands from the due spots. With fewer spots than
 * that, they come round again, so it's always a full 10 hands while anything is due.
 */
export function reviewSession(leaks: LeakStats | undefined, review: LeakReviewState | undefined, today: string, n = REVIEW_SESSION): string[] {
  const due = dueSpots(leaks, review, today).slice(0, n);
  if (!due.length) return [];
  return Array.from({ length: n }, (_, i) => due[i % due.length]);
}

/**
 * Records one review answer. `missesAfter` is the spot's miss count in the leak stats
 * after this answer was recorded there.
 */
export function answerReview(
  review: LeakReviewState | undefined,
  key: string,
  ok: boolean,
  missesAfter: number,
  today: string,
): LeakReviewState {
  const r = review ?? emptyLeakReview();
  const e = r.spots[key];
  let next: ReviewSpot;
  if (!ok) {
    next = { box: 0, due: addDays(today, REVIEW_INTERVALS_DAYS[0]), misses: missesAfter, lastDay: today };
  } else if (e && e.lastDay === today) {
    // Already moved on today (it came round again in the same session).
    next = { ...e, misses: missesAfter };
  } else {
    const box = e && !e.done && missesAfter <= e.misses ? e.box : 0;
    next =
      box >= REVIEW_INTERVALS_DAYS.length
        ? { box, due: today, misses: missesAfter, done: true, lastDay: today }
        : { box: box + 1, due: addDays(today, REVIEW_INTERVALS_DAYS[box]), misses: missesAfter, lastDay: today };
  }
  return { answered: r.answered + 1, spots: { ...r.spots, [key]: next } };
}

// ---------- Rebuilding a hand from a spot ----------

type ParsedSpot =
  | { kind: 'pair'; rank: Rank; up: string }
  | { kind: 'soft' | 'hard'; total: number; up: string };

const UP = /^(A|[2-9]|10)$/;

/** Reads a spot key: "8,8 vs 10", "Soft 18 vs 9", "Hard 16 vs A". */
export function parseSpot(key: string): ParsedSpot | null {
  const pair = /^(A|[2-9]|10),\1 vs (\S+)$/.exec(key);
  if (pair && UP.test(pair[2])) return { kind: 'pair', rank: pair[1] as Rank, up: pair[2] };
  const m = /^(Soft|Hard) (\d+) vs (\S+)$/.exec(key);
  if (!m || !UP.test(m[3])) return null;
  const total = Number(m[2]);
  const soft = m[1] === 'Soft';
  if (soft ? total < 12 || total > 21 : total < 4 || total > 21) return null;
  return { kind: soft ? 'soft' : 'hard', total, up: m[3] };
}

export interface ReviewQuestion {
  cards: Card[];
  dealerUp: Card;
  /** Whether splitting is offered (off for the hands that are pairs but filed as totals, like hard 4). */
  canSplit: boolean;
}

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];
const TENS: Rank[] = ['10', 'J', 'Q', 'K'];
const rankFor = (value: number, rng: Rng): Rank => (value === 10 ? pick(TENS, rng) : value === 11 || value === 1 ? 'A' : (String(value) as Rank));
const card = (rank: Rank, rng: Rng): Card => ({ rank, suit: pick(SUITS, rng) });

/** A hard total from cards 2–10, never a pair, two cards when possible. */
function hardValues(total: number, rng: Rng): number[] {
  if (total === 4) return [2, 2];
  const twos: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = total - a;
    if (b > a && b <= 10) twos.push([a, b]);
  }
  if (twos.length) {
    const p = pick(twos, rng);
    return rng() < 0.5 ? p : [p[1], p[0]];
  }
  // 20 and 21 can't be made from two different cards: use three.
  return total === 20 ? [10, 6, 4] : [10, 6, 5];
}

/**
 * A hand for a spot, so it can be asked again. Graded like the strategy drill, and
 * recording it with recordDecision files it under the same spot.
 */
export function questionForSpot(key: string, rng: Rng = Math.random): ReviewQuestion | null {
  const s = parseSpot(key);
  if (!s) return null;
  const dealerUp = card(s.up === 'A' ? 'A' : rankFor(Number(s.up), rng), rng);
  if (s.kind === 'pair') {
    const r = s.rank === '10' ? [pick(TENS, rng), pick(TENS, rng)] : [s.rank, s.rank];
    return { cards: r.map((x) => card(x, rng)), dealerUp, canSplit: true };
  }
  if (s.kind === 'soft') {
    // A + 2..9 (13–20); soft 12 is A-A, not split; soft 21 is A + 5 + 5 (A + 10 would be blackjack).
    const rest = s.total === 12 ? [1] : s.total === 21 ? [5, 5] : [s.total - 11];
    return { cards: [card('A', rng), ...rest.map((v) => card(rankFor(v, rng), rng))], dealerUp, canSplit: false };
  }
  const values = hardValues(s.total, rng);
  return {
    cards: values.map((v) => card(rankFor(v, rng), rng)),
    dealerUp,
    // Only hard 4 (2-2) is a pair here; it's filed as a total, so splitting isn't offered.
    canSplit: values[0] !== values[1],
  };
}
