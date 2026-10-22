// Stress test: thousands of random rounds under random rules, seats and plays, checking
// that money, cards and the count always add up. Seeded, so any failure reproduces.
import { Card, RANKS, Rng, seededRng } from '../cards';
import { cardTag } from '../counting';
import { Action } from '../strategy';
import { GameState, SeatBet, YOU, act, isYours, legalActions, needsShuffle, newGame, resolveInsurance, shuffleIfNeeded, startRound } from '../game';
import { handValue, isBlackjack } from '../hand';
import { Rules } from '../rules';

const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];
const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

function randomRules(rng: Rng): Rules {
  return {
    decks: pick(rng, [1, 2, 4, 6, 8]),
    dealerHitsSoft17: rng() < 0.5,
    doubleAfterSplit: rng() < 0.5,
    lateSurrender: rng() < 0.5,
    blackjackPayout: pick(rng, [1.5, 1.2]),
    maxHands: pick(rng, [2, 3, 4]),
    // Up to deep penetration, so rounds run the shoe dry and reshuffle mid-round.
    penetration: pick(rng, [0.5, 0.75, 0.9, 0.99]),
  };
}

/** Every card of the shoe once (rank multiset), to check nothing is lost or duplicated. */
const rankCounts = (cards: Card[]) => {
  const m: Record<string, number> = {};
  for (const c of cards) m[c.rank] = (m[c.rank] ?? 0) + 1;
  return m;
};

function checkRound(before: GameState, s: GameState, label: string) {
  expect(s.phase).toBe('roundOver');
  // Money: your bankroll changed by exactly your payouts minus your stakes and insurance.
  const yours = s.hands.filter(isYours);
  const staked = yours.reduce((sum, h) => sum + h.bet, 0);
  const paid = yours.reduce((sum, h) => sum + (h.payout ?? NaN), 0);
  const dealerBj = isBlackjack(s.dealer);
  const insurance = dealerBj ? s.insuranceBet * 2 : -s.insuranceBet;
  expect(s.lastNet).toBeCloseTo(paid - staked + insurance, 9);
  expect(s.bankroll).toBeCloseTo(before.bankroll + s.lastNet, 9);
  expect(Number.isFinite(s.bankroll) && s.bankroll >= 0).toBe(true);
  for (const h of s.hands) {
    const total = handValue(h.cards).total;
    // Payouts are one of the legal multiples of the (final) bet.
    const m = (h.payout ?? NaN) / h.bet;
    expect([0, 0.5, 1, 2, 1 + s.rules.blackjackPayout]).toContainEqual(expect.closeTo(m, 9));
    if (total > 21 && !h.surrendered) expect(h.outcome).toBe('lose');
    if (h.splitAces) expect(h.cards).toHaveLength(2);
    if (h.doubled) expect(h.cards).toHaveLength(h.fromSplit && h.cards[0].rank === 'A' ? 2 : 3);
    expect(h.cards.length).toBeGreaterThanOrEqual(2);
  }
  // The dealer stood where the rules say (unless nobody was left to beat).
  const d = handValue(s.dealer);
  if (s.dealer.length > 2) expect(d.total).toBeGreaterThanOrEqual(17);
  // Seats never split past the limit.
  const perSeat = rankCounts(s.hands.map((h) => ({ rank: String(h.seat), suit: '♠' }) as unknown as Card));
  for (const n of Object.values(perSeat)) expect(n).toBeLessThanOrEqual(s.rules.maxHands);
  // Cards: what's on the table plus what's left never exceeds a full shoe of each rank.
  const all = rankCounts([...s.shoe, ...s.dealer, ...s.hands.flatMap((h) => h.cards)]);
  for (const r of RANKS) expect(all[r] ?? 0).toBeLessThanOrEqual(4 * s.rules.decks);
  // Count: with the hole card shown, the Hi-Lo count is minus the tags left in the shoe (a balanced system).
  if (s.holeRevealed) {
    const left = s.shoe.reduce((sum, c) => sum + cardTag(c.rank, 'hiLo'), 0);
    if (s.hiLoCount + left !== 0) throw new Error(`${label}: count ${s.hiLoCount} vs ${-left}`);
  }
}

describe('fuzz: random rounds keep money, cards and the count consistent', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i', (seed) => {
    const rng = seededRng(seed * 7919);
    const rules = randomRules(rng);
    let s = newGame(rules, 1_000_000, rng);
    for (let round = 0; round < 700; round++) {
      const seats = 1 + Math.floor(rng() * 7);
      const bets: SeatBet[] = Array.from({ length: seats }, (_, seat) => {
        const mine = seat === 0 || rng() < 0.25;
        return mine
          ? { seat, owner: YOU, bet: pick(rng, [5, 10, 25, 15, 7]) }
          : { seat, owner: `npc${seat}`, bet: pick(rng, [5, 10, 50]), chipsLeft: pick(rng, [0, 5, 100, 1000]) };
      });
      s = shuffleIfNeeded(s, seats, rng);
      expect(needsShuffle(s, seats)).toBe(false);
      const before = s;
      s = startRound(s, bets, rng);
      if (s.phase === 'insurance') s = resolveInsurance(s, rng() < 0.5, rng);
      let steps = 0;
      while (s.phase === 'playing') {
        const legal = legalActions(s);
        const options = ACTIONS.filter((a) => legal[a]);
        expect(options.length).toBeGreaterThan(0);
        s = act(s, pick(rng, options), rng);
        if (++steps > 500) throw new Error(`seed ${seed} round ${round}: never finished`);
      }
      checkRound(before, s, `seed ${seed} round ${round}`);
    }
  });

  it('survives a one-deck shoe running dry mid-round with every seat splitting', () => {
    const rng = seededRng(42);
    const rules: Rules = { decks: 1, dealerHitsSoft17: true, doubleAfterSplit: true, lateSurrender: false, blackjackPayout: 1.5, maxHands: 4, penetration: 0.99 };
    let s = newGame(rules, 10_000_000, rng);
    for (let round = 0; round < 1200; round++) {
      s = shuffleIfNeeded(s, 7, rng);
      const before = s;
      s = startRound(s, Array.from({ length: 7 }, (_, seat) => ({ seat, owner: YOU, bet: 10 })), rng);
      if (s.phase === 'insurance') s = resolveInsurance(s, true, rng);
      while (s.phase === 'playing') {
        const l = legalActions(s);
        s = act(s, l.split ? 'split' : l.double ? 'double' : 'hit', rng);
      }
      checkRound(before, s, `dry round ${round}`);
    }
  });
});
