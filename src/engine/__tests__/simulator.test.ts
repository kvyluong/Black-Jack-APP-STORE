import { setLang } from '../../i18n/lang';
import { DEFAULT_RULES } from '../rules';
import {
  RAMP_PRESETS,
  SimInputs,
  TcDistribution,
  analyze,
  blackjackChance,
  describe as describeResult,
  houseEdge,
  rampIndex,
  simulateTrueCounts,
  simulateTrueCountsAsync,
  warnings,
} from '../simulator';

const base: SimInputs = {
  rules: { ...DEFAULT_RULES, decks: 6, penetration: 0.75 },
  ramp: RAMP_PRESETS.app,
  unit: 25,
  bankroll: 10000,
  handsPerHour: 100,
  players: 1,
  wongOut: false,
  countPlays: true,
};

let sixDeck: TcDistribution;
beforeAll(() => {
  sixDeck = simulateTrueCounts(6, 0.75, 1, 1, 3000);
});

afterEach(() => setLang('en'));

describe('house edge', () => {
  it('matches the standard 6-deck numbers', () => {
    // 6D S17 DAS LS 3:2 ≈ 0.32%; H17 ≈ 0.52%.
    expect(houseEdge(base.rules)).toBeCloseTo(0.32, 2);
    expect(houseEdge({ ...base.rules, dealerHitsSoft17: true })).toBeCloseTo(0.52, 2);
  });

  it('6:5 costs about 1.4%', () => {
    const diff = houseEdge({ ...base.rules, blackjackPayout: 1.2 }) - houseEdge(base.rules);
    expect(diff).toBeGreaterThan(1.3);
    expect(diff).toBeLessThan(1.45);
  });

  it('blackjack chance is about 4.75% in six decks and 4.83% in one', () => {
    expect(blackjackChance(6)).toBeCloseTo(0.0475, 3);
    expect(blackjackChance(1)).toBeCloseTo(0.0483, 3);
  });
});

describe('true-count distribution', () => {
  it('sums to 1 and is centered near 0', () => {
    const total = sixDeck.buckets.reduce((s, b) => s + b.freq, 0);
    expect(total).toBeCloseTo(1, 6);
    const mean = sixDeck.buckets.reduce((s, b) => s + b.freq * b.meanTc, 0);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    // Over half the rounds are dealt at true counts −1..+1 in a 6-deck shoe.
    const near = sixDeck.buckets.filter((b) => b.tc >= -1 && b.tc <= 1).reduce((s, b) => s + b.freq, 0);
    expect(near).toBeGreaterThan(0.5);
  });

  it('deeper penetration gives more high counts', () => {
    const high = (d: TcDistribution) => d.buckets.filter((b) => b.tc >= 2).reduce((s, b) => s + b.freq, 0);
    expect(high(simulateTrueCounts(6, 0.85, 1, 2, 2000))).toBeGreaterThan(high(simulateTrueCounts(6, 0.65, 1, 2, 2000)));
  });

  it('async version resolves and caches', async () => {
    let last = 0;
    const d = await simulateTrueCountsAsync(2, 0.7, 7, (p) => (last = p));
    expect(last).toBe(1);
    expect(d?.rounds).toBeGreaterThan(1000);
    expect(await simulateTrueCountsAsync(2, 0.7, 7)).toBe(d);
  });
});

describe('analysis', () => {
  it('ramp index maps counts to steps', () => {
    expect([-3, 0, 1, 2, 3, 4, 5, 9].map(rampIndex)).toEqual([0, 0, 0, 1, 2, 3, 4, 4]);
  });

  it('flat betting loses about the house edge', () => {
    const basic = analyze({ ...base, ramp: RAMP_PRESETS.flat, countPlays: false }, sixDeck);
    expect(Math.abs(basic.edge + houseEdge(base.rules))).toBeLessThan(0.05);
    // Count plays win back a little (~0.1%), but flat betting still loses.
    const r = analyze({ ...base, ramp: RAMP_PRESETS.flat }, sixDeck);
    expect(r.edge).toBeLessThan(0);
    expect(r.edge).toBeGreaterThan(basic.edge);
    expect(r.edge - basic.edge).toBeLessThan(0.2);
    expect(r.ror).toBe(1);
    expect(r.bankroll1).toBe(Infinity);
  });

  it('a 1–8 spread in 6 decks at 75% gives a modest edge', () => {
    const r = analyze(base, sixDeck);
    expect(r.edge).toBeGreaterThan(0.5);
    expect(r.edge).toBeLessThan(1.5);
    expect(r.evPerHour).toBeGreaterThan(0);
    expect(r.n0).toBeGreaterThan(10000);
    // Bankroll for 1% risk is bigger than for 5%, and 5% risk uses 5% formula exactly.
    expect(r.bankroll1).toBeGreaterThan(r.bankroll5);
    expect(analyze({ ...base, bankroll: r.bankroll5 }, sixDeck).ror).toBeCloseTo(0.05, 6);
  });

  it('wonging out raises the edge', () => {
    expect(analyze({ ...base, wongOut: true }, sixDeck).edge).toBeGreaterThan(analyze(base, sixDeck).edge);
  });

  it('risk of ruin falls as the bankroll grows', () => {
    const rors = [2000, 5000, 10000, 20000].map((b) => analyze({ ...base, bankroll: b }, sixDeck).ror);
    for (let i = 1; i < rors.length; i++) expect(rors[i]).toBeLessThan(rors[i - 1]);
  });

  it('6:5 makes things much worse', () => {
    const good = analyze(base, sixDeck);
    const bad = analyze({ ...base, rules: { ...base.rules, blackjackPayout: 1.2 } }, sixDeck);
    expect(bad.edge).toBeLessThan(good.edge - 1);
    expect(bad.evPerHour).toBeLessThan(0);
    expect(warnings({ ...base, rules: { ...base.rules, blackjackPayout: 1.2 } }, bad)).toEqual(expect.arrayContaining(['sixFive', 'losing']));
  });

  it('flags wide spreads and high risk', () => {
    const wide = { ...base, ramp: [1, 4, 8, 12, 16] as SimInputs['ramp'], bankroll: 2000 };
    expect(warnings(wide, analyze(wide, sixDeck))).toEqual(expect.arrayContaining(['spread', 'ror']));
  });
});

describe('text', () => {
  it('describes a winning game in English', () => {
    const lines = describeResult(base, analyze(base, sixDeck));
    expect(lines[0]).toMatch(/^You’d win about \$\d+ an hour/);
    expect(lines.join(' ')).toMatch(/one hour in six/);
  });

  it('describes results in Spanish', () => {
    setLang('es');
    const win = describeResult(base, analyze(base, sixDeck));
    expect(win[0]).toMatch(/^Ganarías unos \$\d+ por hora/);
    expect(win.join(' ')).toMatch(/Riesgo de perder toda tu banca/);
    const lose = describeResult({ ...base, ramp: RAMP_PRESETS.flat }, analyze({ ...base, ramp: RAMP_PRESETS.flat }, sixDeck));
    expect(lose[0]).toMatch(/^Perderías/);
    expect(lose.join(' ')).not.toMatch(/You|hour/);
  });
});
