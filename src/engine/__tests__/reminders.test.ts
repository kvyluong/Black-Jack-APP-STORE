import { setLang } from '../../i18n/lang';
import { formatHour, reminderText, reminderTimes } from '../reminders';

const at = (d: Date) => [d.getDate(), d.getHours(), d.getMinutes()];

describe('reminders', () => {
  it('starts today when the goal is still open and the hour is ahead', () => {
    const now = new Date(2026, 9, 21, 10, 30);
    expect(reminderTimes(now, 19, false).map(at)).toEqual([
      [21, 19, 0],
      [22, 19, 0],
    ]);
  });

  it('skips today once a goal is claimed or the hour has passed', () => {
    const morning = new Date(2026, 9, 21, 10, 30);
    expect(reminderTimes(morning, 19, true).map(at)).toEqual([
      [22, 19, 0],
      [23, 19, 0],
    ]);
    const late = new Date(2026, 9, 21, 20, 0);
    expect(reminderTimes(late, 19, false)[0].getDate()).toBe(22);
  });

  it('queues only a couple ahead, so they stop if the app goes unopened', () => {
    expect(reminderTimes(new Date(2026, 9, 31, 8), 19, false)).toHaveLength(2);
    // Crosses the month end.
    expect(reminderTimes(new Date(2026, 9, 31, 20), 19, false).map((d) => d.getMonth())).toEqual([10, 10]);
  });

  it('writes practice copy in both languages', () => {
    setLang('en');
    expect(reminderText(4).title).toBe('Keep your 4-day streak');
    expect(reminderText(0).title).toBe('Your daily goals are ready');
    expect(formatHour(19)).toBe('7 PM');
    expect(formatHour(0)).toBe('12 AM');
    setLang('es');
    expect(reminderText(1).title).toBe('Mantén tu racha de 1 día');
    expect(formatHour(19)).toBe('19:00');
    setLang('en');
  });
});
