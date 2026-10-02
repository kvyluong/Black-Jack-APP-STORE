import { Card, Rank, createShoe, seededRng } from '../cards';
import { decksRemaining, hiLoValue, runningCount, suggestedBetUnits, trueCount } from '../counting';
import { act, legalActions, newGame, resolveInsurance, startRound, GameState } from '../game';
import { describeHand, handValue, isBlackjack } from '../hand';
import { DEFAULT_RULES, Rules } from '../rules';
import { DecisionContext, basicAction, recommend } from '../strategy';

const c = (rank: Rank): Card => ({ rank, suit: '♠' });
const hand = (...ranks: Rank[]) => ranks.map(c);

function ctx(cards: Card[], up: Rank, extra: Partial<DecisionContext> = {}): DecisionContext {
  return { cards, dealerUp: up, rules: DEFAULT_RULES, canDouble: true, canSplit: true, canSurrender: true, ...extra };
}

/** Builds a game whose next draws (pop order) are exactly `draws`. */
function rigged(draws: Rank[], rules: Rules = DEFAULT_RULES, bankroll = 1000): GameState {
  const g = newGame(rules, bankroll, seededRng(1));
  const filler = createShoe(rules.decks, seededRng(2)).slice(0, 200);
  g.shoe = [...filler, ...draws.map(c).reverse()];
  g.shoeSize = 312;
  return g;
}

describe('hand values', () => {
  it('handles soft and hard totals', () => {
    expect(handValue(hand('A', '6'))).toEqual({ total: 17, soft: true });
    expect(handValue(hand('A', '6', '10'))).toEqual({ total: 17, soft: false });
    expect(handValue(hand('A', 'A', '9'))).toEqual({ total: 21, soft: true });
    expect(isBlackjack(hand('A', 'K'))).toBe(true);
    expect(describeHand(hand('10', '9', '5'))).toBe('Bust (24)');
  });
});

describe('Hi-Lo counting', () => {
  it('tags cards correctly', () => {
    expect(['2', '3', '4', '5', '6'].map((r) => hiLoValue(r as Rank))).toEqual([1, 1, 1, 1, 1]);
    expect(['7', '8', '9'].map((r) => hiLoValue(r as Rank))).toEqual([0, 0, 0]);
    expect(['10', 'J', 'Q', 'K', 'A'].map((r) => hiLoValue(r as Rank))).toEqual([-1, -1, -1, -1, -1]);
  });

  it('a full shoe counts to zero', () => {
    expect(runningCount(createShoe(6, seededRng(7)))).toBe(0);
  });

  it('computes true count from decks remaining', () => {
    expect(decksRemaining(156)).toBe(3);
    expect(trueCount(6, 156)).toBe(2);
    expect(decksRemaining(10)).toBe(0.5);
    expect(suggestedBetUnits(-2)).toBe(1);
    expect(suggestedBetUnits(5)).toBe(8);
  });
});

describe('basic strategy (6D S17 DAS LS)', () => {
  it.each<[Rank[], Rank, string]>([
    [['10', '6'], '10', 'surrender'],
    [['10', '6'], '6', 'stand'],
    [['10', '2'], '3', 'hit'],
    [['10', '2'], '4', 'stand'],
    [['6', '5'], 'A', 'hit'],
    [['6', '5'], '10', 'double'],
    [['A', '7'], '9', 'hit'],
    [['A', '7'], '7', 'stand'],
    [['A', '7'], '4', 'double'],
    [['8', '8'], '10', 'split'],
    [['A', 'A'], 'A', 'split'],
    [['10', 'K'], '6', 'stand'],
    [['9', '9'], '7', 'stand'],
    [['9', '9'], '8', 'split'],
    [['5', '5'], '9', 'double'],
    [['4', '4'], '5', 'split'],
  ])('%j vs %s → %s', (cards, up, expected) => {
    expect(basicAction(ctx(hand(...cards), up))).toBe(expected);
  });

  it('falls back when doubling or surrender are not allowed', () => {
    expect(basicAction(ctx(hand('A', '7'), '4', { canDouble: false }))).toBe('stand');
    expect(basicAction(ctx(hand('10', '6'), '10', { canSurrender: false }))).toBe('hit');
  });

  it('applies H17 differences', () => {
    const rules = { ...DEFAULT_RULES, dealerHitsSoft17: true };
    expect(basicAction(ctx(hand('6', '5'), 'A', { rules }))).toBe('double');
    expect(basicAction(ctx(hand('A', '8'), '6', { rules }))).toBe('double');
  });
});

describe('count deviations', () => {
  it('stands 16 vs 10 at true count 0+ when surrender is unavailable', () => {
    const base = ctx(hand('10', '6'), '10', { canSurrender: false });
    expect(recommend({ ...base, trueCount: -1 }).action).toBe('hit');
    const r = recommend({ ...base, trueCount: 0.5 });
    expect(r.action).toBe('stand');
    expect(r.deviation?.id).toBe('16v10');
  });

  it('splits tens vs 6 at +4', () => {
    expect(recommend({ ...ctx(hand('K', 'Q'), '6'), trueCount: 4 }).action).toBe('split');
    expect(recommend({ ...ctx(hand('K', 'Q'), '6'), trueCount: 3 }).action).toBe('stand');
  });

  it('always explains its advice', () => {
    expect(recommend(ctx(hand('10', '2'), '3')).reason.length).toBeGreaterThan(10);
  });
});

describe('game flow', () => {
  it('pays 3:2 for a natural blackjack', () => {
    // Draw order: player, dealer up, player, dealer hole.
    let g = rigged(['A', '9', 'K', '7']);
    g = startRound(g, 10);
    expect(g.phase).toBe('roundOver');
    expect(g.hands[0].outcome).toBe('blackjack');
    expect(g.bankroll).toBe(1015);
  });

  it('dealer peeks and wins with blackjack; insurance pays 2:1', () => {
    let g = rigged(['10', 'A', '9', 'K']);
    g = startRound(g, 10);
    expect(g.phase).toBe('insurance');
    g = resolveInsurance(g, true);
    expect(g.phase).toBe('roundOver');
    expect(g.hands[0].outcome).toBe('lose');
    expect(g.bankroll).toBe(1000); // -10 hand, +10 net insurance
  });

  it('doubles, splits and settles against a dealer bust', () => {
    // Player 8,8 vs dealer 6 (hole 10). Split: hands get 3 and 2, double first, ...
    let g = rigged(['8', '6', '8', '10', '3', '2', '10', '10', '9']);
    g = startRound(g, 10);
    expect(legalActions(g).split).toBe(true);
    g = act(g, 'split');
    expect(g.hands.map((h) => h.cards.length)).toEqual([2, 2]);
    g = act(g, 'double'); // 8,3 + 10 = 21
    expect(g.active).toBe(1);
    g = act(g, 'hit'); // 8,2 + 10 = 20
    g = act(g, 'stand'); // dealer 6,10 draws 9 → 25 bust
    expect(g.phase).toBe('roundOver');
    expect(g.hands.map((h) => h.outcome)).toEqual(['win', 'win']);
    expect(g.bankroll).toBe(1030);
  });

  it('tracks the running count, revealing the hole card only at the end', () => {
    let g = rigged(['5', '6', '10', '2', '9']);
    g = startRound(g, 10);
    expect(g.runningCount).toBe(1); // 5, 6, 10 visible; hole 2 hidden
    g = act(g, 'stand');
    expect(g.holeRevealed).toBe(true);
    expect(g.runningCount).toBe(2); // + hole 2, dealer draws 9 (0)
  });

  it('surrender returns half the bet', () => {
    let g = rigged(['10', '10', '6', '7']);
    g = startRound(g, 10);
    g = act(g, 'surrender');
    expect(g.bankroll).toBe(995);
  });
});

describe('simulation', () => {
  it('plays thousands of rounds with basic strategy without errors and a small house edge', () => {
    const rng = seededRng(42);
    let g = newGame(DEFAULT_RULES, 1e9, rng);
    let wagered = 0;
    const start = g.bankroll;
    for (let i = 0; i < 20000; i++) {
      g = startRound(g, 10, rng);
      if (g.phase === 'insurance') g = resolveInsurance(g, false, rng);
      while (g.phase === 'playing') {
        const legal = legalActions(g);
        const h = g.hands[g.active];
        const r = recommend(ctx(h.cards, g.dealer[0].rank, { canDouble: legal.double, canSplit: legal.split, canSurrender: legal.surrender }));
        g = act(g, r.action, rng);
      }
      wagered += g.hands.reduce((sum, h) => sum + h.bet, 0);
    }
    const edge = (g.bankroll - start) / wagered;
    expect(edge).toBeGreaterThan(-0.03);
    expect(edge).toBeLessThan(0.02);
  });
});
