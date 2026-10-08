import { Card, Rng, createShoe, isTenValue } from './cards';
import { cardTag, initialRunningCount, trueCount } from './counting';
import { handValue, isBlackjack, isBust, isPair } from './hand';
import { Rules } from './rules';
import { Action, DecisionContext } from './strategy';

export type Phase = 'betting' | 'insurance' | 'playing' | 'roundOver';
export type Outcome = 'win' | 'lose' | 'push' | 'blackjack' | 'surrender';

/** Owner id for the person using the app; other hands belong to computer players. */
export const YOU = 'you';

export interface PlayerHand {
  /** Stable id for this hand within the round (survives splits shifting positions). */
  id: number;
  /** Table position, 0 = first base (dealt first). Split hands keep their seat. */
  seat: number;
  /** Who plays this hand: `YOU` or a computer player's id. */
  owner: string;
  cards: Card[];
  bet: number;
  doubled: boolean;
  done: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  surrendered: boolean;
  outcome?: Outcome;
  /** Amount returned to the bankroll for this hand (stake included). */
  payout?: number;
}

export interface GameState {
  rules: Rules;
  shoe: Card[];
  shoeSize: number;
  /** Running count (in the chosen counting system) of every card seen since the last shuffle. */
  runningCount: number;
  /** Hi-Lo count of the same cards, kept for the computer card counters at the table. */
  hiLoCount: number;
  /** Set when the most recent round started from a freshly shuffled shoe. */
  justShuffled: boolean;
  /** Your bankroll. Computer players' money is tracked by the table simulation. */
  bankroll: number;
  phase: Phase;
  dealer: Card[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  /** Your total insurance stake this round. */
  insuranceBet: number;
  /** Your bankroll change over the last completed round. */
  lastNet: number;
  roundStartBankroll: number;
  /** Next PlayerHand id. */
  nextHandId: number;
  /**
   * Chips each computer player can still put out this round (doubles and splits),
   * keyed by owner id. Owners missing here are assumed to have enough.
   */
  npcChips?: Record<string, number>;
}

export function newGame(rules: Rules, bankroll: number, rng: Rng = Math.random): GameState {
  const shoe = createShoe(rules.decks, rng);
  return {
    rules,
    shoe,
    shoeSize: shoe.length,
    runningCount: initialRunningCount(rules.decks),
    hiLoCount: 0,
    justShuffled: true,
    bankroll,
    phase: 'betting',
    dealer: [],
    holeRevealed: false,
    hands: [],
    active: 0,
    insuranceBet: 0,
    lastNet: 0,
    roundStartBankroll: bankroll,
    nextHandId: 1,
  };
}

/** Cards to keep in the shoe per hand at the table (plus the dealer), so a round rarely runs out. */
const CARDS_PER_HAND = 4;

/** Past the cut card, or too few cards left for a round with this many hands. */
export function needsShuffle(s: GameState, hands = 1): boolean {
  return s.shoeSize - s.shoe.length >= s.shoeSize * s.rules.penetration || s.shoe.length < (hands + 1) * CARDS_PER_HAND;
}

/**
 * Shuffles between rounds when the cut card has come out, like a real dealer does
 * before anyone bets, so bet advice uses the new shoe's count. `hands` is how many
 * hands the next round will have.
 */
export function shuffleIfNeeded(prev: GameState, hands = 1, rng: Rng = Math.random): GameState {
  if (prev.phase !== 'betting' && prev.phase !== 'roundOver') return prev;
  if (!needsShuffle(prev, hands)) return { ...prev, justShuffled: false };
  const shoe = createShoe(prev.rules.decks, rng);
  return { ...prev, shoe, shoeSize: shoe.length, runningCount: initialRunningCount(prev.rules.decks), hiLoCount: 0, justShuffled: true };
}

export function currentTrueCount(s: GameState): number {
  return trueCount(s.runningCount, s.shoe.length);
}

/** Hi-Lo true count, which the computer card counters use whatever system you count with. */
export function hiLoTrueCount(s: GameState): number {
  return trueCount(s.hiLoCount ?? 0, s.shoe.length, 'hiLo');
}

/** Draws a card. `visible` cards update the running count; the hole card is counted when revealed. */
function draw(s: GameState, visible: boolean, rng: Rng): Card {
  if (s.shoe.length === 0) {
    // Out of cards mid-round: reshuffle everything except the cards on the table, as a dealer
    // would with the discards. The count restarts from the visible cards still in play (the
    // hole card is added when it's revealed, as usual).
    const inPlay = [...s.dealer, ...s.hands.flatMap((h) => h.cards)];
    const fresh = createShoe(s.rules.decks, rng);
    for (const c of inPlay) {
      const i = fresh.findIndex((x) => x.rank === c.rank && x.suit === c.suit);
      if (i >= 0) fresh.splice(i, 1);
    }
    const hole = s.dealer.length > 1 && !s.holeRevealed ? s.dealer[1] : null;
    s.shoe = fresh;
    s.shoeSize = fresh.length + inPlay.length;
    s.runningCount =
      initialRunningCount(s.rules.decks) + inPlay.filter((c) => c !== hole).reduce((sum, c) => sum + cardTag(c.rank), 0);
    s.hiLoCount = inPlay.filter((c) => c !== hole).reduce((sum, c) => sum + cardTag(c.rank, 'hiLo'), 0);
    s.justShuffled = true;
  }
  const card = s.shoe.pop()!;
  if (visible) {
    s.runningCount += cardTag(card.rank);
    s.hiLoCount += cardTag(card.rank, 'hiLo');
  }
  return card;
}

function clone(s: GameState): GameState {
  return {
    ...s,
    shoe: s.shoe.slice(),
    dealer: s.dealer.slice(),
    hands: s.hands.map((h) => ({ ...h, cards: h.cards.slice() })),
    npcChips: s.npcChips ? { ...s.npcChips } : undefined,
  };
}

function newHand(s: GameState, seat: number, owner: string, cards: Card[], bet: number, fromSplit = false): PlayerHand {
  return { id: s.nextHandId++, seat, owner, cards, bet, doubled: false, done: false, fromSplit, splitAces: false, surrendered: false };
}

export const isYours = (h: PlayerHand | undefined) => h?.owner === YOU;

/** One bet in the betting circle at a seat. */
export interface SeatBet {
  seat: number;
  owner: string;
  bet: number;
  /** A computer player's chips left after this bet, for doubles and splits. */
  chipsLeft?: number;
}

/**
 * Deals a new round. Pass a single number to play one hand alone, or one
 * `SeatBet` per occupied seat. Cards go around the table in seat order,
 * like a real dealer: one card to each seat, the dealer's upcard, a second
 * card to each seat, then the dealer's hole card.
 */
export function startRound(prev: GameState, bets: number | SeatBet[], rng: Rng = Math.random): GameState {
  if (prev.phase !== 'betting' && prev.phase !== 'roundOver') throw new Error('Round in progress');
  const seatBets = (typeof bets === 'number' ? [{ seat: 0, owner: YOU, bet: bets }] : bets)
    .slice()
    .sort((a, b) => a.seat - b.seat);
  const yourTotal = seatBets.filter((b) => b.owner === YOU).reduce((sum, b) => sum + b.bet, 0);
  if (seatBets.length === 0 || seatBets.some((b) => b.bet <= 0) || yourTotal > prev.bankroll) {
    throw new Error('Invalid bet');
  }
  let s = clone(prev);
  // Normally already shuffled between rounds (shuffleIfNeeded); this is the fallback.
  // A full, untouched shoe means this is the first round after a shuffle.
  s.justShuffled = s.shoe.length === s.shoeSize;
  if (needsShuffle(s, seatBets.length)) {
    s.shoe = createShoe(s.rules.decks, rng);
    s.shoeSize = s.shoe.length;
    s.runningCount = initialRunningCount(s.rules.decks);
    s.hiLoCount = 0;
    s.justShuffled = true;
  }
  s.roundStartBankroll = s.bankroll;
  s.bankroll -= yourTotal;
  s.insuranceBet = 0;
  s.lastNet = 0;
  s.holeRevealed = false;
  s.active = 0;

  s.npcChips = Object.fromEntries(seatBets.filter((b) => b.owner !== YOU && b.chipsLeft !== undefined).map((b) => [b.owner, b.chipsLeft!]));
  s.hands = seatBets.map((b) => newHand(s, b.seat, b.owner, [], b.bet));
  for (const h of s.hands) h.cards.push(draw(s, true, rng));
  const up = draw(s, true, rng);
  for (const h of s.hands) h.cards.push(draw(s, true, rng));
  const hole = draw(s, false, rng);
  s.dealer = [up, hole];

  if (up.rank === 'A') {
    s.phase = 'insurance';
    return s;
  }
  return afterPeek(s, rng);
}

export function resolveInsurance(prev: GameState, take: boolean, rng: Rng = Math.random): GameState {
  if (prev.phase !== 'insurance') throw new Error('Insurance not offered');
  const s = clone(prev);
  if (take) {
    // Half of each of your bets, as far as your bankroll covers it.
    const wanted = s.hands.filter(isYours).reduce((sum, h) => sum + h.bet / 2, 0);
    const amount = Math.min(wanted, s.bankroll);
    s.insuranceBet = amount;
    s.bankroll -= amount;
  }
  return afterPeek(s, rng);
}

function revealHole(s: GameState) {
  if (!s.holeRevealed) {
    s.holeRevealed = true;
    s.runningCount += cardTag(s.dealer[1].rank);
    s.hiLoCount += cardTag(s.dealer[1].rank, 'hiLo');
  }
}

/** Dealer peeks for blackjack with an Ace or 10 up (US rules), then play begins. */
function afterPeek(s: GameState, rng: Rng): GameState {
  const up = s.dealer[0].rank;
  const peeks = up === 'A' || isTenValue(up);
  if (peeks && isBlackjack(s.dealer)) {
    revealHole(s);
    // Insurance pays 2:1, returned with the stake.
    s.bankroll += s.insuranceBet * 3;
    for (const h of s.hands) h.done = true;
    return settle(s);
  }
  // Naturals are paid at the end; those hands need no decisions.
  for (const h of s.hands) if (isBlackjack(h.cards)) h.done = true;
  s.phase = 'playing';
  s.active = 0;
  return advance(s, rng);
}

export interface LegalActions {
  hit: boolean;
  stand: boolean;
  double: boolean;
  split: boolean;
  surrender: boolean;
}

export function legalActions(s: GameState): LegalActions {
  const none = { hit: false, stand: false, double: false, split: false, surrender: false };
  if (s.phase !== 'playing') return none;
  const h = s.hands[s.active];
  if (!h || h.done) return none;
  const two = h.cards.length === 2;
  const npcLeft = s.npcChips?.[h.owner];
  const canAfford = isYours(h) ? s.bankroll >= h.bet : npcLeft === undefined || npcLeft >= h.bet;
  const handsAtSeat = s.hands.filter((x) => x.seat === h.seat).length;
  return {
    hit: true,
    stand: true,
    double: two && canAfford && (!h.fromSplit || s.rules.doubleAfterSplit),
    split: two && isPair(h.cards) && canAfford && handsAtSeat < s.rules.maxHands && !h.splitAces,
    surrender: s.rules.lateSurrender && two && !h.fromSplit,
  };
}

/** Builds the strategy context for the active hand, for coaching. */
export function decisionContext(s: GameState, withCount: boolean): DecisionContext | null {
  if (s.phase !== 'playing') return null;
  const legal = legalActions(s);
  return {
    cards: s.hands[s.active].cards,
    dealerUp: s.dealer[0].rank,
    rules: s.rules,
    canDouble: legal.double,
    canSplit: legal.split,
    canSurrender: legal.surrender,
    trueCount: withCount ? currentTrueCount(s) : undefined,
  };
}

export function act(prev: GameState, action: Action, rng: Rng = Math.random): GameState {
  const legal = legalActions(prev);
  if (!legal[action]) throw new Error(`Illegal action: ${action}`);
  const s = clone(prev);
  const h = s.hands[s.active];

  switch (action) {
    case 'hit':
      h.cards.push(draw(s, true, rng));
      if (handValue(h.cards).total >= 21) h.done = true;
      break;
    case 'stand':
      h.done = true;
      break;
    case 'double':
      spend(s, h);
      h.bet *= 2;
      h.doubled = true;
      h.cards.push(draw(s, true, rng));
      h.done = true;
      break;
    case 'surrender':
      h.surrendered = true;
      h.done = true;
      break;
    case 'split': {
      spend(s, h);
      const aces = h.cards[0].rank === 'A';
      const second = newHand(s, h.seat, h.owner, [h.cards[1]], h.bet, true);
      // Both halves sit on the table before new cards are drawn (matters if the shoe runs out).
      h.cards = [h.cards[0]];
      h.fromSplit = true;
      s.hands.splice(s.active + 1, 0, second);
      h.cards.push(draw(s, true, rng));
      second.cards.push(draw(s, true, rng));
      if (aces) {
        for (const x of [h, second]) {
          x.splitAces = true;
          x.done = true;
        }
      } else {
        // A split hand that makes 21 needs no further decisions.
        for (const x of [h, second]) if (handValue(x.cards).total === 21) x.done = true;
      }
      break;
    }
  }
  return advance(s, rng);
}

/** Puts out another bet the size of `h`'s (double or split), from you or a computer player. */
function spend(s: GameState, h: PlayerHand) {
  if (isYours(h)) s.bankroll -= h.bet;
  else if (s.npcChips?.[h.owner] !== undefined) s.npcChips[h.owner] -= h.bet;
}

function advance(s: GameState, rng: Rng): GameState {
  while (s.active < s.hands.length && s.hands[s.active].done) s.active++;
  if (s.active < s.hands.length) return s;
  s.active = s.hands.length - 1;
  revealHole(s);
  // The dealer only draws if some hand still needs beating (not bust, surrendered or a natural).
  const live = s.hands.some((h) => !h.surrendered && !isBust(h.cards) && !(isBlackjack(h.cards) && !h.fromSplit));
  if (live) {
    while (dealerShouldHit(s.dealer, s.rules)) s.dealer.push(draw(s, true, rng));
  }
  return settle(s);
}

export function dealerShouldHit(cards: Card[], rules: Rules): boolean {
  const { total, soft } = handValue(cards);
  if (total < 17) return true;
  return total === 17 && soft && rules.dealerHitsSoft17;
}

function settle(s: GameState): GameState {
  const dealerBj = isBlackjack(s.dealer);
  const dealerTotal = handValue(s.dealer).total;
  const dealerBust = dealerTotal > 21;

  for (const h of s.hands) {
    const playerBj = isBlackjack(h.cards) && !h.fromSplit;
    const total = handValue(h.cards).total;
    let outcome: Outcome;
    let payout: number;
    if (h.surrendered) {
      outcome = 'surrender';
      payout = h.bet / 2;
    } else if (dealerBj) {
      outcome = playerBj ? 'push' : 'lose';
      payout = playerBj ? h.bet : 0;
    } else if (playerBj) {
      outcome = 'blackjack';
      payout = h.bet + h.bet * s.rules.blackjackPayout;
    } else if (total > 21) {
      outcome = 'lose';
      payout = 0;
    } else if (dealerBust || total > dealerTotal) {
      outcome = 'win';
      payout = h.bet * 2;
    } else if (total === dealerTotal) {
      outcome = 'push';
      payout = h.bet;
    } else {
      outcome = 'lose';
      payout = 0;
    }
    h.outcome = outcome;
    h.payout = payout;
    h.done = true;
    if (isYours(h)) s.bankroll += payout;
  }
  s.lastNet = s.bankroll - s.roundStartBankroll;
  s.phase = 'roundOver';
  return s;
}
