import { LESSONS } from '../../content/lessons';
import { LESSONS_ES } from '../../content/lessons.es';
import { WARMUP_SIZE, lastLesson, returningAway, warmupQuestions } from '../checkpoint';
import { emptyLeaks } from '../leaks';
import { ProgressStats, RETURNING_AFTER_DAYS, emptyGoals, rolloverDay } from '../progress';

const stats = (over: Partial<ProgressStats>): ProgressStats => ({
  handsPlayed: 10,
  decisions: 0,
  correctDecisions: 0,
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

describe('welcome back: who gets it', () => {
  const lastOpen = (day: string) => ({ ...emptyGoals(), day, start: { hands: 10 } });

  it(`marks an open after ${RETURNING_AFTER_DAYS}+ days away`, () => {
    const back = rolloverDay(stats({ goals: lastOpen('2026-11-01') }), '2026-11-08')!;
    expect(back.goals.returned).toEqual({ day: '2026-11-08', away: 7 });
    expect(returningAway(back.goals, '2026-11-08', true)).toBe(7);
    // Only on that day, and only for players who had started.
    expect(returningAway(back.goals, '2026-11-09', true)).toBeNull();
    expect(returningAway(back.goals, '2026-11-08', false)).toBeNull();
  });

  it('not after a shorter gap, and not on a first open', () => {
    expect(rolloverDay(stats({ goals: lastOpen('2026-11-02') }), '2026-11-08')!.goals.returned).toBeNull();
    expect(rolloverDay(stats({}), '2026-11-08')!.goals.returned).toBeNull();
  });

  it('the next day clears it, and old saves without it read as not returning', () => {
    const back = rolloverDay(stats({ goals: lastOpen('2026-10-01') }), '2026-11-08')!;
    const nextDay = rolloverDay(stats({ goals: back.goals }), '2026-11-09')!;
    expect(nextDay.goals.returned).toBeNull();
    expect(returningAway({ ...emptyGoals() }, '2026-11-08', true)).toBeNull();
    expect(returningAway(undefined, '2026-11-08', true)).toBeNull();
  });
});

describe('welcome back: the warm-up', () => {
  it('asks from the lesson finished last, then the ones before it', () => {
    const done = ['rules', 'soft-hard', 'actions', 'basic-strategy'];
    const qs = warmupQuestions(LESSONS, done);
    expect(qs).toHaveLength(WARMUP_SIZE);
    const order = [...new Set(qs.map((q) => q.lessonId))];
    expect(order[0]).toBe('basic-strategy');
    expect(order).toEqual(done.slice().reverse().slice(0, order.length));
    expect(lastLesson(LESSONS, done)?.id).toBe('basic-strategy');
  });

  it('follows the order lessons were finished, not their order in the course', () => {
    const qs = warmupQuestions(LESSONS, ['hi-lo', 'rules']);
    expect(qs[0].lessonId).toBe('rules');
  });

  it('gives what there is with few lessons, and nothing with none', () => {
    const one = warmupQuestions(LESSONS, ['rules']);
    expect(one.length).toBe(LESSONS.find((l) => l.id === 'rules')!.quiz.length);
    expect(warmupQuestions(LESSONS, [])).toEqual([]);
    expect(warmupQuestions(LESSONS, ['gone-lesson'])).toEqual([]);
    expect(lastLesson(LESSONS, [])).toBeUndefined();
  });

  it('asks the same questions in Spanish', () => {
    const done = ['rules', 'soft-hard', 'actions'];
    const en = warmupQuestions(LESSONS, done);
    const es = warmupQuestions(LESSONS_ES, done);
    expect(es.map((q) => [q.lessonId, q.answer])).toEqual(en.map((q) => [q.lessonId, q.answer]));
  });
});
