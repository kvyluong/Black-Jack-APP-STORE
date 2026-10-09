import { Card, RANKS, Rank, Rng, SUITS, createShoe, pointValue, shuffle } from './cards';

const randomSuit = (rng: Rng) => SUITS[Math.floor(rng() * 4)];
const card = (rank: Rank, rng: Rng): Card => ({ rank, suit: randomSuit(rng) });
const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** Weighted like a real shoe: 10-value cards come up 4× as often as any other rank. */
const randomRank = (rng: Rng): Rank => pick(RANKS, rng);

export interface StrategyQuestion {
  cards: Card[];
  dealerUp: Card;
}

/**
 * Builds a two-card player hand, biased toward the decisions people get wrong
 * most (stiff hands, soft hands and pairs) rather than easy 19s and 20s.
 */
export function strategyQuestion(rng: Rng = Math.random): StrategyQuestion {
  const dealerUp = card(randomRank(rng), rng);
  const kind = rng();
  let ranks: [Rank, Rank];
  if (kind < 0.25) {
    const r = pick(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as Rank[], rng);
    ranks = [r, r === '10' ? pick(['10', 'J', 'Q', 'K'] as Rank[], rng) : r];
  } else if (kind < 0.5) {
    ranks = ['A', pick(['2', '3', '4', '5', '6', '7', '8', '9'] as Rank[], rng)];
  } else {
    // Hard totals 8–17 made of two different-valued cards.
    while (true) {
      const a = randomRank(rng);
      const b = randomRank(rng);
      const total = pointValue(a) + pointValue(b);
      if (a !== 'A' && b !== 'A' && pointValue(a) !== pointValue(b) && total >= 8 && total <= 17) {
        ranks = [a, b];
        break;
      }
    }
  }
  if (rng() < 0.5) ranks.reverse();
  return { cards: ranks.map((r) => card(r, rng)), dealerUp };
}

/**
 * A full deck for the timed count, with 1–5 random cards held back. A complete deck
 * always counts to the same number (0, or +4 in KO), so without this the answer
 * could be given without counting.
 */
export function fullDeckDrillCards(rng: Rng = Math.random): Card[] {
  const held = 1 + Math.floor(rng() * 5);
  return createShoe(1, rng).slice(held);
}

/** A run of cards from a shuffled deck for the running-count drill. */
export function countDrillCards(n: number, rng: Rng = Math.random): Card[] {
  return createShoe(Math.ceil(n / 52), rng).slice(0, n);
}

export interface TrueCountQuestion {
  running: number;
  decks: number;
  answer: number;
  options: number[];
}

/** Questions are built so the true count comes out to a whole number. */
export function trueCountQuestion(maxDecks: number, rng: Rng = Math.random): TrueCountQuestion {
  const deckChoices: number[] = [];
  for (let d = 1; d <= Math.max(1, maxDecks); d += 0.5) deckChoices.push(d);
  while (true) {
    const decks = pick(deckChoices, rng);
    const answer = Math.floor(rng() * 13) - 5; // −5..+7
    const running = answer * decks;
    if (Number.isInteger(running) && running !== 0) {
      // Wrong answers include the running count itself, the most common mistake.
      const wrong = shuffle([answer - 2, answer - 1, answer + 1, answer + 2], rng);
      const options = new Set<number>([answer, running, ...wrong]);
      return { running, decks, answer, options: [...options].slice(0, 4).sort((x, y) => x - y) };
    }
  }
}
