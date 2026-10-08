// Count-play trainer: flash cards for the plays that change with the Hi-Lo true
// count, reviewed with a Leitner spaced-repetition schedule.
//
// Indexes come from strategy.ts (DEVIATIONS: Illustrious 18–style plays from Don
// Schlesinger, "Blackjack Attack"; SURRENDER_DEVIATIONS: the Fab 4) and
// counting.ts (INSURANCE_INDEX = +3). Answers are always computed by recommend(),
// so the trainer agrees with the table's coach.
import { Card, Rank, Rng, SUITS } from './cards';
import { isPair } from './hand';
import { INSURANCE_INDEX } from './counting';
import type { CardMemory, DeviationProgress } from './records';
import { Rules } from './rules';
import { ACTION_LABEL, Action, DEVIATIONS, Deviation, SURRENDER_DEVIATIONS, recommend } from './strategy';
import { localDay } from './progression';
import { localized, tr } from '../i18n/lang';

export const INSURANCE_ID = 'insurance';

/**
 * Order new cards are introduced in: most valuable first (the standard I18
 * ranking, Schlesinger "Blackjack Attack"), then the Fab 4 surrenders.
 */
export const DECK_ORDER = [
  INSURANCE_ID,
  '16v10',
  '15v10',
  'TTv5',
  'TTv6',
  '10v10',
  '12v3',
  '12v2',
  '11vA',
  '9v2',
  '10vA',
  '9v7',
  '16v9',
  '13v2',
  '12v4',
  '12v5',
  '12v6',
  '13v3',
  's14v10',
  's15v10',
  's15v9',
  's15vA',
] as const;

/** Player hand and dealer upcard (2–11, ace = 11) each play is about. */
const SPOTS: Record<string, { total: number | 'TT'; up: number }> = {
  '16v10': { total: 16, up: 10 },
  '15v10': { total: 15, up: 10 },
  TTv5: { total: 'TT', up: 5 },
  TTv6: { total: 'TT', up: 6 },
  '10v10': { total: 10, up: 10 },
  '12v3': { total: 12, up: 3 },
  '12v2': { total: 12, up: 2 },
  '11vA': { total: 11, up: 11 },
  '9v2': { total: 9, up: 2 },
  '10vA': { total: 10, up: 11 },
  '9v7': { total: 9, up: 7 },
  '16v9': { total: 16, up: 9 },
  '13v2': { total: 13, up: 2 },
  '12v4': { total: 12, up: 4 },
  '12v5': { total: 12, up: 5 },
  '12v6': { total: 12, up: 6 },
  '13v3': { total: 13, up: 3 },
  s14v10: { total: 14, up: 10 },
  s15v10: { total: 15, up: 10 },
  s15v9: { total: 15, up: 9 },
  s15vA: { total: 15, up: 11 },
};

export type Choice = Action | 'insure' | 'noInsure';

export interface DeckCard {
  id: string;
  /** The strategy entry, or undefined for insurance. */
  dev?: Deviation;
  surrender: boolean;
}

const ALL_DEVS = [...DEVIATIONS, ...SURRENDER_DEVIATIONS];

/** Every card, in introduction order. */
export const DECK: DeckCard[] = DECK_ORDER.map((id) => {
  if (id === INSURANCE_ID) return { id, surrender: false };
  const dev = ALL_DEVS.find((d) => d.id === id);
  if (!dev) throw new Error(`Unknown count play ${id}`);
  return { id, dev, surrender: SURRENDER_DEVIATIONS.includes(dev) };
});

export const deckCard = (id: string): DeckCard => DECK.find((c) => c.id === id)!;

const T = localized({
  en: {
    insurance: 'Insurance',
    take: 'Take insurance',
    decline: 'No insurance',
    verb: { hit: 'hit', stand: 'stand', double: 'double', split: 'split', surrender: 'surrender', insure: 'take insurance' },
    prompt: (label: string, verb: string) => `${label}: at what true count do you ${verb}?`,
    rule: (label: string, at: string, i: string, below: string) => `${label}: ${at} at ${i} or higher; ${below} below.`,
    insuranceRule: (i: string) => `Insurance: take it at ${i} or higher; decline it below.`,
    insuranceWhy: (tc: string, i: string, take: boolean) =>
      take
        ? `Take it: the true count is ${tc}, at or above ${i}. Enough tens are left that the 2:1 insurance bet pays off.`
        : `Decline it: the true count is ${tc}, below ${i}. Insurance pays 2:1, and with this few tens left it loses money.`,
  },
  es: {
    insurance: 'Seguro',
    take: 'Tomar seguro',
    decline: 'Sin seguro',
    verb: { hit: 'pides', stand: 'te plantas', double: 'doblas', split: 'divides', surrender: 'te rindes', insure: 'tomas el seguro' },
    prompt: (label: string, verb: string) => `${label}: ¿con qué conteo real ${verb}?`,
    rule: (label: string, at: string, i: string, below: string) => `${label}: ${at} con ${i} o más; ${below} por debajo.`,
    insuranceRule: (i: string) => `Seguro: tómalo con ${i} o más; recházalo por debajo.`,
    insuranceWhy: (tc: string, i: string, take: boolean) =>
      take
        ? `Tómalo: el conteo real es ${tc}, igual o mayor que ${i}. Quedan suficientes cartas de 10 para que el seguro, que paga 2 a 1, sea rentable.`
        : `Recházalo: el conteo real es ${tc}, menor que ${i}. El seguro paga 2 a 1 y, con tan pocas cartas de 10, pierde dinero.`,
  },
});

/** "+3", "+0", "-1": the way recommend() writes indexes. */
export const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

/** Short name for a card in the current language, e.g. "16 vs 10" or "Seguro". */
export function cardLabel(card: DeckCard): string {
  if (!card.dev) return T.insurance;
  return card.dev.label.replace(/\s*\(.*\)$/, '');
}

export function choiceLabel(c: Choice): string {
  if (c === 'insure') return T.take;
  if (c === 'noInsure') return T.decline;
  return ACTION_LABEL[c];
}

/** The play at or above the index ("insure" for insurance). */
export const playAtIndex = (card: DeckCard): Choice => (card.dev ? card.dev.atOrAbove : 'insure');
export const playBelowIndex = (card: DeckCard): Choice => (card.dev ? card.dev.below : 'noInsure');

// ---------- Hands ----------

const TEN_RANKS: Rank[] = ['10', 'J', 'Q', 'K'];
const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];
const rankFor = (value: number, rng: Rng): Rank => (value === 11 ? 'A' : value === 10 ? pick(TEN_RANKS, rng) : (String(value) as Rank));
const cardOf = (value: number, rng: Rng): Card => ({ rank: rankFor(value, rng), suit: pick(SUITS, rng) });

/** Two different, ace-free card values summing to a hard total (never a pair). */
function twoCardTotal(total: number, rng: Rng): [number, number] {
  const options: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = total - a;
    if (b > a && b <= 10) options.push([a, b]);
  }
  const [a, b] = pick(options, rng);
  return rng() < 0.5 ? [a, b] : [b, a];
}

/** A two-card hand and dealer upcard for a card (insurance: dealer shows an Ace). */
export function dealSpot(card: DeckCard, rng: Rng = Math.random): { cards: Card[]; dealerUp: Card } {
  if (!card.dev) {
    const [a, b] = twoCardTotal(pick([13, 15, 16, 17, 18, 19], rng), rng);
    return { cards: [cardOf(a, rng), cardOf(b, rng)], dealerUp: cardOf(11, rng) };
  }
  const spot = SPOTS[card.id];
  const values = spot.total === 'TT' ? [10, 10] : twoCardTotal(spot.total, rng);
  return { cards: values.map((v) => cardOf(v, rng)), dealerUp: cardOf(spot.up, rng) };
}

/**
 * Hands are two cards, so doubling is open and pairs can split. The Fab 4 cards
 * always allow surrender; the other plays are asked as no-surrender hands, since
 * where surrender is offered it replaces hitting 15/16 vs 9/10 and hides the index.
 */
function context(card: DeckCard, cards: Card[], dealerUp: Rank, rules: Rules, trueCount: number) {
  return { cards, dealerUp, rules, canDouble: true, canSplit: true, canSurrender: card.surrender, trueCount };
}

/** The buttons for a card: every legal play on its hand. */
export function choicesFor(card: DeckCard, cards: Card[]): Choice[] {
  if (!card.dev) return ['insure', 'noInsure'];
  const out: Choice[] = ['hit', 'stand', 'double'];
  if (isPair(cards)) out.push('split');
  if (card.surrender) out.push('surrender');
  return out;
}

/** The right play and its one-line reason, from the same coach as the table. */
export function answerFor(card: DeckCard, cards: Card[], dealerUp: Rank, trueCount: number, rules: Rules): { answer: Choice; reason: string } {
  if (!card.dev) {
    const take = trueCount >= INSURANCE_INDEX;
    return { answer: take ? 'insure' : 'noInsure', reason: T.insuranceWhy(signed(trueCount), signed(INSURANCE_INDEX), take) };
  }
  const r = recommend(context(card, cards, dealerUp, rules, trueCount));
  return { answer: r.action, reason: r.reason };
}

/**
 * The index under these rules, found by asking recommend() itself (so rule tweaks
 * like 10 vs A at +3 under H17 always match the coach).
 */
export function indexFor(card: DeckCard, rules: Rules): number {
  if (!card.dev) return INSURANCE_INDEX;
  const { cards, dealerUp } = dealSpot(card, () => 0);
  for (let tc = -10; tc <= 12; tc++) {
    if (recommend(context(card, cards, dealerUp.rank, rules, tc)).action === card.dev.atOrAbove) return tc;
  }
  return card.dev.index;
}

/** "16 vs 10: Stand at +0 or higher; Hit below." */
export function ruleText(card: DeckCard, rules: Rules): string {
  const i = signed(indexFor(card, rules));
  if (!card.dev) return T.insuranceRule(i);
  return T.rule(cardLabel(card), ACTION_LABEL[card.dev.atOrAbove], i, ACTION_LABEL[card.dev.below].toLowerCase());
}

// ---------- Questions ----------

export type Question =
  | { kind: 'play'; id: string; cards: Card[]; dealerUp: Card; trueCount: number }
  | { kind: 'index'; id: string; choices: number[] };

/**
 * True counts to ask at: both sides of the index, weighted toward the index
 * itself and one below, where people get it wrong. Half are below, half at/above.
 */
const TC_OFFSETS = [-3, -2, -1, -1, 0, 0, 1, 2];

export function playQuestion(card: DeckCard, rules: Rules, rng: Rng = Math.random): Question {
  const { cards, dealerUp } = dealSpot(card, rng);
  return { kind: 'play', id: card.id, cards, dealerUp, trueCount: indexFor(card, rules) + pick(TC_OFFSETS, rng) };
}

export function indexQuestion(card: DeckCard, rules: Rules, rng: Rng = Math.random): Question {
  const answer = indexFor(card, rules);
  const pool = [-3, -2, -1, 1, 2, 3].map((d) => answer + d);
  const wrong: number[] = [];
  while (wrong.length < 3) {
    const n = pick(pool, rng);
    if (!wrong.includes(n)) wrong.push(n);
  }
  const choices = [answer, ...wrong].sort((a, b) => a - b);
  return { kind: 'index', id: card.id, choices };
}

/** "16 vs 10: at what true count do you stand?" */
export function indexPrompt(card: DeckCard): string {
  const verb = card.dev ? T.verb[card.dev.atOrAbove] : T.verb.insure;
  return T.prompt(cardLabel(card), verb);
}

export function isCorrect(q: Question, picked: Choice | number, rules: Rules): boolean {
  const card = deckCard(q.id);
  if (q.kind === 'index') return picked === indexFor(card, rules);
  return picked === answerFor(card, q.cards, q.dealerUp.rank, q.trueCount, rules).answer;
}

// ---------- Spaced review (Leitner) ----------

/** Days until the next review for each box. Box 0 comes back the same day. */
export const BOX_INTERVALS = [0, 1, 2, 4, 7, 14];
export const MAX_BOX = BOX_INTERVALS.length - 1;
/** A card counts as learned from this box up. */
export const LEARNED_BOX = 3;
export const SESSION_SIZE = 10;
export const MAX_NEW_PER_SESSION = 4;

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/**
 * Grades one answer. Right moves the card up a box (only once per session, so a
 * card shown twice can't jump two boxes in a day); a miss sends it to box 0.
 */
export function review(mem: CardMemory | undefined, ok: boolean, today: string, promote = true): CardMemory {
  const prev = mem ?? { box: 0, due: today, right: 0, total: 0 };
  const box = ok ? (promote ? Math.min(MAX_BOX, prev.box + 1) : prev.box) : 0;
  const due = ok && !promote ? prev.due : addDays(today, BOX_INTERVALS[box]);
  return { box, due, right: prev.right + (ok ? 1 : 0), total: prev.total + 1 };
}

export const isLearned = (mem: CardMemory | undefined) => !!mem && mem.box >= LEARNED_BOX;
export const learnedCount = (p: DeviationProgress) => DECK.filter((c) => isLearned(p.cards[c.id])).length;

const accuracy = (m: CardMemory) => (m.total ? m.right / m.total : 0);
const weakestFirst = (cards: Record<string, CardMemory>) => (a: string, b: string) =>
  cards[a].box - cards[b].box || accuracy(cards[a]) - accuracy(cards[b]) || (cards[a].due < cards[b].due ? -1 : 1);

/**
 * Which cards a session covers: due ones first, then weak ones (box 0–1), then up
 * to MAX_NEW_PER_SESSION new ones in value order. With nothing to do, the
 * lowest-box cards come back for extra practice.
 */
export function pickSessionCards(p: DeviationProgress, today: string, size = SESSION_SIZE, maxNew = MAX_NEW_PER_SESSION): string[] {
  const seen = DECK_ORDER.filter((id) => p.cards[id]);
  const due = seen.filter((id) => p.cards[id].due <= today).sort(weakestFirst(p.cards));
  const weak = seen.filter((id) => !due.includes(id) && p.cards[id].box <= 1).sort(weakestFirst(p.cards));
  const fresh = DECK_ORDER.filter((id) => !p.cards[id]).slice(0, maxNew);
  const out = [...due, ...weak].slice(0, size);
  out.push(...fresh.slice(0, Math.max(0, size - out.length)));
  if (out.length === 0) return [...seen].sort(weakestFirst(p.cards)).slice(0, Math.min(size, 4));
  return out;
}

/**
 * A session of `size` questions over the picked cards, cycling through them when
 * there are fewer cards than questions. A card seen twice gets both question
 * types; new cards start with "play it". Never the same card twice in a row
 * when it can be avoided.
 */
export function buildSession(p: DeviationProgress, today: string, rules: Rules, rng: Rng = Math.random, size = SESSION_SIZE): Question[] {
  const ids = pickSessionCards(p, today, size);
  const order: string[] = [];
  for (let i = 0; order.length < size; i++) order.push(ids[i % ids.length]);
  // Shuffle within rounds of the cycle, keeping repeats apart.
  const rounds: string[][] = [];
  for (let i = 0; i < order.length; i += ids.length) rounds.push(shuffled(order.slice(i, i + ids.length), rng));
  const flat: string[] = [];
  for (const round of rounds) {
    if (flat.length && round.length > 1 && round[0] === flat[flat.length - 1]) round.push(round.shift()!);
    flat.push(...round);
  }
  const seenCount: Record<string, number> = {};
  const startType: Record<string, number> = {};
  return flat.map((id) => {
    const card = deckCard(id);
    const n = seenCount[id] ?? 0;
    seenCount[id] = n + 1;
    if (!(id in startType)) startType[id] = p.cards[id] ? Math.floor(rng() * 2) : 0;
    return (startType[id] + n) % 2 === 0 ? playQuestion(card, rules, rng) : indexQuestion(card, rules, rng);
  });
}

function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Day of the next review: today when anything is due or new cards remain. */
export function nextReviewDay(p: DeviationProgress, today: string): string {
  const next = DECK_ORDER.map((id) => p.cards[id]?.due ?? today).reduce((min, d) => (d < min ? d : min));
  return next < today ? today : next;
}

/** "today", "tomorrow" or "in 4 days". */
export function dayText(day: string, today: string): string {
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = day.split('-').map(Number);
  const days = Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000);
  if (days <= 0) return tr('today', 'hoy');
  if (days === 1) return tr('tomorrow', 'mañana');
  return tr(`in ${days} days`, `en ${days} días`);
}
