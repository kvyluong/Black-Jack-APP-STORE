// Deck estimation: reading the discard tray to tell how many decks are left in
// the shoe, which the true count divides by. Pure logic for the drill and the
// casino-conditions test.
import { localized } from '../i18n/lang';
import { Rng } from './cards';
import { decksRemaining } from './counting';
import { GameState } from './game';
import { DeckEstimateRecords } from './records';

export const CARDS_PER_DECK = 52;
/** Questions per drill round. */
export const DECKS_ROUND = 10;
/** Answers kept for the recent-error average. */
const RECENT = 20;
/** An estimate counts as right within this many decks of the exact amount left. */
export const RIGHT_WITHIN = 0.5;
/**
 * A casino card is about 0.3 mm thick, so a 52-card deck stacks to roughly
 * 1.5–1.6 cm (Bicycle/Gemaco/KEM stock specs; Wong, "Professional Blackjack",
 * on eyeballing the discard tray in half decks).
 */
export const DECK_CM = 1.5;

export interface DeckQuestion {
  /** Decks in the shoe (6 or 8). */
  decks: number;
  /** Cards in the discard tray. */
  played: number;
  /** Cards still in the shoe. */
  remaining: number;
  /** Exact decks left (remaining / 52). */
  exact: number;
  /** Decks left to the nearest half deck: the answer a player should give. */
  answer: number;
  /** Tap choices in half-deck steps, ascending; one of them is `answer`. */
  choices: number[];
}

/** Rounds to the nearest half deck (never below half a deck), like a player reading the tray. */
export const nearestHalf = (decks: number) => decksRemaining(decks * CARDS_PER_DECK);

/**
 * Five half-deck choices around `answer`, with the answer at a random position,
 * kept between half a deck and a full shoe.
 */
export function deckChoices(answer: number, decks: number, rng: Rng = Math.random, count = 5): number[] {
  const all: number[] = [];
  for (let d = 0.5; d <= decks; d += 0.5) all.push(d);
  const n = Math.min(count, all.length);
  const at = all.indexOf(answer);
  // Where the window starts: a random offset so the answer isn't always in the middle.
  let start = at - Math.floor(rng() * n);
  start = Math.max(0, Math.min(start, all.length - n));
  return all.slice(start, start + n);
}

/**
 * A tray from a 6- or 8-deck shoe with a realistic number of cards played:
 * from half a deck up to 80% of the shoe (a typical deepest cut card).
 */
export function deckQuestion(rng: Rng = Math.random, decks = rng() < 0.6 ? 6 : 8): DeckQuestion {
  const total = decks * CARDS_PER_DECK;
  const min = CARDS_PER_DECK / 2;
  const max = Math.floor(total * 0.8);
  const played = min + Math.floor(rng() * (max - min + 1));
  return questionFor(decks, played, rng);
}

/** The question for a given shoe and tray (also used at the table). */
export function questionFor(decks: number, played: number, rng: Rng = Math.random): DeckQuestion {
  const remaining = decks * CARDS_PER_DECK - played;
  const exact = remaining / CARDS_PER_DECK;
  const answer = decksRemaining(remaining);
  return { decks, played, remaining, exact, answer, choices: deckChoices(answer, decks, rng) };
}

/** How far off a guess is from the exact decks left, and whether that's within half a deck. */
export function scoreDeckGuess(guess: number, exact: number): { error: number; right: boolean } {
  // Rounded to 0.01 so floating point never turns 0.5 into 0.50000001.
  const error = Math.round(Math.abs(guess - exact) * 100) / 100;
  return { error, right: error <= RIGHT_WITHIN };
}

/** Adds one answer to the saved records. */
export function recordDeckEstimate(rec: DeckEstimateRecords, error: number, right: boolean): DeckEstimateRecords {
  return {
    right: rec.right + (right ? 1 : 0),
    total: rec.total + 1,
    recentErrors: [...rec.recentErrors, error].slice(-RECENT),
  };
}

/** Average of the recent errors, or null with no answers yet. */
export function averageError(errors: number[]): number | null {
  if (!errors.length) return null;
  return Math.round((errors.reduce((a, b) => a + b, 0) / errors.length) * 100) / 100;
}

/** Cards in the discard tray: everything dealt from the shoe that isn't still on the table. */
export function discardedCards(g: GameState): number {
  const onTable = g.dealer.length + g.hands.reduce((sum, h) => sum + h.cards.length, 0);
  return Math.max(0, g.shoeSize - g.shoe.length - onTable);
}

/** "2.5" or "3" decks, with a comma in Spanish (2,5). */
export const formatDecks = (d: number) => {
  const s = Number.isInteger(d) ? String(d) : d.toFixed(1);
  return T.decimal === ',' ? s.replace('.', ',') : s;
};

const T = localized({
  en: {
    decimal: '.',
    exact: (remaining: number, exact: string, answer: string) =>
      `${remaining} cards left in the shoe = ${exact} decks. To the nearest half deck: ${answer}.`,
    tips: [
      `A full deck is about ${DECK_CM} cm (⅝ in) tall in a tray. Count the decks in the tray, then subtract from the shoe.`,
      'Read the tray, not the shoe: the discards sit flat and square, so they’re easier to judge.',
      'Half decks are close enough. Rounding to the nearest half deck changes the true count very little.',
      'Late in the shoe, the same error matters more: being a deck off with 2 decks left halves or doubles the true count.',
      'Practice at home: stack real decks and learn what 1, 2 and 3 decks look like.',
    ],
  },
  es: {
    decimal: ',',
    exact: (remaining: number, exact: string, answer: string) =>
      `Quedan ${remaining} cartas en el zapato = ${exact} barajas. A la media baraja más cercana: ${answer}.`,
    tips: [
      `Una baraja completa mide unos ${DECK_CM.toString().replace('.', ',')} cm de alto en la bandeja. Cuenta las barajas de la bandeja y réstalas del zapato.`,
      'Mira la bandeja, no el zapato: los descartes quedan planos y parejos, así que se calculan mejor.',
      'Con medias barajas basta. Redondear a la media baraja más cercana cambia muy poco el conteo real.',
      'Al final del zapato, el mismo error pesa más: equivocarte por una baraja con 2 restantes divide o duplica el conteo real.',
      'Practica en casa: apila barajas de verdad y aprende cómo se ven 1, 2 y 3 barajas.',
    ],
  },
});

/** Explains the exact answer for a question. */
export function deckAnswerText(q: DeckQuestion): string {
  return T.exact(q.remaining, formatDecks(Math.round(q.exact * 10) / 10), formatDecks(q.answer));
}

/** A tip about reading the tray, picked at random. */
export function deckTip(rng: Rng = Math.random): string {
  return T.tips[Math.floor(rng() * T.tips.length)];
}
