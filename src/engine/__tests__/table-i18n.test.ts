import { setLang } from '../../i18n/lang';
import { Card, Rank, createShoe, seededRng } from '../cards';
import { GameState, YOU, act, newGame, startRound } from '../game';
import { describeHand } from '../hand';
import { roundFanfare } from '../juice';
import { DEFAULT_RULES } from '../rules';
import { Npc, STYLE_LABEL, Table, betweenRounds } from '../table';

const c = (rank: Rank): Card => ({ rank, suit: '♦' });
const hand = (...ranks: Rank[]) => ranks.map(c);
function rigged(draws: Rank[]): GameState {
  const g = newGame(DEFAULT_RULES, 1000, seededRng(1));
  g.shoe = [...createShoe(6, seededRng(2)).slice(0, 200), ...draws.map(c).reverse()];
  g.shoeSize = 312;
  return g;
}
const npc = (over: Partial<Npc>): Npc => ({
  id: 'n1', name: 'Grandma Lou', style: 'book', bankroll: 100, buyIn: 100, baseBet: 10, roundsPlayed: 0, patience: 50, hue: 0, ...over,
});

describe('table text in Spanish', () => {
  beforeEach(() => setLang('es'));
  afterEach(() => setLang('en'));

  it('describes hands', () => {
    expect(describeHand(hand('A', 'K'))).toBe('Blackjack');
    expect(describeHand(hand('A', '7'))).toBe('18 blando');
    expect(describeHand(hand('10', '9', '5'))).toBe('Pasado (24)');
    expect(describeHand(hand('10', '6'))).toBe('16');
  });

  it('labels player styles', () => {
    expect(STYLE_LABEL.counter).toBe('Cuenta cartas');
    expect(Object.keys(STYLE_LABEL)).toHaveLength(6);
  });

  it('announces players leaving and joining', () => {
    const broke: Table = { seats: [npc({ bankroll: 0 }), null, null, YOU, null, null, null], nextId: 2 };
    const left = betweenRounds(broke, 10, true, seededRng(1)).events[0];
    expect(left.text).toBe('Grandma Lou se quedó sin fichas y se va.');

    const ahead: Table = { seats: [npc({ bankroll: 150, roundsPlayed: 99 }), null, null, YOU, null, null, null], nextId: 2 };
    expect(betweenRounds(ahead, 10, true, seededRng(1)).events[0].text).toBe(
      'Grandma Lou cambia sus fichas con $50 de ganancia y se va.',
    );

    const empty: Table = { seats: [null, null, null, YOU, null, null, null], nextId: 1 };
    let join;
    for (let seed = 1; !join && seed < 50; seed++) join = betweenRounds(empty, 10, true, seededRng(seed)).events[0];
    expect(join?.text).toMatch(/^.+ se sienta en el asiento \d con apuestas de \$\d+\.$/);
  });

  it('shouts fanfares in Spanish', () => {
    expect(roundFanfare(startRound(rigged(['A', '9', 'K', '7']), 10))!.label).toBe('¡BLACKJACK!');
    const bust = act(startRound(rigged(['10', '6', '6', '9', 'K']), 10), 'hit');
    expect(roundFanfare(bust)!.label).toBe('¡TE PASASTE!');
    const big = act(startRound(rigged(['6', '6', '5', '10', '10', '10']), 10), 'double');
    expect(roundFanfare(big)!.label).toBe('¡GRAN PREMIO! +$20');
  });

  it('goes back to English', () => {
    setLang('en');
    expect(describeHand(hand('A', '7'))).toBe('Soft 18');
  });
});
