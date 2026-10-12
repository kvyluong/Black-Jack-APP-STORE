import { Card, Rank } from '../cards';
import { DEFAULT_RULES } from '../rules';
import { DecisionContext, recommend } from '../strategy';

const hand = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: '♠' }));
const ctx = (cards: Card[], dealerUp: Rank, over: Partial<DecisionContext> = {}): DecisionContext => ({
  cards,
  dealerUp,
  rules: DEFAULT_RULES,
  canDouble: false,
  canSplit: false,
  canSurrender: false,
  ...over,
});

describe('count plays on pairs that are played as a total', () => {
  it('stands 8,8 vs 10 at +2 when it cannot be split, like any 16', () => {
    expect(recommend(ctx(hand('8', '8'), '10', { trueCount: 2 })).action).toBe('stand');
    expect(recommend(ctx(hand('9', '7'), '10', { trueCount: 2 })).action).toBe('stand');
  });

  it('still splits 8,8 vs 10 when it can be split', () => {
    expect(recommend(ctx(hand('8', '8'), '10', { trueCount: 2, canSplit: true })).action).toBe('split');
  });

  it('stands 6,6 vs 2 at +4 when the chart does not split it (no double after split)', () => {
    const rules = { ...DEFAULT_RULES, doubleAfterSplit: false };
    expect(recommend(ctx(hand('6', '6'), '2', { trueCount: 4, canSplit: true, rules })).action).toBe('stand');
    expect(recommend(ctx(hand('6', '6'), '2', { trueCount: 0, canSplit: true, rules })).action).toBe('hit');
  });
});
