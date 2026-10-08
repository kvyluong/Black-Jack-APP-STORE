import { setLang } from '../../i18n/lang';
import { seededRng } from '../cards';
import {
  BetRecord,
  ExamInput,
  addExam,
  betScore,
  chatterLine,
  deckQuizDue,
  deckQuizPoints,
  examResult,
  gradeExam,
  idealUnits,
  roundBetScore,
} from '../exam';
import { ExamResult } from '../records';

const bets = (pairs: [number, number][]): BetRecord[] => pairs.map(([units, ideal]) => ({ units, ideal }));

const perfect: ExamInput = {
  hands: 60,
  decisions: 80,
  correct: 80,
  bets: bets([[1, 1], [1, 1], [4, 4], [8, 8]]),
  countGuess: 5,
  countActual: 5,
  trueGuess: 2,
  trueActual: 2.5,
  deckErrors: [0.25, 0.1],
};

describe('bet score', () => {
  it('scores each bet as smaller ÷ larger', () => {
    expect(roundBetScore({ units: 4, ideal: 4 })).toBe(1);
    expect(roundBetScore({ units: 2, ideal: 1 })).toBe(0.5);
    expect(roundBetScore({ units: 6, ideal: 8 })).toBe(0.75);
    expect(roundBetScore({ units: 0, ideal: 1 })).toBe(0);
  });

  it('uses the app’s bet ramp', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(idealUnits)).toEqual([1, 1, 2, 4, 6, 8, 8]);
  });

  it('weighs minimum-bet and raise rounds half each, so flat betting fails', () => {
    expect(betScore(bets([[1, 1], [1, 1], [4, 4]]))).toBe(1);
    // Flat 1 unit: perfect in neutral rounds, poor when the count is high.
    const flat = betScore(bets([...Array(20).fill([1, 1]), [1, 2], [1, 4], [1, 8]]));
    expect(flat).toBeLessThan(0.7);
    // Always 4 units: bad in neutral rounds.
    expect(betScore(bets([[4, 1], [4, 1], [4, 4]]))).toBeCloseTo(0.625);
    expect(betScore(bets([[1, 1], [2, 1]]))).toBe(0.75);
    expect(betScore([])).toBe(0);
  });
});

describe('decks-left questions', () => {
  it('lands one in each part of the shoe', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 100; i++) {
      const [a, b] = deckQuizPoints(312, 0.75, rng);
      expect(a).toBeGreaterThanOrEqual(Math.round(234 * 0.15));
      expect(a).toBeLessThanOrEqual(Math.round(234 * 0.45));
      expect(b).toBeGreaterThan(a);
      expect(b).toBeLessThanOrEqual(Math.round(234 * 0.85));
    }
  });

  it('is due once the shoe passes the next point', () => {
    expect(deckQuizDue(40, [50, 150], 0)).toBe(false);
    expect(deckQuizDue(55, [50, 150], 0)).toBe(true);
    expect(deckQuizDue(55, [50, 150], 1)).toBe(false);
    expect(deckQuizDue(200, [50, 150], 2)).toBe(false);
  });
});

describe('grading', () => {
  it('passes a clean shoe with a high grade', () => {
    const r = gradeExam(perfect);
    expect(r.passed).toBe(true);
    expect(r.playAccuracy).toBe(1);
    expect(r.trueError).toBe(0.5);
    expect(r.deckError).toBe(0.18);
    expect(r.grade).toBeGreaterThanOrEqual(90);
    expect(r.grade).toBeLessThanOrEqual(100);
  });

  it('fails on any missed pass mark', () => {
    expect(gradeExam({ ...perfect, countGuess: 6 }).passed).toBe(false);
    expect(gradeExam({ ...perfect, trueGuess: 4 }).checks.trueCount).toBe(false);
    expect(gradeExam({ ...perfect, correct: 75 }).checks.play).toBe(false); // 93.75%
    expect(gradeExam({ ...perfect, correct: 76 }).checks.play).toBe(true); // 95%
    expect(gradeExam({ ...perfect, deckErrors: [1, 0.5] }).checks.decks).toBe(false);
    expect(gradeExam({ ...perfect, bets: bets([[1, 1], [1, 4]]) }).checks.bet).toBe(false);
  });

  it('leaves out the true count for KO and scales the rest', () => {
    const ko = gradeExam({ ...perfect, trueGuess: null, trueActual: null, deckErrors: [] });
    expect(ko.checks.trueCount).toBeNull();
    expect(ko.checks.decks).toBeNull();
    expect(ko.passed).toBe(true);
    expect(ko.grade).toBe(100);
  });

  it('drops the count part linearly', () => {
    const base = { ...perfect, trueGuess: null, trueActual: null, deckErrors: [] };
    // Count weight 20 of 70: 2 off = half of it.
    expect(gradeExam({ ...base, countGuess: 7 }).grade).toBe(Math.round((60 / 70) * 100));
    expect(gradeExam({ ...base, countGuess: 15 }).grade).toBe(Math.round((50 / 70) * 100));
  });

  it('saves a result and keeps the last 20', () => {
    const r = gradeExam(perfect);
    const saved = examResult(perfect, r, '2026-10-08');
    expect(saved).toMatchObject({ day: '2026-10-08', hands: 60, countGuess: 5, countActual: 5, passed: true });
    let list: ExamResult[] = [];
    for (let i = 0; i < 25; i++) list = addExam(list, { ...saved, hands: i });
    expect(list).toHaveLength(20);
    expect(list[19].hands).toBe(24);
  });
});

describe('table chatter', () => {
  afterEach(() => setLang('en'));
  it('speaks the app language', () => {
    expect(chatterLine(() => 0)).toBe('Hot shoe tonight!');
    setLang('es');
    expect(chatterLine(() => 0)).toBe('¡Qué zapato tan caliente!');
  });
});
