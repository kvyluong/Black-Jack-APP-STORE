import { Card, Rng, createShoe, isTenValue } from './cards';
import { hiLoValue, trueCount } from './counting';
import { handValue, isBlackjack, isBust, isPair } from './hand';
import { Rules } from './rules';
import { Action, DecisionContext } from './strategy';

export type Phase = 'betting' | 'insurance' | 'playing' | 'roundOver';
export type Outcome = 'win' | 'lose' | 'push' | 'blackjack' | 'surrender';

export interface PlayerHand {
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
  /** Hi-Lo running count of every card the player has seen since the last shuffle. */
  runningCount: number;
  /** Set when the most recent round started from a freshly shuffled shoe. */
  justShuffled: boolean;
  bankroll: number;
  phase: Phase;
  dealer: Card[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  insuranceBet: number;
  /** Bankroll change over the last completed round. */
  lastNet: number;
  roundStartBankroll: number;
}

export function newGame(rules: Rules, bankroll: number, rng: Rng = Math.random): GameState {
  const shoe = createShoe(rules.decks, rng);
  return {
    rules,
    shoe,
    shoeSize: shoe.length,
    runningCount: 0,
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
  };
}

export function needsShuffle(s: GameState): boolean {
  return s.shoeSize - s.shoe.length >= s.shoeSize * s.rules.penetration;
}

export function currentTrueCount(s: GameState): number {
  return trueCount(s.runningCount, s.shoe.length);
}

/** Draws a card. `visible` cards update the running count; the hole card is counted when revealed. */
function draw(s: GameState, visible: boolean, rng: Rng): Card {
  if (s.shoe.length === 0) {
    s.shoe = createShoe(s.rules.decks, rng);
    s.shoeSize = s.shoe.length;
    s.runningCount = 0;
    s.justShuffled = true;
  }
  const card = s.shoe.pop()!;
  if (visible) s.runningCount += hiLoValue(card.rank);
  return card;
}

function clone(s: GameState): GameState {
  return {
    ...s,
    shoe: s.shoe.slice(),
    dealer: s.dealer.slice(),
    hands: s.hands.map((h) => ({ ...h, cards: h.cards.slice() })),
  };
}

function newHand(cards: Card[], bet: number, fromSplit = false): PlayerHand {
  return { cards, bet, doubled: false, done: false, fromSplit, splitAces: false, surrendered: false };
}

export function startRound(prev: GameState, bet: number, rng: Rng = Math.random): GameState {
  if (prev.phase !== 'betting' && prev.phase !== 'roundOver') throw new Error('Round in progress');
  if (bet <= 0 || bet > prev.bankroll) throw new Error('Invalid bet');
  let s = clone(prev);
  s.justShuffled = false;
  if (needsShuffle(s)) {
    s.shoe = createShoe(s.rules.decks, rng);
    s.shoeSize = s.shoe.length;
    s.runningCount = 0;
    s.justShuffled = true;
  }
  s.roundStartBankroll = s.bankroll;
  s.bankroll -= bet;
  s.insuranceBet = 0;
  s.lastNet = 0;
  s.holeRevealed = false;
  s.active = 0;

  const p1 = draw(s, true, rng);
  const up = draw(s, true, rng);
  const p2 = draw(s, true, rng);
  const hole = draw(s, false, rng);
  s.hands = [newHand([p1, p2], bet)];
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
    const amount = Math.min(s.hands[0].bet / 2, s.bankroll);
    s.insuranceBet = amount;
    s.bankroll -= amount;
  }
  return afterPeek(s, rng);
}

function revealHole(s: GameState) {
  if (!s.holeRevealed) {
    s.holeRevealed = true;
    s.runningCount += hiLoValue(s.dealer[1].rank);
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
  if (isBlackjack(s.hands[0].cards)) {
    s.hands[0].done = true;
    revealHole(s);
    return settle(s);
  }
  s.phase = 'playing';
  return s;
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
  const canAfford = s.bankroll >= h.bet;
  return {
    hit: true,
    stand: true,
    double: two && canAfford && (!h.fromSplit || s.rules.doubleAfterSplit),
    split: two && isPair(h.cards) && canAfford && s.hands.length < s.rules.maxHands && !h.splitAces,
    surrender: s.rules.lateSurrender && two && s.hands.length === 1 && !h.fromSplit,
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
      s.bankroll -= h.bet;
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
      s.bankroll -= h.bet;
      const aces = h.cards[0].rank === 'A';
      const second = newHand([h.cards[1]], h.bet, true);
      h.cards = [h.cards[0], draw(s, true, rng)];
      h.fromSplit = true;
      second.cards.push(draw(s, true, rng));
      s.hands.splice(s.active + 1, 0, second);
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

function advance(s: GameState, rng: Rng): GameState {
  while (s.active < s.hands.length && s.hands[s.active].done) s.active++;
  if (s.active < s.hands.length) return s;
  s.active = s.hands.length - 1;
  revealHole(s);
  const live = s.hands.some((h) => !h.surrendered && !isBust(h.cards));
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
    s.bankroll += payout;
  }
  s.lastNet = s.bankroll - s.roundStartBankroll;
  s.phase = 'roundOver';
  return s;
}
