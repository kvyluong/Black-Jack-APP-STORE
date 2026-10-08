import { Card, Rank, pointValue } from './cards';

/**
 * Counting systems the player can choose. Hi-Lo is the default and the one the
 * count plays (index numbers) are built for.
 */
export type CountingSystem = 'hiLo' | 'ko' | 'hiOptI' | 'omegaII';
export const COUNTING_SYSTEMS: CountingSystem[] = ['hiLo', 'ko', 'hiOptI', 'omegaII'];
export const SYSTEM_NAME: Record<CountingSystem, string> = { hiLo: 'Hi-Lo', ko: 'KO', hiOptI: 'Hi-Opt I', omegaII: 'Omega II' };

/**
 * Tags per system, by point value (2–10, 1 = Ace). Sources: Hi-Lo (Braun/Wong),
 * KO (Vancura & Fuchs, "Knock-Out Blackjack"), Hi-Opt I (Humble & Cooper),
 * Omega II (Carlson). Omega II and Hi-Opt I are usually played with an Ace side
 * count; this app uses the plain tags.
 */
const TAGS: Record<CountingSystem, Record<number, number>> = {
  hiLo: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 8: 0, 9: 0, 10: -1, 1: -1 },
  ko: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 0, 9: 0, 10: -1, 1: -1 },
  hiOptI: { 2: 0, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 8: 0, 9: 0, 10: -1, 1: 0 },
  omegaII: { 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 1, 8: 0, 9: -1, 10: -2, 1: 0 },
};

let current: CountingSystem = 'hiLo';
export const getCountingSystem = () => current;
/** Called by the settings store when the counting system setting changes. */
export function setCountingSystem(system: CountingSystem) {
  current = system;
}

/** A card's tag in the given system (default: the current one). */
export function cardTag(rank: Rank, system: CountingSystem = current): number {
  return TAGS[system][pointValue(rank)];
}

/** The different tag values a system uses, highest first (e.g. Hi-Lo: [1, 0, -1]). */
export function tagValues(system: CountingSystem = current): number[] {
  return [...new Set(Object.values(TAGS[system]))].sort((a, b) => b - a);
}

/** Balanced systems sum to 0 over a deck and use a true count; KO doesn't (it sums to +4 per deck). */
export const isBalanced = (system: CountingSystem = current) => system !== 'ko';

/** Where the running count starts for a fresh shoe: 0, or KO's 4 − 4 × decks (so the pivot is +4). */
export function initialRunningCount(decks: number, system: CountingSystem = current): number {
  return system === 'ko' ? 4 - 4 * decks : 0;
}

/** Hi-Lo tag: 2–6 are +1, 7–9 are 0, 10s and Aces are −1. */
export function hiLoValue(rank: Rank): number {
  return cardTag(rank, 'hiLo');
}

/** Sum of the cards' tags (in the current system unless given). */
export function runningCount(cards: Card[], system: CountingSystem = current): number {
  return cards.reduce((sum, c) => sum + cardTag(c.rank, system), 0);
}

/** Decks remaining, estimated to the nearest half deck like a player would by eye. */
export function decksRemaining(cardsRemaining: number): number {
  return Math.max(0.5, Math.round((cardsRemaining / 52) * 2) / 2);
}

/**
 * True count: running count per deck remaining. For KO (no true count) this is the
 * usual approximation from its pivot: at a running count of +4 the edge matches a
 * Hi-Lo true count of about +4, and each deck left shifts the neutral count by 4.
 */
export function trueCount(running: number, cardsRemaining: number, system: CountingSystem = current): number {
  const r = decksRemaining(cardsRemaining);
  if (system === 'ko') return (running - 4 + 4 * r) / r;
  return running / r;
}

/** Players typically floor the true count when sizing bets (e.g. +2.7 → +2). */
export function flooredTrueCount(running: number, cardsRemaining: number, system: CountingSystem = current): number {
  return Math.floor(trueCount(running, cardsRemaining, system));
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
