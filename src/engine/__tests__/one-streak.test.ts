import { recordWorkoutDay, workoutsThisWeek, WORKOUT_DAYS_KEPT } from '../academy';
import { claimGoal, currentStreak, emptyGoals, keepStreak, weekStart } from '../progress';

describe('one streak: an Academy workout keeps the daily goal streak', () => {
  it('starts, extends and restarts the streak like a first claim', () => {
    const started = keepStreak(emptyGoals(), '2026-11-02');
    expect(started).toMatchObject({ streak: 1, lastCompleteDay: '2026-11-02' });
    const next = keepStreak(started, '2026-11-03');
    expect(next.streak).toBe(2);
    // After a missed day it restarts.
    expect(keepStreak(next, '2026-11-05').streak).toBe(1);
  });

  it('counts a day once, whether the workout or a claim comes first', () => {
    const g = { ...emptyGoals(), streak: 4, lastCompleteDay: '2026-11-02' };
    const afterWorkout = keepStreak(g, '2026-11-03');
    expect(afterWorkout.streak).toBe(5);
    expect(keepStreak(afterWorkout, '2026-11-03')).toBe(afterWorkout);
    const claimed = claimGoal(afterWorkout, 'hands', '2026-11-03', ['hands', 'lesson', 'correct']);
    expect(claimed.streak).toBe(5);
    expect(claimed.claimed).toEqual(['hands']);
    // And a claim first, then the workout.
    const claimFirst = claimGoal(g, 'hands', '2026-11-03', ['hands']);
    expect(keepStreak(claimFirst, '2026-11-03').streak).toBe(5);
    expect(currentStreak(afterWorkout, '2026-11-04')).toBe(5);
  });
});

describe('workouts this week', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-11-16')).toBe('2026-11-16'); // Monday
    expect(weekStart('2026-11-20')).toBe('2026-11-16'); // Friday
    expect(weekStart('2026-11-22')).toBe('2026-11-16'); // Sunday
    expect(weekStart('2026-03-01')).toBe('2026-02-23'); // across a month end
  });

  it('counts only this week and never a day twice', () => {
    let days = recordWorkoutDay(undefined, '2026-11-13');
    days = recordWorkoutDay(days, '2026-11-16');
    days = recordWorkoutDay(days, '2026-11-18');
    days = recordWorkoutDay(days, '2026-11-18');
    expect(days).toEqual(['2026-11-13', '2026-11-16', '2026-11-18']);
    expect(workoutsThisWeek(days, '2026-11-18', '2026-11-20')).toBe(2);
    expect(workoutsThisWeek(days, '2026-11-18', '2026-11-23')).toBe(0);
  });

  it('reads old saves that only know the last workout day', () => {
    expect(workoutsThisWeek(undefined, '2026-11-17', '2026-11-20')).toBe(1);
    expect(workoutsThisWeek(undefined, undefined, '2026-11-20')).toBe(0);
  });

  it('keeps only the last two weeks', () => {
    let days: string[] = [];
    for (let i = 1; i <= 30; i++) days = recordWorkoutDay(days, `2026-10-${String(i).padStart(2, '0')}`);
    expect(days).toHaveLength(WORKOUT_DAYS_KEPT);
    expect(days[days.length - 1]).toBe('2026-10-30');
  });
});
