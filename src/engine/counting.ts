import { Card, Rank, pointValue } from './cards';

/**
 * Counting systems the player can choose. Hi-Lo is the default and the one the
 * count plays (index numbers) are built for.
 */
export type CountingSystem = 'hiLo' | 'ko' | 'hiOptI' | 'omegaII';
export const COUNTING_SYSTEMS: CountingSystem[] = ['hiLo', 'ko', 'hiOptI', 'omegaII'];
export const SYSTEM_NAME: Record<CountingSystem, string> = { hiLo: 'Hi-Lo', ko: 'KO', hiOptI: 'Hi-Opt I', omegaII: 'Omega II' };

/** Hi-Lo tag: 2–6 are +1, 7–9 are 0, 10s and Aces are −1. */
export function hiLoValue(rank: Rank): number {
  const v = pointValue(rank);
  if (v >= 2 && v <= 6) return 1;
  if (v >= 7 && v <= 9) return 0;
  return -1;
}

export function runningCount(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + hiLoValue(c.rank), 0);
}

/** Decks remaining, estimated to the nearest half deck like a player would by eye. */
export function decksRemaining(cardsRemaining: number): number {
  return Math.max(0.5, Math.round((cardsRemaining / 52) * 2) / 2);
}

export function trueCount(running: number, cardsRemaining: number): number {
  return running / decksRemaining(cardsRemaining);
}

/** Players typically floor the true count when sizing bets (e.g. +2.7 → +2). */
export function flooredTrueCount(running: number, cardsRemaining: number): number {
  return Math.floor(trueCount(running, cardsRemaining));
}

/** Insurance becomes a good bet at a Hi-Lo true count of +3 or more. */
export const INSURANCE_INDEX = 3;

export function shouldTakeInsurance(tc: number): boolean {
  return tc >= INSURANCE_INDEX;
}

/**
 * A simple 1–8 unit bet ramp. Each +1 of true count is worth roughly +0.5% to
 * the player, so the edge flips positive around +1 to +2 in a typical game.
 */
export function suggestedBetUnits(flooredTc: number): number {
  if (flooredTc <= 1) return 1;
  if (flooredTc === 2) return 2;
  if (flooredTc === 3) return 4;
  if (flooredTc === 4) return 6;
  return 8;
}

/** Rough player edge in percent for a typical 6-deck S17 game with good rules. */
export function estimatedEdge(tc: number): number {
  return -0.5 + 0.5 * tc;
}
