import { Benchmark, KNOW_THE_GAME, ProgressStats, markLessonsKnown, nextStep } from '../progress';
import { setLang } from '../../i18n/lang';
import { FEATURES, isUnlocked, newFeatures, unlockHint, unlockedFeatures } from '../unlocks';

const fresh = { lessonsCompleted: [], handsPlayed: 0 };

describe('unlocks', () => {
  afterEach(() => setLang('en'));

  it('a new player starts with just the lessons and the casino floor', () => {
    expect(unlockedFeatures(fresh)).toEqual(['lessons', 'tables']);
    expect(isUnlocked('tableCount', fresh)).toBe(false);
  });

  it('features open with the lesson that explains them, or with enough play', () => {
    expect(isUnlocked('strategyDrill', { lessonsCompleted: ['rules', 'soft-hard', 'actions'], handsPlayed: 0 })).toBe(true);
    expect(isUnlocked('strategyDrill', { lessonsCompleted: [], handsPlayed: 20 })).toBe(true);
    // Counting needs its lesson; playing lots of hands doesn't teach it.
    expect(isUnlocked('academy', { lessonsCompleted: [], handsPlayed: 5000 })).toBe(false);
    expect(isUnlocked('academy', { lessonsCompleted: ['why-counting'], handsPlayed: 0 })).toBe(true);
    expect(isUnlocked('tableCount', { lessonsCompleted: ['why-counting'], handsPlayed: 0 })).toBe(true);
  });

  it('"I already know how to play" opens everything', () => {
    expect(unlockedFeatures({ ...fresh, experienced: true })).toEqual(FEATURES);
  });

  it('new features are the unlocked ones not opened yet (never the always-on ones)', () => {
    const s = { lessonsCompleted: ['actions'], handsPlayed: 0 };
    expect(newFeatures(s, [])).toEqual(['strategyDrill', 'chart', 'leaks']);
    expect(newFeatures(s, ['chart'])).toEqual(['strategyDrill', 'leaks']);
  });

  it('explains how to unlock, in both languages', () => {
    const num = (id: string) => ({ actions: 3, 'why-counting': 5 })[id] ?? 0;
    expect(unlockHint('leaks', num)).toBe('Unlocks after lesson 3 or 30 hands');
    expect(unlockHint('academy', num)).toBe('Unlocks after lesson 5');
    setLang('es');
    expect(unlockHint('academy', num)).toBe('Se desbloquea tras la lección 5');
  });
});

describe('starting level', () => {

  it('"I know how to play" skips the rules lessons without paying the lesson goal', () => {
    const s = { lessonsCompleted: [] as string[], goals: { day: '2026-10-14', start: { lessons: 0, hands: 0 }, claimed: [], streak: 0, lastCompleteDay: null } };
    const next = markLessonsKnown(s as unknown as ProgressStats, KNOW_THE_GAME);
    expect(next.lessonsCompleted).toEqual(['rules', 'soft-hard', 'actions']);
    expect(next.goals.start?.lessons).toBe(3);
    expect(isUnlocked('strategyDrill', { lessonsCompleted: next.lessonsCompleted, handsPlayed: 0, experienced: false })).toBe(true);
    expect(isUnlocked('academy', { lessonsCompleted: next.lessonsCompleted, handsPlayed: 0, experienced: false })).toBe(false);
    expect(markLessonsKnown(next, KNOW_THE_GAME)).toBe(next);
  });

  it('card counters are not sent back to the lessons', () => {
    const list = [
      { id: 'lessons', done: false },
      { id: 'strategy', done: false },
    ] as unknown as Benchmark[];
    expect(nextStep(list)?.id).toBe('lessons');
    expect(nextStep(list, true)?.id).toBe('strategy');
  });
});
