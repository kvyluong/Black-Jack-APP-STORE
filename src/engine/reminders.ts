// Daily practice reminders: when to send them and what they say. Pure logic, no React.
import { tr } from '../i18n/lang';

/** Default reminder time (local hour) until the player sets one. */
export const DEFAULT_REMINDER_HOUR = 19;
/** Reminders queued ahead. If the player stops opening the app, they go quiet after these. */
export const REMINDERS_AHEAD = 2;

/**
 * The next reminder times: one a day at `hour`, starting today unless today's goal is
 * already claimed or the hour has passed. Only `count` are queued, so a player who
 * stops opening the app gets at most that many before the reminders stop.
 */
export function reminderTimes(now: Date, hour: number, keptToday: boolean, count = REMINDERS_AHEAD): Date[] {
  const at = (dayOffset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
  const first = keptToday || at(0) <= now ? 1 : 0;
  return Array.from({ length: count }, (_, i) => at(first + i));
}

/** An hour of the day as players read it: "7 PM" in English, "19:00" in Spanish. */
export function formatHour(hour: number): string {
  const h12 = hour % 12 || 12;
  return tr(`${h12} ${hour < 12 ? 'AM' : 'PM'}`, `${hour}:00`);
}

/** Reminder copy: practice-focused, never casino-style. */
export function reminderText(streak: number): { title: string; body: string } {
  if (streak > 0) {
    return {
      title: tr(`Keep your ${streak}-day streak`, `Mantén tu racha de ${streak} ${streak === 1 ? 'día' : 'días'}`),
      body: tr('One daily goal is all it takes today.', 'Hoy basta con una meta diaria.'),
    };
  }
  return {
    title: tr('Your daily goals are ready', 'Tus metas diarias están listas'),
    body: tr('A few minutes of practice starts a streak.', 'Unos minutos de práctica empiezan una racha.'),
  };
}
