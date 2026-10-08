import { LESSONS } from '../../content/lessons';
import { setLang } from '../../i18n/lang';
import { emptyLeaks, recordDecision, RECENT_WINDOW } from '../leaks';
import {
  BENCHMARK_TEXT,
  COUNT_PLAY_IDS,
  GOAL_POOL,
  GoalsState,
  HISTORY_CAP,
  ProgressStats,
  READY_WEIGHTS,
  accuracyByDay,
  addDays,
  benchmarks,
  bestDeckTimeline,
  claimGoal,
  counters,
  currentStreak,
  emptyGoals,
  goalProgress,
  goalReward,
  goalTitle,
  handsByDay,
  historyWithToday,
  nextStep,
  pickGoals,
  readyHeadline,
  readyScore,
  rolloverDay,
  shortDay,
  todaysGoals,
} from '../progress';
import { Card, Rank } from '../cards';

const BASICS = ['rules', 'soft-hard', 'actions', 'basic-strategy'];

function stats(over: Partial<ProgressStats> = {}): ProgressStats {
  return {
    handsPlayed: 0,
    decisions: 0,
    correctDecisions: 0,
    lessonsCompleted: [],
    peakChips: 1000,
    leaks: emptyLeaks(),
    academy: {},
    countRecords: { bestDeckMs: null, perfectDecks: 0 },
    trueCountDrill: { right: 0, total: 0 },
    deviations: { cards: {} },
    exams: [],
    deckEstimates: { right: 0, total: 0, recentErrors: [] },
    goals: emptyGoals(),
    history: [],
    ...over,
  };
}

/** Everything done. */
function readyStats(): ProgressStats {
  const cards = Object.fromEntries(COUNT_PLAY_IDS.map((id) => [id, { box: 3, due: '2026-12-01', right: 5, total: 5 }]));
  return stats({
    lessonsCompleted: LESSONS.map((l) => l.id),
    leaks: { ...emptyLeaks(), recent: Array(200).fill(true) },
    countRecords: { bestDeckMs: 28000, perfectDecks: 3 },
    trueCountDrill: { right: 19, total: 20 },
    deviations: { cards },
    deckEstimates: { right: 10, total: 10, recentErrors: Array(10).fill(0.25) },
    exams: [{ day: '2026-10-01', hands: 60, playAccuracy: 1, countGuess: 4, countActual: 4, trueGuess: 1, trueActual: 1, betScore: 1, deckError: 0.2, grade: 92, passed: true }],
  });
}

const h = (...r: Rank[]): Card[] => r.map((rank) => ({ rank, suit: '♠' }));

describe('days', () => {
  it('moves across months, years and DST', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
});

describe('leaks rolling window', () => {
  it('keeps the last 200 decisions, newest last, and tolerates old saves', () => {
    let s = { byCategory: {}, spots: {} } as ReturnType<typeof emptyLeaks>; // a save from before `recent`
    s = recordDecision(s, { cards: h('10', '6'), dealerUp: '10', canSplit: true, chosen: 'stand', best: 'hit' });
    expect(s.recent).toEqual([false]);
    for (let i = 0; i < 250; i++) s = recordDecision(s, { cards: h('10', '6'), dealerUp: '6', canSplit: true, chosen: 'stand', best: 'stand' });
    expect(s.recent).toHaveLength(RECENT_WINDOW);
    expect(s.recent!.every(Boolean)).toBe(true);
  });
});

describe('casino-ready score', () => {
  it('starts at 0 with lessons as the first step', () => {
    const list = benchmarks(stats());
    expect(readyScore(list)).toBe(0);
    expect(nextStep(list)?.id).toBe('lessons');
    expect(list.every((b) => !b.started)).toBe(true);
  });

  it('weights sum to 100 and full marks need every benchmark done', () => {
    expect(Object.values(READY_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
    const list = benchmarks(readyStats());
    expect(list.every((b) => b.done)).toBe(true);
    expect(readyScore(list)).toBe(100);
    expect(readyHeadline(list)).toBe('Ready for the casino');
  });

  it('holds basic strategy to 99% over 200 decisions', () => {
    const s = readyStats();
    // 197/200 = 98.5%: not done, and the detail doesn't round up to 99%.
    s.leaks = { ...emptyLeaks(), recent: [...Array(197).fill(true), false, false, false] };
    const b = benchmarks(s).find((x) => x.id === 'strategy')!;
    expect(b.done).toBe(false);
    expect(b.detail).toContain('98.5%');
    expect(readyScore(benchmarks(s))).toBeLessThan(100);
    expect(nextStep(benchmarks(s))?.id).toBe('strategy');
    // Too few decisions, even if perfect.
    s.leaks = { ...emptyLeaks(), recent: Array(50).fill(true) };
    expect(benchmarks(s).find((x) => x.id === 'strategy')!.progress).toBeCloseTo(0.25);
  });

  it('grades each benchmark against its threshold', () => {
    const s = readyStats();
    s.countRecords = { bestDeckMs: 60000, perfectDecks: 1 };
    s.trueCountDrill = { right: 17, total: 19 }; // too few answers
    s.deckEstimates = { right: 5, total: 10, recentErrors: Array(10).fill(1) };
    s.deviations = { cards: { insurance: { box: 2, due: '2026-10-08', right: 2, total: 2 } } };
    s.exams = [{ ...s.exams[0], grade: 70, passed: false }];
    const by = Object.fromEntries(benchmarks(s).map((b) => [b.id, b]));
    expect(by.countDeck.progress).toBeCloseTo(0.5);
    expect(by.countDeck.done).toBe(false);
    expect(by.trueCount.done).toBe(false);
    expect(by.decks.progress).toBeCloseTo(0.5);
    expect(by.deviations.progress).toBe(0);
    expect(by.deviations.started).toBe(true);
    expect(by.exam.progress).toBeCloseTo(0.7);
    expect(by.lessons.done).toBe(true);
  });

  it('sends basic strategy practice to the weakest leak', () => {
    let leaks = emptyLeaks();
    for (let i = 0; i < 6; i++) leaks = recordDecision(leaks, { cards: h('A', '7'), dealerUp: '9', canSplit: true, chosen: 'stand', best: 'hit' });
    expect(benchmarks(stats({ leaks })).find((b) => b.id === 'strategy')!.route).toBe('/drills/strategy?focus=soft');
  });

  it('counts the full count-play deck including insurance and the Fab 4', () => {
    expect(COUNT_PLAY_IDS).toContain('insurance');
    expect(COUNT_PLAY_IDS).toContain('16v10');
    expect(COUNT_PLAY_IDS).toContain('s15v10');
  });

  it('speaks Spanish', () => {
    setLang('es');
    expect(BENCHMARK_TEXT.strategy.title).toBe('Estrategia básica');
    expect(readyHeadline(benchmarks(stats()))).toBe('Siguiente paso: Lecciones');
    expect(benchmarks(stats())[0].detail).toMatch(/lecciones terminadas/);
    expect(goalTitle(GOAL_POOL[0])).toBe('Juega 20 manos');
    expect(shortDay('2026-10-03')).toBe('3 oct');
    setLang('en');
    expect(shortDay('2026-10-03')).toBe('Oct 3');
  });
});

describe('daily goals', () => {
  const day = '2026-10-08';

  it('picks three goals deterministically from the date', () => {
    const s = stats({ lessonsCompleted: LESSONS.map((l) => l.id) });
    const a = pickGoals(s, day).map((g) => g.id);
    expect(a).toHaveLength(3);
    expect(pickGoals(s, day).map((g) => g.id)).toEqual(a);
    const week = new Set(Array.from({ length: 14 }, (_, i) => pickGoals(s, addDays(day, i)).map((g) => g.id).join()));
    expect(week.size).toBeGreaterThan(1);
  });

  it('keeps counting goals away from players who have not learned the basics', () => {
    const counting = ['perfectDeck', 'trueCount', 'deckEstimates', 'devReviews', 'workout'];
    for (let i = 0; i < 30; i++) {
      const ids = pickGoals(stats(), addDays(day, i)).map((g) => g.id);
      expect(ids.some((id) => counting.includes(id))).toBe(false);
    }
    // After the basics and the true count lesson, true count goals can appear.
    const s = stats({ lessonsCompleted: [...BASICS, 'true-count'] });
    expect(GOAL_POOL.find((g) => g.id === 'trueCount')!.eligible(s)).toBe(true);
    expect(GOAL_POOL.find((g) => g.id === 'devReviews')!.eligible(s)).toBe(false);
  });

  it('measures progress from the start-of-day snapshot', () => {
    let s = stats({ handsPlayed: 100 });
    const roll = rolloverDay(s, day)!;
    s = { ...s, ...roll, handsPlayed: 112 };
    const hands = GOAL_POOL.find((g) => g.id === 'hands')!;
    expect(goalProgress(hands, s, day)).toBe(12);
    s.handsPlayed = 150;
    expect(goalProgress(hands, s, day)).toBe(20); // capped at the target
    expect(todaysGoals(s, day).map((g) => g.id)).toEqual(roll.goals.today);
    expect(rolloverDay(s, day)).toBeNull();
  });

  it('measures the Academy workout as done today', () => {
    const w = GOAL_POOL.find((g) => g.id === 'workout')!;
    const s = stats({ academy: { lastWorkoutDay: day } });
    expect(goalProgress(w, { ...s, ...rolloverDay(s, day)! }, day)).toBe(1);
  });

  it('rewards a few minimum bets at your best table', () => {
    const hands = GOAL_POOL.find((g) => g.id === 'hands')!;
    expect(goalReward(hands, 1000)).toEqual({ chips: 15, xp: 40 });
    expect(goalReward(hands, 12000).chips).toBe(300); // The Strip, $100 minimum
  });

  it('builds a streak when every goal is claimed, and resets after a missed day', () => {
    const ids = ['a', 'b', 'c'];
    let g: GoalsState = { ...emptyGoals(), day };
    g = claimGoal(g, 'a', day, ids);
    g = claimGoal(g, 'b', day, ids);
    expect(g.streak).toBe(0);
    g = claimGoal(g, 'c', day, ids);
    expect(g).toMatchObject({ streak: 1, lastCompleteDay: day });
    expect(claimGoal(g, 'c', day, ids)).toBe(g); // claiming twice does nothing
    const next = addDays(day, 1);
    expect(currentStreak(g, next)).toBe(1);
    let g2: GoalsState = { ...g, day: next, claimed: [] };
    for (const id of ids) g2 = claimGoal(g2, id, next, ids);
    expect(g2.streak).toBe(2);
    expect(currentStreak(g2, addDays(next, 2))).toBe(0);
    let g3: GoalsState = { ...g2, day: addDays(next, 2), claimed: [] };
    for (const id of ids) g3 = claimGoal(g3, id, addDays(next, 2), ids);
    expect(g3.streak).toBe(1);
  });
});

describe('history and charts', () => {
  it('files the last day into history at rollover, capped', () => {
    let s = stats({ handsPlayed: 10, decisions: 20, correctDecisions: 15 });
    s = { ...s, ...rolloverDay(s, '2026-10-01')! }; // first launch: nothing to file
    expect(s.history).toEqual([]);
    s = { ...s, handsPlayed: 30, decisions: 60, correctDecisions: 51 };
    s = { ...s, ...rolloverDay(s, '2026-10-03')! };
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ day: '2026-10-01', start: { hands: 10 }, values: { hands: 30 } });
    const long = { ...s, history: Array.from({ length: HISTORY_CAP }, (_, i) => ({ day: addDays('2025-01-01', i), values: {} })) };
    expect(rolloverDay({ ...long, goals: { ...s.goals, day: '2026-10-04' } }, '2026-10-05')!.history).toHaveLength(HISTORY_CAP);
  });

  it('turns history into daily accuracy, hands and best times', () => {
    let s = stats({ handsPlayed: 10, decisions: 20, correctDecisions: 15 });
    s = { ...s, ...rolloverDay(s, '2026-10-06')! };
    s = { ...s, handsPlayed: 30, decisions: 60, correctDecisions: 51, countRecords: { bestDeckMs: 45000, perfectDecks: 1 } };
    s = { ...s, ...rolloverDay(s, '2026-10-08')! };
    s = { ...s, handsPlayed: 35, decisions: 70, correctDecisions: 61, countRecords: { bestDeckMs: 38000, perfectDecks: 2 } };
    const points = historyWithToday(s, '2026-10-08');
    const acc = accuracyByDay(points, '2026-10-08', 5);
    expect(acc.map((d) => d.value)).toEqual([null, null, 90, null, 100]);
    expect(handsByDay(points, '2026-10-08', 3).map((d) => d.value)).toEqual([20, 0, 5]);
    expect(bestDeckTimeline(points)).toEqual([
      { day: '2026-10-06', ms: 45000 },
      { day: '2026-10-08', ms: 38000 },
    ]);
    expect(counters(s, '2026-10-08').bestDeckMs).toBe(38000);
  });
});
