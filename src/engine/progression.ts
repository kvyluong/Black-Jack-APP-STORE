// Chip progression: a fixed starting stack, tables with rising limits that
// unlock as your chips grow, and player levels earned by playing well.
// Chips are play money only: they can't be bought or cashed out.

export const STARTING_CHIPS = 1000;

export interface CasinoTable {
  id: string;
  name: string;
  /** One-line flavor shown in the lobby. */
  blurb: string;
  minBet: number;
  maxBet: number;
  /** Reach this many chips (at any point) to unlock the table for good. */
  unlockAt: number;
  /** Chip denominations offered in the betting tray. */
  chips: number[];
  /** Felt color for this room. */
  felt: string;
}

export const TABLES: CasinoTable[] = [
  {
    id: 'floor',
    name: 'Main Floor',
    blurb: 'Friendly $5 table by the slots. Everyone starts here.',
    minBet: 5,
    maxBet: 100,
    unlockAt: 0,
    chips: [5, 25, 100],
    felt: '#0B5D3B',
  },
  {
    id: 'downtown',
    name: 'Downtown',
    blurb: 'Busier crowd, $25 minimum.',
    minBet: 25,
    maxBet: 500,
    unlockAt: 2500,
    chips: [25, 100, 500],
    felt: '#123F6B',
  },
  {
    id: 'strip',
    name: 'The Strip',
    blurb: 'Bright lights and $100 hands.',
    minBet: 100,
    maxBet: 2000,
    unlockAt: 10000,
    chips: [100, 500, 1000],
    felt: '#6B1530',
  },
  {
    id: 'highlimit',
    name: 'High Limit Room',
    blurb: 'Quiet, roped off, $500 a hand.',
    minBet: 500,
    maxBet: 10000,
    unlockAt: 50000,
    chips: [500, 1000, 5000],
    felt: '#3D1F5C',
  },
  {
    id: 'salon',
    name: 'Private Salon',
    blurb: 'By invitation only. $2,500 minimum.',
    minBet: 2500,
    maxBet: 50000,
    unlockAt: 250000,
    chips: [1000, 5000, 25000],
    felt: '#1F1F1F',
  },
];

export function getTable(id: string): CasinoTable {
  return TABLES.find((t) => t.id === id) ?? TABLES[0];
}

export const isUnlocked = (t: CasinoTable, peakChips: number) => peakChips >= t.unlockAt;

/** The next table you haven't unlocked yet, if any. */
export function nextUnlock(peakChips: number): CasinoTable | undefined {
  return TABLES.find((t) => !isUnlocked(t, peakChips));
}

/** Tables unlocked by moving from `before` to `after` peak chips. */
export function newlyUnlocked(before: number, after: number): CasinoTable[] {
  return TABLES.filter((t) => t.unlockAt > before && t.unlockAt <= after);
}

/** You can sit at a table you've unlocked if you can cover its minimum bet. */
export function canSit(t: CasinoTable, chips: number, peakChips: number): boolean {
  return isUnlocked(t, peakChips) && chips >= t.minBet;
}

/** Suggested buffer: enough chips for this many minimum bets at a table. */
export const COMFORTABLE_BETS = 10;

/**
 * The table to suggest when your chips no longer suit the current one: the
 * highest unlocked table where you can cover ten minimum bets, or else the
 * smallest table you can still sit at.
 */
export function bestAffordableTable(chips: number, peakChips: number): CasinoTable | undefined {
  const comfortable = [...TABLES].reverse().find((t) => canSit(t, chips, peakChips) && chips >= t.minBet * COMFORTABLE_BETS);
  return comfortable ?? TABLES.find((t) => canSit(t, chips, peakChips));
}

/** A free refill back to the starting stack is offered once you can't cover the smallest table. */
export const needsRefill = (chips: number) => chips < TABLES[0].minBet;

// ---------- Casino chips ----------

/** Standard casino chip colors by denomination. */
export const CHIP_COLORS: Record<number, { fill: string; text: string }> = {
  1: { fill: '#F4F1E8', text: '#1A1A1A' },
  5: { fill: '#D9363E', text: '#FFFFFF' },
  25: { fill: '#2E9E5B', text: '#FFFFFF' },
  100: { fill: '#1C1C1C', text: '#FFFFFF' },
  500: { fill: '#7B4BC9', text: '#FFFFFF' },
  1000: { fill: '#F2B33D', text: '#1A1A1A' },
  5000: { fill: '#8A5A3B', text: '#FFFFFF' },
  25000: { fill: '#3A7BD5', text: '#FFFFFF' },
};
const DENOMINATIONS = [25000, 5000, 1000, 500, 100, 25, 5, 1];

/** Splits an amount into the fewest chips, largest first (used to draw a bet as a stack). */
export function chipBreakdown(amount: number, maxChips = 8): number[] {
  const out: number[] = [];
  let left = Math.floor(amount);
  for (const d of DENOMINATIONS) {
    while (left >= d && out.length < maxChips) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}

export function chipLabel(d: number): string {
  return d >= 1000 ? `${d / 1000}K` : String(d);
}

/** Formats chip amounts with thousands separators, e.g. 12,500. */
export function formatChips(n: number): string {
  const whole = Math.round(n * 100) / 100;
  return whole.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ---------- Levels ----------

export const XP_PER_HAND = 10;
export const XP_PER_CORRECT = 5;

/** Total XP needed to reach a level: 0, 100, 300, 600, 1000, ... */
export const xpForLevel = (level: number) => 50 * (level - 1) * level;

const TITLES: [number, string][] = [
  [1, 'Rookie'],
  [3, 'Regular'],
  [5, 'Card Sharp'],
  [8, 'Counter'],
  [12, 'Advantage Player'],
  [16, 'Legend'],
];

export function titleFor(level: number): string {
  return [...TITLES].reverse().find(([min]) => level >= min)![1];
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP earned within the current level. */
  into: number;
  /** XP the current level spans. */
  span: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  return { level, title: titleFor(level), into: xp - start, span: xpForLevel(level + 1) - start };
}

/** XP for a finished round: per hand you played, plus per correct decision you made. */
export function roundXp(yourHands: number, correctDecisions: number): number {
  return yourHands * XP_PER_HAND + correctDecisions * XP_PER_CORRECT;
}
