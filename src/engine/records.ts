// Shared, saved practice records. Several features write these and the
// casino-ready score (engine/progress.ts) reads them, so the shapes live here.

export interface Tally {
  right: number;
  total: number;
}

export const emptyTally = (): Tally => ({ right: 0, total: 0 });

/** Running count drill: full-deck runs (all 52 cards, one at a time) counted exactly. */
export interface CountRecords {
  /** Fastest full deck counted with the exact final count, in ms. */
  bestDeckMs: number | null;
  /** Full decks counted exactly. */
  perfectDecks: number;
}

export const emptyCountRecords = (): CountRecords => ({ bestDeckMs: null, perfectDecks: 0 });

/** Memory of one flash card in a spaced-review deck (count plays). */
export interface CardMemory {
  /** Leitner box, 0 (new or just missed) upward; higher boxes come back less often. */
  box: number;
  /** Local day (YYYY-MM-DD) it's next due. */
  due: string;
  right: number;
  total: number;
}

/** Count-play trainer: one memory per play id (e.g. "16v10", "s15v10", "insurance"). */
export interface DeviationProgress {
  cards: Record<string, CardMemory>;
}

export const emptyDeviationProgress = (): DeviationProgress => ({ cards: {} });

/** One finished casino-conditions test (a full shoe with no hints or count on screen). */
export interface ExamResult {
  /** Local day (YYYY-MM-DD). */
  day: string;
  /** Hands you played. */
  hands: number;
  /** Basic strategy / count-play accuracy over the shoe, 0–1. */
  playAccuracy: number;
  /** Running count you gave at the end vs the real one. */
  countGuess: number;
  countActual: number;
  /** True count you gave vs the real one (null for unbalanced systems like KO). */
  trueGuess: number | null;
  trueActual: number | null;
  /** How well your bets followed the count, 0–1 (1 = always the right size). */
  betScore: number;
  /** Decks-remaining estimates: average absolute error in decks. */
  deckError: number | null;
  /** Overall grade, 0–100. */
  grade: number;
  passed: boolean;
}

/** Deck estimation drill (read the discard tray). */
export interface DeckEstimateRecords extends Tally {
  /** Average absolute error over the last answers, in decks. */
  recentErrors: number[];
}

export const emptyDeckEstimates = (): DeckEstimateRecords => ({ right: 0, total: 0, recentErrors: [] });
