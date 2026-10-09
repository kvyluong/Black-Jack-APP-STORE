import { Card, Rank, pointValue } from './cards';
import { localized } from '../i18n/lang';

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

// ---------- Describing a system (legends, explanations) ----------

/** The most a single card can move the count in a system (1 for level-one, 2 for Omega II). */
export function maxTag(system: CountingSystem = current): number {
  return Math.max(...Object.values(TAGS[system]).map(Math.abs));
}

const VALUE_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];
const valueLabel = (v: number) => (v === 1 ? 'A' : v === 10 ? '10–K' : String(v));

/** Point values joined into runs, like "2–6", "2, 3, 7" or "10–K, A". */
function valuesLabel(values: number[]): string {
  const parts: string[] = [];
  let run: number[] = [];
  const flush = () => {
    if (!run.length) return;
    if (run.length >= 3 && !run.includes(10)) parts.push(`${run[0]}–${run[run.length - 1]}`);
    else if (run.length >= 2 && run.includes(10)) parts.push(`${run[0]}–K`);
    else parts.push(...run.map(valueLabel));
    run = [];
  };
  for (const v of VALUE_ORDER.filter((x) => values.includes(x))) {
    if (v !== 1 && run.length && v === run[run.length - 1] + 1) run.push(v);
    else {
      flush();
      run = [v];
    }
  }
  flush();
  return parts.join(', ');
}

/** Each tag value with the cards that carry it, highest first: [{ tag: 1, cards: '2–6' }, …]. */
export function tagGroups(system: CountingSystem = current): { tag: number; cards: string }[] {
  return tagValues(system).map((tag) => ({
    tag,
    cards: valuesLabel(VALUE_ORDER.filter((v) => TAGS[system][v] === tag)),
  }));
}

/** "+1", "0", "−2" (with a real minus sign). */
export const signedTag = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** One-line tag table: "2–6 +1 · 7–9 0 · 10–K, A −1". */
export function describeTags(system: CountingSystem = current): string {
  return tagGroups(system)
    .map((g) => `${g.cards} ${signedTag(g.tag)}`)
    .join(' · ');
}

const NOTE = localized({
  en: {
    balanced: (name: string) =>
      `${name} is balanced: a full deck adds up to 0, so you divide the running count by the decks left to get the true count.`,
    ko: 'KO is unbalanced: a full deck adds up to +4, so there’s no true count. Real shoes start at 4 − 4 × decks (6 decks: −20); bet more at the key count and the most from the pivot, +4.',
    sideCount: (name: string) => `${name} players often keep a separate Ace count; this app uses the plain tags.`,
  },
  es: {
    balanced: (name: string) =>
      `${name} es balanceado: una baraja completa suma 0, así que divides el conteo continuo entre las barajas restantes para obtener el conteo real.`,
    ko: 'KO no es balanceado: una baraja completa suma +4, así que no hay conteo real. En un zapato real empiezas en 4 − 4 × barajas (6 barajas: −20); sube la apuesta en el conteo clave y apuesta lo máximo desde el pivote, +4.',
    sideCount: (name: string) => `Quienes usan ${name} suelen llevar aparte la cuenta de Ases; esta app usa los valores simples.`,
  },
});

/** A short explanation of how the system works, in the current language. */
export function systemNote(system: CountingSystem = current): string {
  if (system === 'ko') return NOTE.ko;
  const base = NOTE.balanced(SYSTEM_NAME[system]);
  return system === 'hiOptI' || system === 'omegaII' ? `${base} ${NOTE.sideCount(SYSTEM_NAME[system])}` : base;
}

// ---------- KO: key count and pivot ----------

/** KO's pivot: at a running count of +4 (from the standard IRC) the edge is the same for any number of decks. */
export const KO_PIVOT = 4;

/**
 * KO key count (where the player's edge turns positive and the bet goes up),
 * from the "Rookie KO" tables in Vancura & Fuchs, Knock-Out Blackjack:
 * 1 deck +2, 2 decks +1, 6 decks −4, 8 decks −6. Other deck counts are
 * interpolated between those.
 */
export function koKeyCount(decks: number): number {
  const table: [number, number][] = [
    [1, 2],
    [2, 1],
    [6, -4],
    [8, -6],
  ];
  if (decks <= 1) return 2;
  if (decks >= 8) return -6;
  for (let i = 1; i < table.length; i++) {
    const [d1, k1] = table[i - 1];
    const [d2, k2] = table[i];
    if (decks <= d2) return Math.round(k1 + ((decks - d1) * (k2 - k1)) / (d2 - d1));
  }
  return -6;
}

export type KoBetZone = 'min' | 'raise' | 'max';

/** Where a KO running count sits: below the key count, from the key count up to the pivot, or at/above the pivot. */
export function koBetZone(running: number, decks: number): KoBetZone {
  if (running >= KO_PIVOT) return 'max';
  if (running >= koKeyCount(decks)) return 'raise';
  return 'min';
}

/**
 * A 1–8 unit KO bet ramp to match suggestedBetUnits: 1 unit below the key
 * count, 2 rising to 4 between the key count and the pivot, 6 at the pivot
 * (roughly a Hi-Lo true count of +4) and 8 from two above it.
 */
export function koBetUnits(running: number, decks: number): number {
  const key = koKeyCount(decks);
  if (running < key) return 1;
  if (running < KO_PIVOT) {
    const span = KO_PIVOT - key;
    return 2 + Math.floor(((running - key) / span) * 3);
  }
  return running >= KO_PIVOT + 2 ? 8 : 6;
}

export interface KoQuestion {
  running: number;
  decks: number;
  answer: KoBetZone;
}

/** A KO bet-zone quiz question: each zone comes up about equally often. */
export function koQuestion(deckChoices: number[] = [1, 2, 6, 8], rng: () => number = Math.random): KoQuestion {
  const decks = deckChoices[Math.floor(rng() * deckChoices.length)];
  const key = koKeyCount(decks);
  const zone = (['min', 'raise', 'max'] as KoBetZone[])[Math.floor(rng() * 3)];
  const [lo, hi] = zone === 'min' ? [key - 6, key - 1] : zone === 'raise' ? [key, KO_PIVOT - 1] : [KO_PIVOT, KO_PIVOT + 4];
  const running = lo + Math.floor(rng() * (hi - lo + 1));
  return { running, decks, answer: koBetZone(running, decks) };
}

/**
 * Bet in units for the current count, in the way each system is taught:
 * KO by its key count and pivot (koBetUnits); Omega II's level-2 true count runs
 * about twice Hi-Lo's, so it's halved before the 1–8 ramp; Hi-Lo and Hi-Opt I use
 * the ramp on the floored true count.
 */
export function betUnitsForCount(running: number, cardsRemaining: number, decks: number, system: CountingSystem = current): number {
  if (system === 'ko') return koBetUnits(running, decks);
  const tc = trueCount(running, cardsRemaining, system);
  return suggestedBetUnits(Math.floor(system === 'omegaII' ? tc / 2 : tc));
}
