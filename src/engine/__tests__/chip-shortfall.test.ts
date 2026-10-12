import { Card } from '../cards';
import { GameState, YOU, chipShortfall, legalActions, newGame } from '../game';
import { DEFAULT_RULES } from '../rules';

const c = (rank: Card['rank']): Card => ({ rank, suit: '♠' });

/** Your turn on one hand with `cards` and `bet`, holding `bankroll` chips off the table. */
function yourTurn(cards: Card[], bet: number, bankroll: number, owner = YOU): GameState {
  const g = newGame(DEFAULT_RULES, bankroll);
  return {
    ...g,
    phase: 'playing',
    active: 0,
    dealer: [c('9'), c('7')],
    hands: [{ id: 1, seat: 0, owner, cards, bet, doubled: false, done: false, fromSplit: false, splitAces: false, surrendered: false }],
  };
}

describe('chipShortfall', () => {
  it('is how many chips you are short when a pair can only not be split for money', () => {
    const g = yourTurn([c('8'), c('8')], 25, 10);
    expect(legalActions(g).split).toBe(false);
    expect(chipShortfall(g, 'split')).toBe(15);
  });

  it('is 0 when you can afford the split', () => {
    const g = yourTurn([c('8'), c('8')], 25, 25);
    expect(legalActions(g).split).toBe(true);
    expect(chipShortfall(g, 'split')).toBe(0);
  });

  it('is 0 when the hand is not a pair or is not yours', () => {
    expect(chipShortfall(yourTurn([c('8'), c('9')], 25, 0), 'split')).toBe(0);
    expect(chipShortfall(yourTurn([c('8'), c('8')], 25, 0, 'npc-1'), 'split')).toBe(0);
  });

  it('works the same for doubling, on any two cards', () => {
    const g = yourTurn([c('6'), c('5')], 20, 5);
    expect(legalActions(g).double).toBe(false);
    expect(chipShortfall(g, 'double')).toBe(15);
    expect(chipShortfall(yourTurn([c('6'), c('5')], 20, 20), 'double')).toBe(0);
    expect(chipShortfall(yourTurn([c('6'), c('5'), c('2')], 20, 0), 'double')).toBe(0);
  });

  it('is 0 for a double after a split when the rules forbid it', () => {
    const g = yourTurn([c('6'), c('5')], 20, 0);
    const hand = { ...g.hands[0], fromSplit: true };
    expect(chipShortfall({ ...g, rules: { ...g.rules, doubleAfterSplit: false }, hands: [hand] }, 'double')).toBe(0);
    expect(chipShortfall({ ...g, rules: { ...g.rules, doubleAfterSplit: true }, hands: [hand] }, 'double')).toBe(20);
  });

  it('is 0 when the split is ruled out anyway (max hands reached)', () => {
    const g = yourTurn([c('8'), c('8')], 25, 0);
    const extra = Array.from({ length: DEFAULT_RULES.maxHands - 1 }, (_, i) => ({ ...g.hands[0], id: i + 2, done: true }));
    expect(chipShortfall({ ...g, hands: [...g.hands, ...extra] }, 'split')).toBe(0);
  });
});
