// Web build: there's no app store to buy from.
export type IapModule = typeof import('expo-iap');
export const iapSupported = false;
export function getIap(): IapModule | null {
  return null;
}
export const REMOVE_ADS_SKU = 'remove_ads';
