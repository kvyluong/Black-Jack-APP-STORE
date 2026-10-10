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
