import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type AdsModule = typeof import('react-native-google-mobile-ads');

/** Expo Go doesn't bundle the Google Mobile Ads native module; ads need a development or store build. */
export const adsSupported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let cached: AdsModule | null | undefined;

/** Loads the ads SDK lazily so the app still runs in Expo Go and on web. */
export function getAds(): AdsModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (adsSupported) {
    try {
      cached = require('react-native-google-mobile-ads') as AdsModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

type Placement = 'banner' | 'interstitial';

interface AdUnitConfig {
  ios?: Partial<Record<Placement, string>>;
  android?: Partial<Record<Placement, string>>;
}

/**
 * Real ad unit IDs live in app.json under `expo.extra.adUnits`. Development builds
 * always use Google's test units — never click live ads during development.
 */
export function adUnitId(placement: Placement): string | null {
  const ads = getAds();
  if (!ads) return null;
  if (__DEV__) return placement === 'banner' ? ads.TestIds.ADAPTIVE_BANNER : ads.TestIds.INTERSTITIAL;
  const units = (Constants.expoConfig?.extra?.adUnits ?? {}) as AdUnitConfig;
  const platformUnits = Platform.OS === 'ios' ? units.ios : units.android;
  const id = platformUnits?.[placement];
  return id && !id.includes('REPLACE') ? id : null;
}

/** Interstitial frequency caps: only between hands, never more than this often. */
export const INTERSTITIAL_EVERY_N_ROUNDS = 10;
export const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;
