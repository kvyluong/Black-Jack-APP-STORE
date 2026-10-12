import { Card } from '../cards';
import { GameState, YOU, legalActions, newGame, splitShortfall } from '../game';
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

describe('splitShortfall', () => {
  it('is how many chips you are short when a pair can only not be split for money', () => {
    const g = yourTurn([c('8'), c('8')], 25, 10);
    expect(legalActions(g).split).toBe(false);
    expect(splitShortfall(g)).toBe(15);
  });

  it('is 0 when you can afford the split', () => {
    const g = yourTurn([c('8'), c('8')], 25, 25);
    expect(legalActions(g).split).toBe(true);
    expect(splitShortfall(g)).toBe(0);
  });

  it('is 0 when the hand is not a pair or is not yours', () => {
    expect(splitShortfall(yourTurn([c('8'), c('9')], 25, 0))).toBe(0);
    expect(splitShortfall(yourTurn([c('8'), c('8')], 25, 0, 'npc-1'))).toBe(0);
  });

  it('is 0 when the split is ruled out anyway (max hands reached)', () => {
    const g = yourTurn([c('8'), c('8')], 25, 0);
    const extra = Array.from({ length: DEFAULT_RULES.maxHands - 1 }, (_, i) => ({ ...g.hands[0], id: i + 2, done: true }));
    expect(splitShortfall({ ...g, hands: [...g.hands, ...extra] })).toBe(0);
  });
});
