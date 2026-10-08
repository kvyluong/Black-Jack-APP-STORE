// Regression tests for bugs found in review.
import { Card, Rank, seededRng } from '../cards';
import { runningCount } from '../counting';
import { dealSchedule } from '../dealSchedule';
import { GameState, YOU, act, legalActions, newGame, resolveInsurance, shuffleIfNeeded, startRound } from '../game';
import { DEFAULT_RULES } from '../rules';
import { recommend } from '../strategy';
import { Npc, Table, createTable, findNpc, npcAction, npcBet, roundBets, settleNpcs } from '../table';

const cardKey = (c: Card) => `${c.rank}${c.suit}`;
const onTable = (g: GameState) => [...g.dealer, ...g.hands.flatMap((h) => h.cards)];

/** Plays a round to the end with every hand following its owner's style (you play basic strategy). */
function playOut(g: GameState, table: Table, rng: () => number): GameState {
  while (g.phase === 'insurance' || g.phase === 'playing') {
    if (g.phase === 'insurance') {
      g = resolveInsurance(g, false, rng);
      continue;
    }
    const h = g.hands[g.active];
    const npc = findNpc(table, h.owner);
    const action = npc ? npcAction(g, npc, rng).action : recommend({ ...ctxOf(g) }).action;
    g = act(g, legalActions(g)[action] ? action : 'stand', rng);
  }
  return g;
}

function ctxOf(g: GameState) {
  const h = g.hands[g.active];
  const legal = legalActions(g);
  return { cards: h.cards, dealerUp: g.dealer[0].rank, rules: g.rules, canDouble: legal.double, canSplit: legal.split, canSurrender: legal.surrender };
}

describe('shoe', () => {
  it('never puts two copies of the same card on the table, even when a single-deck shoe runs out mid-round', () => {
    const rng = seededRng(7);
    // Deal to the last card so the shoe empties mid-round as often as possible.
    let g = newGame({ ...DEFAULT_RULES, decks: 1, penetration: 1 }, 1_000_000, rng);
    const table = createTable(2, 10, true, rng);
    let emptied = 0;
    for (let round = 0; round < 400; round++) {
      const before = g.shoe.length;
      g = startRound(g, roundBets(table, 10, 0, 10), rng);
      g = playOut(g, table, rng);
      if (g.shoe.length > before) emptied++;
      const keys = onTable(g).map(cardKey);
      expect(new Set(keys).size).toBe(keys.length);
      g = { ...g, phase: 'betting', hands: [], dealer: [] };
    }
    expect(emptied).toBeGreaterThan(0);
  });

  it('after a mid-round reshuffle the count covers exactly the cards no longer in the shoe', () => {
    const rng = seededRng(11);
    let g = newGame({ ...DEFAULT_RULES, decks: 1, penetration: 1 }, 1_000_000, rng);
    const table = createTable(2, 10, true, rng);
    for (let round = 0; round < 200; round++) {
      g = startRound(g, roundBets(table, 10, 0, 10), rng);
      g = playOut(g, table, rng);
      if (g.justShuffled) {
        // Everything that's left plus what's on the table is one full deck.
        expect(g.shoe.length + onTable(g).length).toBe(52);
        expect(g.runningCount).toBe(runningCount(onTable(g)));
      }
      g = { ...g, phase: 'betting', hands: [], dealer: [] };
    }
  });

  it('shuffles between rounds, before bets, once the cut card is out', () => {
    let g = newGame(DEFAULT_RULES, 1000, seededRng(3));
    g = { ...g, shoe: g.shoe.slice(0, 60), runningCount: 9 };
    const next = shuffleIfNeeded(g, 3, seededRng(4));
    expect(next.runningCount).toBe(0);
    expect(next.shoe.length).toBe(312);
    expect(next.justShuffled).toBe(true);
    // The deal right after keeps the "just shuffled" flag for the shuffle notice and sound.
    expect(startRound(next, 10, seededRng(5)).justShuffled).toBe(true);
  });
});

describe('computer players', () => {
  const npc = (over: Partial<Npc>): Npc => ({
    id: 'n',
    name: 'N',
    style: 'counter',
    bankroll: 10_000,
    buyIn: 10_000,
    baseBet: 15,
    roundsPlayed: 0,
    patience: 10,
    hue: 0,
    ...over,
  });

  it('bet within the table maximum', () => {
    expect(npcBet(npc({}), 6, 5, 100)).toBe(100);
  });

  it("can't double or split with chips they don't have, so their bankroll stays at or above zero", () => {
    const rich = npc({ id: 'hr', style: 'highRoller', bankroll: 5, baseBet: 5 });
    const table: Table = { seats: [rich, null, null, null, null, null, YOU], nextId: 2 };
    const rigged = (ranks: Rank[]): GameState => {
      const g = newGame(DEFAULT_RULES, 1000, seededRng(1));
      const cards = ranks.map((rank) => ({ rank, suit: '♠' as const }));
      return { ...g, shoe: [...g.shoe.slice(0, 100), ...cards.reverse()] };
    };
    // High roller: 8,8 vs dealer 10 would normally split.
    let g = startRound(rigged(['8', '5', '10', '8', '6', '9']), roundBets(table, 5, 0, 5), seededRng(2));
    expect(g.hands[0].owner).toBe('hr');
    expect(legalActions(g).split).toBe(false);
    expect(legalActions(g).double).toBe(false);
    g = playOut(g, table, seededRng(3));
    expect(settleNpcs(table, g).seats[0]).toMatchObject({ bankroll: expect.any(Number) });
    expect((settleNpcs(table, g).seats[0] as Npc).bankroll).toBeGreaterThanOrEqual(0);
  });
});

describe('deal animation', () => {
  it('after a split, only the two new cards deal in; later hands are left alone', () => {
    const table: Table = { seats: [YOU, npc2(), null, null, null, null, null], nextId: 3 };
    const g0 = newGame(DEFAULT_RULES, 1000, seededRng(1));
    const cards = (['8', '9', '10', '8', '7', '6', '3', '4'] as Rank[]).map((rank) => ({ rank, suit: '♥' as const }));
    const g = startRound({ ...g0, shoe: [...g0.shoe.slice(0, 100), ...cards.reverse()] }, roundBets(table, 10, 0, 10), seededRng(2));
    expect(g.hands[0].cards.map((c) => c.rank)).toEqual(['8', '8']);
    const split = act(g, 'split', seededRng(3));
    const s = dealSchedule(g, split);
    expect(s.cards).toHaveLength(2);
    expect(s.sounds.filter((x) => x.name === 'card')).toHaveLength(2);
  });
});

function npc2(): Npc {
  return { id: 'b', name: 'B', style: 'book', bankroll: 1000, buyIn: 1000, baseBet: 10, roundsPlayed: 0, patience: 10, hue: 0 };
}

describe('count plays', () => {
  const ctx = (ranks: Rank[], up: Rank, trueCount: number, h17 = false) => ({
    cards: ranks.map((rank) => ({ rank, suit: '♠' as const })),
    dealerUp: up,
    rules: { ...DEFAULT_RULES, dealerHitsSoft17: h17 },
    canDouble: true,
    canSplit: true,
    canSurrender: true,
    trueCount,
  });

  it('15 vs 10: surrender at 0 or higher, hit below', () => {
    expect(recommend(ctx(['10', '5'], '10', 0)).action).toBe('surrender');
    const low = recommend(ctx(['10', '5'], '10', -2));
    expect(low.action).toBe('hit');
    expect(low.deviation).toBeDefined();
  });

  it('14 vs 10 surrenders at +3', () => {
    expect(recommend(ctx(['10', '4'], '10', 3)).action).toBe('surrender');
    expect(recommend(ctx(['10', '4'], '10', 2)).action).toBe('hit');
  });

  it('10 vs A doubles at +3 when the dealer hits soft 17', () => {
    expect(recommend(ctx(['6', '4'], 'A', 3, true)).action).toBe('double');
    expect(recommend(ctx(['6', '4'], 'A', 3, false)).action).toBe('hit');
  });
});
