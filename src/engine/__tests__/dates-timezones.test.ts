// Streaks, freezes, reminders and review days across DST changes and midnight,
// in the time zone the tests run in. The days the clocks change are found from the
// zone itself, so this checks any zone, e.g.
//   TZ=America/Santiago npx jest dates-timezones   (00:00 is skipped on its spring-forward day)
//   TZ=Australia/Sydney npx jest dates-timezones
import { addDays as reviewAddDays, dayText, review } from '../deviations';
import { setLang } from '../../i18n/lang';
import { GoalsState, addDays, applyFreezes, claimGoal, currentStreak, daysBetween, emptyGoals } from '../progress';
import { localDay } from '../progression';
import { reminderTimes } from '../reminders';

const ymd = (day: string) => day.split('-').map(Number);

/** Days in 2026 whose UTC offset differs from the day before (DST changes), or two plain days without DST. */
function changeDays(): string[] {
  const out: string[] = [];
  for (let day = '2026-01-02'; day < '2027-01-01'; day = addDays(day, 1)) {
    const [y, m, d] = ymd(day);
    if (new Date(y, m - 1, d, 12).getTimezoneOffset() !== new Date(y, m - 1, d - 1, 12).getTimezoneOffset()) out.push(day);
  }
  return out.length ? out : ['2026-03-08', '2026-11-01'];
}

const DAYS = changeDays();

describe(`dates around ${DAYS.join(', ')} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, () => {
  it.each(DAYS)('day math across the change on %s', (day) => {
    const before = addDays(day, -1);
    const after = addDays(day, 1);
    expect(addDays(before, 1)).toBe(day);
    expect(addDays(after, -1)).toBe(day);
    expect(daysBetween(before, after)).toBe(2);
    expect(reviewAddDays(before, 2)).toBe(after);
    const [y, m, d] = ymd(day);
    // The first and last minute of the day both belong to it.
    expect(localDay(new Date(y, m - 1, d, 0, 0))).toBe(day);
    expect(localDay(new Date(y, m - 1, d, 23, 59))).toBe(day);
    expect(localDay(new Date(y, m - 1, d + 1, 0, 0))).toBe(after);
  });

  it.each(DAYS)('reminders stay at the chosen local hour across %s', (day) => {
    const [y, m, d] = ymd(addDays(day, -1));
    const times = reminderTimes(new Date(y, m - 1, d, 20, 0), 19, false);
    expect(times.map((t) => localDay(t))).toEqual([day, addDays(day, 1)]);
    expect(times.map((t) => t.getHours())).toEqual([19, 19]);
  });

  it.each(DAYS)('a streak carries over the change on %s and lapses a day later', (day) => {
    const yesterday = addDays(day, -1);
    let g: GoalsState = claimGoal(emptyGoals(), 'hands', yesterday, ['hands']);
    g = claimGoal({ ...g, claimed: [] }, 'hands', day, ['hands']);
    expect(g.streak).toBe(2);
    expect(currentStreak(g, addDays(day, 1))).toBe(2);
    expect(currentStreak(g, addDays(day, 2))).toBe(0);
  });

  it.each(DAYS)('a freeze covers exactly the missed day %s', (day) => {
    const last = addDays(day, -1);
    const g: GoalsState = { ...emptyGoals(), streak: 5, lastCompleteDay: last, freezes: 1 };
    const next = applyFreezes(g, addDays(day, 1));
    expect(next.freezes).toBe(0);
    expect(next.frozen).toEqual({ day: addDays(day, 1), count: 1 });
    expect(currentStreak(next, addDays(day, 1))).toBe(5);
  });

  it.each(DAYS)('count-play reviews come due on the right day across %s', (day) => {
    const before = addDays(day, -1);
    const mem = review(undefined, true, before);
    expect(mem.box).toBe(1);
    expect(mem.due).toBe(day);
    setLang('en');
    expect(dayText(day, before)).toBe('tomorrow');
    expect(dayText(addDays(day, 1), before)).toBe('in 2 days');
  });
});
