import { Platform } from 'react-native';

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

/** Replaces any queued reminders with these. An empty list just clears them. */
export async function scheduleReminders(times: Date[], text: { title: string; body: string }): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!times.length) return;
    const { granted } = await N.getPermissionsAsync();
    if (!granted) return;
    for (const date of times) {
      await N.scheduleNotificationAsync({
        content: { title: text.title, body: text.body },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === 'android' ? 'reminders' : undefined },
      });
    }
  } catch {
    // Reminders are a nicety; never let them break the app.
  }
}
