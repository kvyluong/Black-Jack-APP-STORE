import { seededRng } from '../cards';
import { GameState, YOU, act, currentTrueCount, decisionContext, isYours, newGame, resolveInsurance, startRound } from '../game';
import { DEFAULT_RULES } from '../rules';
import { recommend } from '../strategy';
import {
  SEAT_COUNT,
  Table,
  betweenRounds,
  createTable,
  findNpc,
  isNpc,
  npcAction,
  roundBets,
  setYourHands,
  settleNpcs,
  yourSeats,
} from '../table';

describe('table simulation', () => {
  it('seats you in the middle with other players around you', () => {
    const t = createTable(2, 10, true, seededRng(3));
    expect(t.seats).toHaveLength(SEAT_COUNT);
    expect(yourSeats(2).every((s) => t.seats[s] === YOU)).toBe(true);
    expect(t.seats.filter(isNpc).length).toBeGreaterThanOrEqual(2);
  });

  it('deals to every seat in order and you get two hands', () => {
    const rng = seededRng(4);
    const t = createTable(2, 10, true, rng);
    const g = startRound(newGame(DEFAULT_RULES, 1000, rng), roundBets(t, 10, 0, 10), rng);
    const seats = g.hands.map((h) => h.seat);
    expect(seats).toEqual([...seats].sort((a, b) => a - b));
    expect(g.hands.filter(isYours)).toHaveLength(2);
    expect(g.bankroll).toBe(980);
    expect(g.hands.every((h) => h.cards.length === 2)).toBe(true);
  });

  it('moves a player out of the way when you take a second seat', () => {
    const t: Table = { seats: [null, null, null, YOU, null, null, null], nextId: 1 };
    const withNpc = { ...t, seats: t.seats.map((o, i) => (i === 4 ? { id: 'x', name: 'X', style: 'book' as const, bankroll: 500, buyIn: 500, baseBet: 10, roundsPlayed: 0, patience: 10, hue: 0 } : o)) };
    const moved = setYourHands(withNpc, 2);
    expect(moved.seats[4]).toBe(YOU);
    expect(moved.seats.filter(isNpc)).toHaveLength(1);
  });

  it('runs hundreds of rounds with players coming and going, and your money adds up', () => {
    const rng = seededRng(99);
    let table = createTable(2, 10, true, rng);
    let g: GameState = newGame(DEFAULT_RULES, 1e7, rng);
    let joins = 0;
    let leaves = 0;
    for (let round = 0; round < 600; round++) {
      const before = g.bankroll;
      g = startRound(g, roundBets(table, 10, currentTrueCount(g), 10), rng);
      if (g.phase === 'insurance') g = resolveInsurance(g, false, rng);
      let guard = 0;
      while (g.phase === 'playing') {
        const h = g.hands[g.active];
        if (h.owner === YOU) {
          g = act(g, recommend(decisionContext(g, false)!).action, rng);
        } else {
          const npc = findNpc(table, h.owner)!;
          expect(npc).toBeDefined();
          g = act(g, npcAction(g, npc, rng).action, rng);
        }
        if (++guard > 100) throw new Error('stuck');
      }
      const yours = g.hands.filter(isYours);
      const expected = yours.reduce((sum, h) => sum + (h.payout ?? 0) - h.bet, 0);
      expect(g.bankroll - before).toBeCloseTo(expected);
      table = settleNpcs(table, g);
      const r = betweenRounds(table, 10, true, rng);
      table = r.table;
      for (const e of r.events) e.kind === 'join' ? joins++ : leaves++;
      expect(yourSeats(2).every((s) => table.seats[s] === YOU)).toBe(true);
    }
    expect(joins).toBeGreaterThan(5);
    expect(leaves).toBeGreaterThan(5);
  });

  it('card counters bet more when the count is high', () => {
    const t = createTable(1, 10, true, seededRng(1));
    const counter = { id: 'c', name: 'C', style: 'counter' as const, bankroll: 5000, buyIn: 5000, baseBet: 10, roundsPlayed: 0, patience: 50, hue: 0 };
    const seats = t.seats.map((o, i) => (i === 0 ? counter : o));
    const low = roundBets({ ...t, seats }, 10, 0, 10).find((b) => b.owner === 'c')!.bet;
    const high = roundBets({ ...t, seats }, 10, 5, 10).find((b) => b.owner === 'c')!.bet;
    expect(high).toBeGreaterThan(low);
  });
});
