import { Linking, Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/** Loads expo-notifications lazily; the web build has no local notifications. */
function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'web') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-notifications') as NotificationsModule;
      // A reminder that arrives while the app is open is moot: don't show it.
      cached.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        }),
      });
    } catch {
      cached = null;
    }
  }
  return cached;
}

export const remindersSupported = () => getNotifications() !== null;

/** Whether notifications are currently allowed, without asking. */
export async function reminderPermissionGranted(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    return (await N.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Opens this app's page in the system Settings, where notifications can be turned back on. */
export function openNotificationSettings() {
  void Linking.openSettings().catch(() => {});
}

/** Asks the system for permission (Android needs a channel first). Resolves to whether it was granted. */
export async function requestReminderPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('reminders', { name: 'Daily reminders', importance: N.AndroidImportance.DEFAULT });
    }
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
    return asked.granted;
  } catch {
    return false;
  }
}

// Calls run one at a time and only the latest request is applied, so two quick updates
// (a new day, then its streak) can't interleave their cancel and schedule steps and queue twice.
let latest = 0;
let queue: Promise<void> = Promise.resolve();

type ReminderText = { title: string; body: string };

/**
 * Replaces any queued reminders with these. An empty list just clears them. `texts`: one per
 * time (the last is reused if there are fewer), or one for all.
 */
export function scheduleReminders(times: Date[], texts: ReminderText | ReminderText[]): Promise<void> {
  const mine = ++latest;
  const list = Array.isArray(texts) ? texts : [texts];
  queue = queue.then(() => (mine === latest ? replaceReminders(times, list) : undefined));
  return queue;
}

async function replaceReminders(times: Date[], texts: ReminderText[]): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!times.length) return;
    const { granted } = await N.getPermissionsAsync();
    if (!granted) return;
    for (const [i, date] of times.entries()) {
      const text = texts[Math.min(i, texts.length - 1)];
      if (!text) continue;
      await N.scheduleNotificationAsync({
        content: { title: text.title, body: text.body },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === 'android' ? 'reminders' : undefined },
      });
    }
  } catch {
    // Reminders are a nicety; never let them break the app.
  }
}
