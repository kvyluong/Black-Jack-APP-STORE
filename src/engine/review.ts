// When to ask for an App Store / Google Play rating. Asked right after a happy moment
// (a level-up, a passed casino test, a perfect full deck), only once the player has
// clearly settled in, and rarely: the stores cap the prompt anyway, and asking too
// often costs goodwill.
import { daysBetween } from './progress';

/** Saved with the stats. Optional: saves from before it existed don't have it. */
export interface ReviewState {
  /** Times the prompt was requested. */
  asks: number;
  /** Local day (YYYY-MM-DD) of the last request. */
  lastAskDay?: string;
}

export const REVIEW_RULES = {
  /** Hands played before the first ask. */
  minHands: 30,
  /** Different days the app was used (today included) before the first ask. */
  minDaysUsed: 2,
  /** Days between asks. */
  gapDays: 120,
  /** Asks in total, ever. */
  maxAsks: 3,
};

export interface ReviewInput {
  handsPlayed: number;
  /** One entry per earlier day the app was used (see engine/progress). */
  history: { day: string }[];
  review?: ReviewState;
}

export function shouldAskForReview(s: ReviewInput, today: string): boolean {
  const r = s.review ?? { asks: 0 };
  if (r.asks >= REVIEW_RULES.maxAsks) return false;
  if (r.lastAskDay && daysBetween(r.lastAskDay, today) < REVIEW_RULES.gapDays) return false;
  if (s.handsPlayed < REVIEW_RULES.minHands) return false;
  const daysUsed = new Set([...s.history.map((h) => h.day), today]).size;
  return daysUsed >= REVIEW_RULES.minDaysUsed;
}

export const recordReviewAsk = (r: ReviewState | undefined, today: string): ReviewState => ({
  asks: (r?.asks ?? 0) + 1,
  lastAskDay: today,
});
