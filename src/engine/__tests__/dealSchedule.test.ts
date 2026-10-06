import { Card, Rank, createShoe, seededRng } from '../cards';
import { DEAL_STEP_MS, cardDelay, dealSchedule, hapticSchedule } from '../dealSchedule';
import { GameState, act, newGame, startRound } from '../game';
import { DEFAULT_RULES } from '../rules';

const c = (rank: Rank): Card => ({ rank, suit: '♣' });

function rigged(draws: Rank[]): GameState {
  const g = newGame(DEFAULT_RULES, 1000, seededRng(1));
  g.shoe = [...createShoe(6, seededRng(2)).slice(0, 200), ...draws.map(c).reverse()];
  g.shoeSize = 312;
  g.justShuffled = false;
  return g;
}

describe('dealSchedule', () => {
  it('deals the opening cards one at a time in casino order', () => {
    const g0 = rigged(['10', '6', '7', '9']);
    const g1 = startRound(g0, 10);
    const s = dealSchedule(g0, g1);
    expect(s.cards.map((x) => [x.seat, x.index])).toEqual([[0, 0], ['dealer', 0], [0, 1], ['dealer', 1]]);
    expect(cardDelay(s, 'dealer', 1)).toBe(3 * DEAL_STEP_MS);
    expect(s.sounds.filter((x) => x.name === 'card')).toHaveLength(4);
    expect(s.holeFlipAt).toBeNull();
  });

  it('flips the hole card, then deals dealer hits, then plays the result', () => {
    // Player 10,7 vs dealer 6 + hole 9 (15), dealer draws 10 and busts.
    const g1 = startRound(rigged(['10', '6', '7', '9', '10']), 10);
    const g2 = act(g1, 'stand');
    const s = dealSchedule(g1, g2);
    expect(s.holeFlipAt).toBe(0);
    expect(s.cards).toEqual([{ seat: 'dealer', index: 2, at: DEAL_STEP_MS }]);
    const result = s.sounds.find((x) => x.name === 'win');
    expect(result?.at).toBe(s.doneAt);
    expect(s.doneAt).toBeGreaterThan(DEAL_STEP_MS);
  });

  it('animates only the new card on a hit', () => {
    const g1 = startRound(rigged(['10', '6', '2', '9', '3']), 10);
    const g2 = act(g1, 'hit');
    const s = dealSchedule(g1, g2);
    expect(s.cards).toEqual([{ seat: 0, index: 2, at: 0 }]);
  });

  it('plays a shuffle first when the shoe was just shuffled', () => {
    const g0 = rigged(['10', '6', '7', '9']);
    g0.shoe = g0.shoe.slice(-4); // nearly empty shoe forces a reshuffle
    const g1 = startRound(g0, 10);
    const s = dealSchedule(g0, g1);
    expect(s.sounds[0].name).toBe('shuffle');
    expect(s.cards[0].at).toBeGreaterThan(0);
  });

  it('is instant with step 0', () => {
    const g0 = rigged(['10', '6', '7', '9']);
    const s = dealSchedule(g0, startRound(g0, 10), 0);
    expect(s.doneAt).toBe(0);
    expect(s.cards.every((x) => x.at === 0)).toBe(true);
  });
});

describe('hapticSchedule', () => {
  it('taps as your cards land, not the dealer cards', () => {
    const g0 = rigged(['10', '6', '7', '9']);
    const g1 = startRound(g0, 10);
    const h = hapticSchedule(g1, dealSchedule(g0, g1));
    expect(h.map((x) => x.kind)).toEqual(['cardLand', 'cardLand']);
    expect(h[1].at).toBeGreaterThan(h[0].at);
  });

  it('adds a flip tap and a win pattern when the round ends in your favor', () => {
    const g1 = startRound(rigged(['10', '6', '7', '9', '10']), 10);
    const g2 = act(g1, 'stand');
    const kinds = hapticSchedule(g2, dealSchedule(g1, g2)).map((x) => x.kind);
    expect(kinds).toEqual(['flip', 'win']);
  });

  it('celebrates a blackjack and buzzes a bust', () => {
    const bj0 = rigged(['A', '9', 'K', '7']);
    const bj = startRound(bj0, 10);
    expect(hapticSchedule(bj, dealSchedule(bj0, bj)).at(-1)?.kind).toBe('blackjack');
    const b1 = startRound(rigged(['10', '6', '6', '9', 'K']), 10);
    const b2 = act(b1, 'hit');
    expect(hapticSchedule(b2, dealSchedule(b1, b2)).map((x) => x.kind)).toEqual(['cardLand', 'flip', 'bust']);
  });
});
