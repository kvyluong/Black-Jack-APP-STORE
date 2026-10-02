export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Returns a float in [0, 1). Injectable so games and tests can be deterministic. */
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible shoes in tests and drills. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit });
  }
  return deck;
}

/** Fisher–Yates shuffle. Returns a new array. */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createShoe(decks: number, rng: Rng = Math.random): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) cards.push(...createDeck());
  return shuffle(cards, rng);
}

/** Blackjack point value where an ace counts as 1 (soft totals are handled in hand.ts). */
export function pointValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

export function isTenValue(rank: Rank): boolean {
  return pointValue(rank) === 10;
}

export function isRed(card: Card): boolean {
  return card.suit === '♥' || card.suit === '♦';
}

export function cardLabel(card: Card): string {
  return `${card.rank}${card.suit}`;
}
