import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { HapticKind } from '../engine/dealSchedule';

const { ImpactFeedbackStyle: Impact, NotificationFeedbackType: Notify } = Haptics;

const ignore = () => {};
const impact = (style: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(style).catch(ignore);
const notify = (type: Haptics.NotificationFeedbackType) => Haptics.notificationAsync(type).catch(ignore);

/**
 * Plays a haptic. Bigger wins get longer patterns. Phones with haptics turned
 * off in system settings stay silent on their own.
 */
export function haptic(kind: HapticKind) {
  if (Platform.OS === 'web') return;
  try {
    switch (kind) {
      case 'cardLand':
        impact(Impact.Light);
        break;
      case 'flip':
        impact(Impact.Soft);
        break;
      case 'chip':
        Haptics.selectionAsync().catch(ignore);
        break;
      case 'win':
        notify(Notify.Success);
        break;
      case 'bigWin':
        notify(Notify.Success);
        setTimeout(() => impact(Impact.Medium), 140);
        break;
      case 'blackjack':
        notify(Notify.Success);
        setTimeout(() => impact(Impact.Heavy), 140);
        setTimeout(() => impact(Impact.Heavy), 280);
        break;
      case 'bust':
        notify(Notify.Error);
        break;
    }
  } catch {
    // No haptics on this device.
  }
}
