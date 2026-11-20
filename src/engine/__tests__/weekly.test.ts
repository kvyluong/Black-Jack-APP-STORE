import { HistoryPoint, weeklySummary } from '../progress';

/** A history point for a day: counters at the start and end of it. */
function day(d: string, start: Partial<Record<string, number>>, end: Partial<Record<string, number>>): HistoryPoint {
  const fill = (v: Partial<Record<string, number>>) => ({ hands: 0, decisions: 0, correct: 0, bestDeckMs: 0, ...v }) as Record<string, number>;
  return { day: d, start: fill(start), values: fill(end) };
}

// 2026-11-16 is a Monday; "today" is the next Monday, 2026-11-23.
const TODAY = '2026-11-23';

describe('weekly summary', () => {
  it('sums last week (Monday to Sunday) and compares accuracy with the week before', () => {
    const points = [
      // The week before: 10 decisions, 8 right.
      day('2026-11-12', { hands: 0, decisions: 0, correct: 0 }, { hands: 5, decisions: 10, correct: 8 }),
      // Last week: 20 + 10 hands, 30 decisions, 27 right, on two days.
      day('2026-11-16', { hands: 5, decisions: 10, correct: 8 }, { hands: 25, decisions: 30, correct: 26 }),
      day('2026-11-22', { hands: 25, decisions: 30, correct: 26 }, { hands: 35, decisions: 40, correct: 35 }),
      // Today doesn't count.
      day(TODAY, { hands: 35, decisions: 40, correct: 35 }, { hands: 50, decisions: 60, correct: 40 }),
    ];
    expect(weeklySummary(points, TODAY)).toEqual({
      week: '2026-11-16',
      hands: 30,
      decisions: 30,
      accuracy: 90,
      accuracyBefore: 80,
      newBestDeckMs: null,
      daysPracticed: 2,
    });
  });

  it('is the same any day of the week', () => {
    const points = [day('2026-11-18', {}, { hands: 4 })];
    expect(weeklySummary(points, '2026-11-23')?.hands).toBe(4);
    expect(weeklySummary(points, '2026-11-29')?.hands).toBe(4);
    expect(weeklySummary(points, '2026-11-30')).toBeNull();
  });

  it('reports a new best deck time set last week only', () => {
    const older = day('2026-11-10', {}, { bestDeckMs: 40000 });
    const better = day('2026-11-19', { bestDeckMs: 40000 }, { bestDeckMs: 31000 });
    expect(weeklySummary([older, better], TODAY)).toMatchObject({ newBestDeckMs: 31000, hands: 0, daysPracticed: 1 });
    // No new record last week, and no hands: nothing to show.
    expect(weeklySummary([older], TODAY)).toBeNull();
  });

  it('has no accuracy without decisions, and is empty for a new player', () => {
    expect(weeklySummary([day('2026-11-17', {}, { hands: 3 })], TODAY)).toMatchObject({ accuracy: null, accuracyBefore: null });
    expect(weeklySummary([], TODAY)).toBeNull();
  });
});
