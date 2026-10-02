// Web build (used for quick previews): the Google Mobile Ads SDK is native-only.
type AdsModule = typeof import('react-native-google-mobile-ads');

export const adsSupported = false;

export function getAds(): AdsModule | null {
  return null;
}

export function adUnitId(_placement: 'banner' | 'interstitial'): string | null {
  return null;
}

export const INTERSTITIAL_EVERY_N_ROUNDS = 10;
export const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;
