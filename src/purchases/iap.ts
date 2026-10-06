import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export type IapModule = typeof import('expo-iap');

/** Store purchases need a development or store build (Expo Go has no billing module). */
export const iapSupported = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let cached: IapModule | null | undefined;

/** Loads expo-iap lazily so the app still runs in Expo Go. */
export function getIap(): IapModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (iapSupported) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-iap') as IapModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/** The one-time "Remove ads" product. Set the ID in app.json under `expo.extra.iap.removeAds`. */
export const REMOVE_ADS_SKU: string = (Constants.expoConfig?.extra?.iap as { removeAds?: string } | undefined)?.removeAds ?? 'remove_ads';
