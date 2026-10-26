import { setLang } from '../../i18n/lang';
import { seededRng } from '../cards';
import {
  ExamInput,
  addExam,
  chatterLine,
  deckQuizDue,
  deckQuizPoints,
  examResult,
  gradeExam,
} from '../exam';
import { ExamResult } from '../records';

const perfect: ExamInput = {
  hands: 60,
  decisions: 80,
  correct: 80,
  countGuess: 5,
  countActual: 5,
  trueGuess: 2,
  trueActual: 2.5,
  deckErrors: [0.25, 0.1],
};

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
    // Count weight 25 of 60 (play 35 + count 25): 2 off = half of it.
    expect(gradeExam({ ...base, countGuess: 7 }).grade).toBe(Math.round((47.5 / 60) * 100));
    expect(gradeExam({ ...base, countGuess: 15 }).grade).toBe(Math.round((35 / 60) * 100));
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
