import { setLang } from '../../i18n/lang';
import { tagSymbol, tagText } from '../../theme';
import { MODES, countStory, groupChoices, groupValue, tagChoiceList } from '../academy';
import { Card, RANKS, Rank, createShoe, seededRng } from '../cards';
import {
  COUNTING_SYSTEMS,
  CountingSystem,
  KO_PIVOT,
  cardTag,
  describeTags,
  initialRunningCount,
  isBalanced,
  koBetUnits,
  koBetZone,
  koKeyCount,
  koQuestion,
  maxTag,
  runningCount,
  setCountingSystem,
  systemNote,
  tagGroups,
  tagValues,
  trueCount,
} from '../counting';

const tags = (system: CountingSystem) => RANKS.map((r) => cardTag(r, system));
const deck = (): Card[] => createShoe(1, seededRng(1));

afterEach(() => {
  setCountingSystem('hiLo');
  setLang('en');
});

describe('tag tables match the published systems', () => {
  // RANKS order: A, 2–10, J, Q, K
  const byRank = (system: CountingSystem) => Object.fromEntries(RANKS.map((r) => [r, cardTag(r, system)])) as Record<Rank, number>;

  it('Hi-Lo: 2–6 +1, 7–9 0, 10–A −1', () => {
    const t = byRank('hiLo');
    expect([t['2'], t['3'], t['4'], t['5'], t['6']]).toEqual([1, 1, 1, 1, 1]);
    expect([t['7'], t['8'], t['9']]).toEqual([0, 0, 0]);
    expect([t['10'], t.J, t.Q, t.K, t.A]).toEqual([-1, -1, -1, -1, -1]);
  });

  it('KO: like Hi-Lo but 7 is +1', () => {
    const t = byRank('ko');
    expect([t['2'], t['3'], t['4'], t['5'], t['6'], t['7']]).toEqual([1, 1, 1, 1, 1, 1]);
    expect([t['8'], t['9']]).toEqual([0, 0]);
    expect([t['10'], t.K, t.A]).toEqual([-1, -1, -1]);
  });

  it('Hi-Opt I: 3–6 +1, 2 and Ace 0, 10s −1', () => {
    const t = byRank('hiOptI');
    expect([t['2'], t['3'], t['4'], t['5'], t['6'], t['7'], t['8'], t['9']]).toEqual([0, 1, 1, 1, 1, 0, 0, 0]);
    expect([t['10'], t.J, t.Q, t.K, t.A]).toEqual([-1, -1, -1, -1, 0]);
  });

  it('Omega II: 2,3,7 +1; 4–6 +2; 8 0; 9 −1; 10s −2; Ace 0', () => {
    const t = byRank('omegaII');
    expect([t['2'], t['3'], t['4'], t['5'], t['6'], t['7'], t['8'], t['9']]).toEqual([1, 1, 2, 2, 2, 1, 0, -1]);
    expect([t['10'], t.J, t.Q, t.K, t.A]).toEqual([-2, -2, -2, -2, 0]);
  });

  it('full-deck sums: 0 for balanced systems, +4 for KO', () => {
    for (const s of COUNTING_SYSTEMS) {
      expect(runningCount(deck(), s)).toBe(s === 'ko' ? 4 : 0);
      expect(tags(s).reduce((a, b) => a + b, 0) * 4).toBe(s === 'ko' ? 4 : 0);
      expect(isBalanced(s)).toBe(s !== 'ko');
    }
  });

  it('tag values, highest first', () => {
    expect(tagValues('hiLo')).toEqual([1, 0, -1]);
    expect(tagValues('ko')).toEqual([1, 0, -1]);
    expect(tagValues('hiOptI')).toEqual([1, 0, -1]);
    expect(tagValues('omegaII')).toEqual([2, 1, 0, -1, -2]);
    expect(maxTag('omegaII')).toBe(2);
    expect(maxTag('hiLo')).toBe(1);
  });

  it('describes each system’s tags', () => {
    expect(describeTags('hiLo')).toBe('2–6 +1 · 7–9 0 · 10–K, A −1');
    expect(describeTags('ko')).toBe('2–7 +1 · 8, 9 0 · 10–K, A −1');
    expect(describeTags('hiOptI')).toBe('3–6 +1 · 2, 7–9, A 0 · 10–K −1');
    expect(describeTags('omegaII')).toBe('4–6 +2 · 2, 3, 7 +1 · 8, A 0 · 9 −1 · 10–K −2');
    expect(tagGroups('omegaII').map((g) => g.tag)).toEqual([2, 1, 0, -1, -2]);
  });
});

describe('KO', () => {
  it('starts at 4 − 4 × decks, so a full shoe ends at the pivot', () => {
    expect(initialRunningCount(1, 'ko')).toBe(0);
    expect(initialRunningCount(2, 'ko')).toBe(-4);
    expect(initialRunningCount(6, 'ko')).toBe(-20);
    expect(initialRunningCount(8, 'ko')).toBe(-28);
    expect(initialRunningCount(6, 'hiLo')).toBe(0);
    const shoe = createShoe(6, seededRng(3));
    expect(initialRunningCount(6, 'ko') + runningCount(shoe, 'ko')).toBe(KO_PIVOT);
  });

  it('true count estimate: 0 at the start of a shoe, +4 at the pivot', () => {
    expect(trueCount(-20, 6 * 52, 'ko')).toBe(0);
    expect(trueCount(KO_PIVOT, 2 * 52, 'ko')).toBe(4);
    expect(trueCount(KO_PIVOT, 5 * 52, 'ko')).toBe(4);
    expect(trueCount(8, 2 * 52, 'hiLo')).toBe(4);
    expect(trueCount(8, 2 * 52, 'omegaII')).toBe(4);
  });

  it('key counts from the Rookie KO tables', () => {
    expect([1, 2, 6, 8].map(koKeyCount)).toEqual([2, 1, -4, -6]);
  });

  it('bet zones and units', () => {
    expect(koBetZone(-5, 6)).toBe('min');
    expect(koBetZone(-4, 6)).toBe('raise');
    expect(koBetZone(3, 6)).toBe('raise');
    expect(koBetZone(4, 6)).toBe('max');
    expect(koBetUnits(-5, 6)).toBe(1);
    expect(koBetUnits(-4, 6)).toBe(2);
    expect(koBetUnits(3, 6)).toBe(4);
    expect(koBetUnits(4, 6)).toBe(6);
    expect(koBetUnits(6, 6)).toBe(8);
    expect(koBetUnits(1, 1)).toBe(1);
    expect(koBetUnits(2, 1)).toBe(2);
  });

  it('quiz questions have the right answer for their count', () => {
    const rng = seededRng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const q = koQuestion([1, 2, 6, 8], rng);
      expect(q.answer).toBe(koBetZone(q.running, q.decks));
      seen.add(q.answer);
    }
    expect(seen.size).toBe(3);
  });
});

describe('Academy in other systems', () => {
  it('Omega II groups use level-two values and wider answer choices', () => {
    setCountingSystem('omegaII');
    const g: Card[] = [
      { rank: '5', suit: '♠' },
      { rank: 'K', suit: '♥' },
      { rank: '4', suit: '♦' },
    ];
    expect(groupValue(g)).toBe(2);
    expect(groupValue(g, 'hiLo')).toBe(1);
    expect(groupChoices(2)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
    expect(groupChoices(2, 'hiLo')).toEqual([-2, -1, 0, 1, 2]);
    expect(tagChoiceList()).toBe('−2, −1, 0, +1 or +2');
  });

  it('count story answers follow the system', () => {
    const s = countStory(4, seededRng(9), 'omegaII');
    expect(s.answer).toBe(runningCount(s.cards, 'omegaII'));
  });

  it('mode descriptions name the system and its tags', () => {
    setCountingSystem('omegaII');
    const tap = MODES.find((m) => m.id === 'tagTap')!;
    expect(tap.how).toMatch(/Omega II/);
    expect(tap.how).toMatch(/−2, −1, 0, \+1 or \+2/);
    setCountingSystem('hiLo');
    expect(tap.how).toMatch(/Hi-Lo tag \(−1, 0 or \+1\)/);
  });

  it('tag labels scale to ±2 without relying on color', () => {
    expect(tagText(2)).toBe('▲▲ +2');
    expect(tagText(-2)).toBe('▼▼ −2');
    expect(tagText(1)).toBe('▲ +1');
    expect(tagText(0)).toBe('● 0');
    expect(tagSymbol(-1)).toBe('▼');
  });
});

describe('Spanish', () => {
  it('explains the systems and lists choices in Spanish', () => {
    setLang('es');
    expect(systemNote('ko')).toMatch(/no es balanceado/);
    expect(systemNote('ko')).toMatch(/4 − 4 × barajas/);
    expect(systemNote('omegaII')).toMatch(/Omega II es balanceado/);
    expect(systemNote('hiLo')).not.toMatch(/\b(the|deck|count|true)\b/i);
    expect(tagChoiceList('omegaII')).toBe('−2, −1, 0, +1 o +2');
    setCountingSystem('ko');
    expect(MODES.find((m) => m.id === 'tagTap')!.how).toMatch(/Toca su valor KO \(−1, 0 o \+1\)/);
  });
});
