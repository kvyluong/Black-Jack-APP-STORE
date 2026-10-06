// Counting Academy: several ways to practice the Hi-Lo count, one per way people
// like to learn, each built on a technique with good evidence behind it
// (retrieval practice, spacing, dual coding, chunking, interleaving).
import { Card, Rank, Rng, createShoe } from './cards';
import { hiLoValue } from './counting';
import { localDay } from './progression';

export type LearningPreference = 'see' | 'hear' | 'do' | 'read' | 'mix';

export type AcademyMode = 'tagTap' | 'colorCount' | 'soundCount' | 'pairCancel' | 'readCount';

export interface ModeInfo {
  id: AcademyMode;
  title: string;
  /** Who it suits, in plain words. */
  forWho: string;
  /** What you do. */
  how: string;
  /** The learning technique behind it. */
  why: string;
  preference: Exclude<LearningPreference, 'mix'>;
}

export const MODES: ModeInfo[] = [
  {
    id: 'colorCount',
    title: 'See it: Color Count',
    forWho: 'For visual learners',
    how: 'Cards glow green (+1), gray (0) or red (−1) while a meter tracks the count. The hints fade as you level up.',
    why: 'Pairs words with pictures (dual coding), then removes the support so you rely on memory.',
    preference: 'see',
  },
  {
    id: 'soundCount',
    title: 'Hear it: Sound Count',
    forWho: 'For people who learn by listening',
    how: 'Each card plays a sound: a high pip for +1, a click for 0, a low pip for −1. Early levels also say the count out loud.',
    why: 'Links each tag to a sound, and trains you to count without staring at a screen.',
    preference: 'hear',
  },
  {
    id: 'tagTap',
    title: 'Do it: Tag Tap',
    forWho: 'For hands-on learners',
    how: 'A card appears. Tap −1, 0 or +1 before time runs out. The clock gets faster each level.',
    why: 'Every card is a tiny quiz (retrieval practice), so the tags become automatic.',
    preference: 'do',
  },
  {
    id: 'pairCancel',
    title: 'Chunk it: Pair Cancel',
    forWho: 'For everyone who wants speed',
    how: 'Cards come in pairs, then threes and fours. Call each group’s total in one go: a King and a 5 cancel to 0.',
    why: 'Grouping cards into chunks is how fast counters work: fewer things to keep in your head.',
    preference: 'do',
  },
  {
    id: 'readCount',
    title: 'Read it: Count Story',
    forWho: 'For readers',
    how: 'A short written scene describes a round at the table. Read it and work out the running count.',
    why: 'Turns the count into words you process slowly and precisely, a good first step before speed.',
    preference: 'read',
  },
];

export const PREFERENCE_LABEL: Record<LearningPreference, string> = {
  see: 'Seeing it',
  hear: 'Hearing it',
  do: 'Doing it',
  read: 'Reading it',
  mix: 'A bit of everything',
};

/** Modes ordered so the ones matching your preference come first. */
export function modesFor(pref: LearningPreference): ModeInfo[] {
  if (pref === 'mix') return MODES;
  return [...MODES.filter((m) => m.preference === pref), ...MODES.filter((m) => m.preference !== pref)];
}

export const MAX_LEVEL = 5;
/** Accuracy needed to move up a level. */
export const LEVEL_UP_ACCURACY = 0.9;

export interface ModeProgress {
  level: number;
  /** Rounds played in this mode. */
  played: number;
  bestAccuracy: number;
  /** Spaced review: which box (0–4) and the day it's next due. */
  box: number;
  due: string;
}

export const newProgress = (today: string): ModeProgress => ({ level: 1, played: 0, bestAccuracy: 0, box: 0, due: today });

/** Days until the next review for each box: practice well and reviews spread out. */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 14];

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/**
 * Records a finished round: levels up on 90%+ accuracy, and schedules the next
 * review further out after a good round or back to tomorrow after a weak one.
 */
export function recordRound(p: ModeProgress, accuracy: number, today: string): { progress: ModeProgress; leveledUp: boolean } {
  const good = accuracy >= LEVEL_UP_ACCURACY;
  const leveledUp = good && p.level < MAX_LEVEL;
  const box = good ? Math.min(REVIEW_INTERVALS.length - 1, p.box + 1) : 0;
  return {
    leveledUp,
    progress: {
      level: leveledUp ? p.level + 1 : p.level,
      played: p.played + 1,
      bestAccuracy: Math.max(p.bestAccuracy, accuracy),
      box,
      due: addDays(today, REVIEW_INTERVALS[box]),
    },
  };
}

export const isDue = (p: ModeProgress | undefined, today: string) => !p || p.due <= today;

/**
 * Today's workout: three different modes, mixed rather than repeated
 * (interleaving), favoring the ones due for review (spacing).
 */
export function dailyWorkout(progress: Partial<Record<AcademyMode, ModeProgress>>, today: string, pref: LearningPreference): AcademyMode[] {
  const ordered = modesFor(pref).map((m) => m.id);
  const due = ordered.filter((id) => isDue(progress[id], today));
  const rest = ordered
    .filter((id) => !due.includes(id))
    .sort((a, b) => (progress[a]!.due < progress[b]!.due ? -1 : 1));
  return [...due, ...rest].slice(0, 3);
}

// ---------- Round content ----------

export const tagOf = (c: Card) => hiLoValue(c.rank);

/** How many cards a round uses at a level. */
export function roundLength(mode: AcademyMode, level: number): number {
  if (mode === 'pairCancel') return 8 + level * 2; // groups, not cards
  if (mode === 'readCount') return 1; // one story per round
  return 10 + level * 5;
}

/** Tag Tap: seconds allowed per card, shrinking each level. */
export const tapSeconds = (level: number) => Math.max(0.7, 2.2 - level * 0.3);

/** Color/Sound Count: milliseconds each card is shown. */
export const flashMs = (level: number) => Math.max(450, 1500 - level * 200);

/** Color Count hint fading: what support each level still gives. */
export function visualHints(level: number): { glow: boolean; badge: boolean; meter: boolean } {
  return { glow: level <= 3, badge: level <= 1, meter: level <= 2 };
}

/** Sound Count: say the running count every N cards at low levels; never at high ones. */
export function spokenEvery(level: number): number | null {
  return level <= 1 ? 1 : level === 2 ? 5 : null;
}

export function cardRun(n: number, rng: Rng = Math.random): Card[] {
  return createShoe(Math.ceil(n / 52), rng).slice(0, n);
}

/** Pair Cancel: group sizes grow with level (pairs, then threes, then fours). */
export function groupSize(level: number): number {
  return level <= 2 ? 2 : level <= 4 ? 3 : 4;
}

export function cardGroups(level: number, rng: Rng = Math.random): Card[][] {
  const size = groupSize(level);
  const count = roundLength('pairCancel', level);
  const cards = cardRun(size * count, rng);
  return Array.from({ length: count }, (_, i) => cards.slice(i * size, i * size + size));
}

export const groupValue = (group: Card[]) => group.reduce((sum, c) => sum + tagOf(c), 0);

/** The answer buttons for a group: every total a group of this size can have. */
export function groupChoices(size: number): number[] {
  return Array.from({ length: size * 2 + 1 }, (_, i) => i - size);
}

// ---------- Count Story ----------

const RANK_WORD: Record<Rank, string> = {
  A: 'an Ace',
  '2': 'a 2',
  '3': 'a 3',
  '4': 'a 4',
  '5': 'a 5',
  '6': 'a 6',
  '7': 'a 7',
  '8': 'an 8',
  '9': 'a 9',
  '10': 'a 10',
  J: 'a Jack',
  Q: 'a Queen',
  K: 'a King',
};
const NAMES = ['Maria', 'Big Tony', 'Priya', 'Hank', 'Mei', 'Oscar'];

export interface Story {
  lines: string[];
  cards: Card[];
  answer: number;
}

/**
 * A short written round at the table. Longer stories (more players, more hits)
 * at higher levels.
 */
export function countStory(level: number, rng: Rng = Math.random): Story {
  const players = Math.min(4, 1 + Math.ceil(level / 2));
  const deck = cardRun(40, rng);
  let i = 0;
  const next = () => deck[i++];
  const lines: string[] = [];
  const names = NAMES.slice(0, players);
  const firsts = names.map((n) => [next(), next()] as Card[]);
  const up = next();
  names.forEach((n, k) => lines.push(`${n} is dealt ${RANK_WORD[firsts[k][0].rank]} and ${RANK_WORD[firsts[k][1].rank]}.`));
  lines.push(`The dealer shows ${RANK_WORD[up.rank]}.`);
  names.forEach((n) => {
    const hits = Math.floor(rng() * (level >= 3 ? 3 : 2));
    if (hits === 0) lines.push(`${n} stands.`);
    else {
      const drawn = Array.from({ length: hits }, next);
      lines.push(`${n} hits and gets ${drawn.map((c) => RANK_WORD[c.rank]).join(', then ')}.`);
    }
  });
  const hole = next();
  const dealerHits = level >= 2 ? Array.from({ length: Math.floor(rng() * 2) + 1 }, next) : [];
  lines.push(
    `The dealer turns over ${RANK_WORD[hole.rank]}${dealerHits.length ? ` and draws ${dealerHits.map((c) => RANK_WORD[c.rank]).join(' and ')}` : ''}.`,
  );
  const cards = deck.slice(0, i);
  return { lines, cards, answer: cards.reduce((s, c) => s + tagOf(c), 0) };
}

/** XP for an academy round: rewards accuracy, scaled lightly by level. */
export function academyXp(correct: number, level: number): number {
  return Math.round(correct * (1 + level * 0.25));
}
