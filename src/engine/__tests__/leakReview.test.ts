import { Card, Rank } from '../cards';
import { handValue } from '../hand';
import {
  REVIEW_SESSION,
  answerReview,
  dueSpots,
  emptyLeakReview,
  parseSpot,
  questionForSpot,
  reviewSession,
} from '../leakReview';
import { LeakStats, emptyLeaks, recordDecision } from '../leaks';
import { GOAL_POOL, ProgressStats, counters, emptyGoals, goalTitle, pickGoals } from '../progress';
import { setLang } from '../../i18n/lang';

const c = (rank: Rank): Card => ({ rank, suit: '♠' });

/** Leak stats with one decision per entry: [cards, dealer up, right?]. */
function leaksWith(entries: [Rank[], Rank, boolean][]): LeakStats {
  return entries.reduce(
    (s, [cards, up, ok]) => recordDecision(s, { cards: cards.map(c), dealerUp: up, canSplit: true, chosen: ok ? 'hit' : 'stand', best: 'hit' }),
    emptyLeaks(),
  );
}

/** A seeded RNG so the hands are repeatable. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1103515245 + 12345) & 0x7fffffff;
    return a / 0x80000000;
  };
}

describe('leak review: which spots are due', () => {
  const leaks = leaksWith([
    [['10', '6'], '10', false],
    [['10', '6'], '10', false],
    [['A', '7'], '9', false],
    [['8', '8'], 'A', true], // never missed: not reviewed
  ]);

  it('brings back every missed spot, most missed first', () => {
    expect(dueSpots(leaks, undefined, '2026-11-20')).toEqual(['Hard 16 vs 10', 'Soft 18 vs 9']);
  });

  it('spaces a spot out 1, 3 and 7 days after right answers, then calls it learned', () => {
    const key = 'Soft 18 vs 9';
    let r = answerReview(undefined, key, true, 1, '2026-11-20');
    expect(r.spots[key]).toMatchObject({ box: 1, due: '2026-11-21' });
    expect(dueSpots(leaks, r, '2026-11-20')).not.toContain(key);
    expect(dueSpots(leaks, r, '2026-11-21')).toContain(key);
    r = answerReview(r, key, true, 1, '2026-11-21');
    expect(r.spots[key]).toMatchObject({ box: 2, due: '2026-11-24' });
    r = answerReview(r, key, true, 1, '2026-11-24');
    expect(r.spots[key]).toMatchObject({ box: 3, due: '2026-12-01' });
    r = answerReview(r, key, true, 1, '2026-12-01');
    expect(r.spots[key].done).toBe(true);
    expect(dueSpots(leaks, r, '2027-06-01')).not.toContain(key);
    expect(r.answered).toBe(4);
  });

  it('a wrong answer sends it back to tomorrow', () => {
    const key = 'Hard 16 vs 10';
    let r = answerReview(undefined, key, true, 2, '2026-11-20');
    r = answerReview(r, key, true, 2, '2026-11-21');
    r = answerReview(r, key, false, 3, '2026-11-24');
    expect(r.spots[key]).toMatchObject({ box: 0, due: '2026-11-25', misses: 3 });
  });

  it('only the first right answer of a day moves a spot on', () => {
    const key = 'Hard 16 vs 10';
    let r = answerReview(undefined, key, true, 2, '2026-11-20');
    r = answerReview(r, key, true, 2, '2026-11-20');
    expect(r.spots[key]).toMatchObject({ box: 1, due: '2026-11-21' });
    expect(r.answered).toBe(2);
  });

  it('a new miss at the table brings a learned or waiting spot back today', () => {
    const key = 'Soft 18 vs 9';
    const r = { ...emptyLeakReview(), spots: { [key]: { box: 3, due: '2026-11-20', misses: 1, done: true } } };
    expect(dueSpots(leaks, r, '2026-11-25')).not.toContain(key);
    const missedAgain = recordDecision(leaks, { cards: [c('A'), c('7')], dealerUp: '9', canSplit: true, chosen: 'stand', best: 'hit' });
    expect(dueSpots(missedAgain, r, '2026-11-25')).toContain(key);
    // Getting it right again starts its schedule over.
    expect(answerReview(r, key, true, 2, '2026-11-25').spots[key]).toMatchObject({ box: 1, due: '2026-11-26' });
  });

  it('reads saves without review data, and with no leaks at all', () => {
    expect(dueSpots(undefined, undefined, '2026-11-20')).toEqual([]);
    expect(reviewSession(emptyLeaks(), undefined, '2026-11-20')).toEqual([]);
  });
});

describe('leak review: the daily session', () => {
  it('is 10 hands, going round the due spots when there are fewer', () => {
    const leaks = leaksWith([
      [['10', '6'], '10', false],
      [['A', '7'], '9', false],
      [['5', '6'], 'A', false],
    ]);
    const s = reviewSession(leaks, undefined, '2026-11-20');
    expect(s).toHaveLength(REVIEW_SESSION);
    expect(new Set(s).size).toBe(3);
  });

  it('takes the 10 most urgent when more are due', () => {
    const ups: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A', 'K'];
    const entries: [Rank[], Rank, boolean][] = ups.slice(0, 10).map((u) => [['10', '2'], u, false]);
    entries.push([['10', '3'], '2', false], [['10', '3'], '2', false]);
    const s = reviewSession(leaksWith(entries), undefined, '2026-11-20');
    expect(s).toHaveLength(10);
    expect(new Set(s).size).toBe(10);
    expect(s[0]).toBe('Hard 13 vs 2');
  });
});

describe('leak review: rebuilding hands', () => {
  const keys = [
    '8,8 vs 10',
    '10,10 vs 6',
    'A,A vs A',
    'Soft 12 vs 5',
    'Soft 13 vs 6',
    'Soft 20 vs 6',
    'Soft 21 vs 10',
    'Hard 4 vs 6',
    'Hard 5 vs 6',
    'Hard 12 vs 2',
    'Hard 16 vs A',
    'Hard 19 vs 10',
    'Hard 20 vs 10',
    'Hard 21 vs 9',
  ];

  it('rebuilds a hand that files under the same spot', () => {
    for (const key of keys) {
      for (let seed = 1; seed <= 20; seed++) {
        const q = questionForSpot(key, rng(seed))!;
        expect(q).not.toBeNull();
        const filed = recordDecision(emptyLeaks(), { cards: q.cards, dealerUp: q.dealerUp.rank, canSplit: q.canSplit, chosen: 'hit', best: 'hit' });
        expect(Object.keys(filed.spots)).toEqual([key]);
      }
    }
  });

  it('never deals a blackjack for soft 21', () => {
    const q = questionForSpot('Soft 21 vs 10', rng(3))!;
    expect(q.cards.length).toBe(3);
    expect(handValue(q.cards)).toEqual({ total: 21, soft: true });
  });

  it('ignores keys it cannot read', () => {
    expect(parseSpot('Hard 2 vs 10')).toBeNull();
    expect(parseSpot('Soft 18 vs 11')).toBeNull();
    expect(parseSpot('8,9 vs 10')).toBeNull();
    expect(questionForSpot('nonsense')).toBeNull();
  });
});

describe('leak review: the daily goal', () => {
  const base = (over: Partial<ProgressStats>): ProgressStats => ({
    handsPlayed: 40,
    decisions: 40,
    correctDecisions: 30,
    lessonsCompleted: [],
    leaks: emptyLeaks(),
    academy: {},
    countRecords: { perfectDecks: 0, bestDeckMs: null } as unknown as ProgressStats['countRecords'],
    trueCountDrill: { right: 0, total: 0 },
    deviations: { cards: {} } as unknown as ProgressStats['deviations'],
    exams: [],
    deckEstimates: { total: 0, recentErrors: [] } as unknown as ProgressStats['deckEstimates'],
    goals: emptyGoals(),
    history: [],
    ...over,
  });
  const review = GOAL_POOL.find((g) => g.id === 'review')!;

  it('is offered only when spots are due and Your Leaks is open', () => {
    const leaks = leaksWith([[['10', '6'], '10', false]]);
    expect(review.eligible(base({ leaks }), '2026-11-20')).toBe(true);
    expect(review.eligible(base({ leaks: emptyLeaks() }), '2026-11-20')).toBe(false);
    expect(review.eligible(base({ leaks, handsPlayed: 5 }), '2026-11-20')).toBe(false);
    // Picking goals for a day passes the day along.
    for (let d = 1; d <= 28; d++) {
      const day = `2026-11-${String(d).padStart(2, '0')}`;
      expect(pickGoals(base({ leaks: emptyLeaks() }), day).some((g) => g.id === 'review')).toBe(false);
    }
  });

  it('counts review hands answered', () => {
    const s = base({ leakReview: { spots: {}, answered: 7 } });
    expect(counters(s, '2026-11-20').reviewed).toBe(7);
    expect(counters(base({}), '2026-11-20').reviewed).toBe(0);
  });

  it('has a title in both languages', () => {
    setLang('en');
    expect(goalTitle(review)).toBe('Review 10 hands you missed');
    setLang('es');
    expect(goalTitle(review)).toBe('Repasa 10 manos que fallaste');
    setLang('en');
  });
});
