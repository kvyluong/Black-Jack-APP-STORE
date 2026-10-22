import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { RewardedAd } from 'react-native-google-mobile-ads';

import { adUnitId, getAds } from './config';

export interface Rewarded {
  /** An ad is loaded and can be shown now. */
  ready: boolean;
  /** No real ad SDK here (Expo Go or web in development): the UI shows a test ad instead. */
  simulated: boolean;
  /**
   * Shows the ad. `onReward` runs only if the player watches it to the end
   * (the SDK's earned-reward event), never just for opening it.
   */
  show: (onReward: () => void) => void;
}

// One rewarded ad for the whole app, loaded once and reloaded after each one closes. The
// bonus button is mounted and unmounted every hand (it lives in the betting panel), so a
// per-component ad would be requested and thrown away each round.
let ad: RewardedAd | null = null;
let loaded = false;
let onReward: (() => void) | null = null;
const listeners = new Set<() => void>();

function setLoaded(value: boolean) {
  loaded = value;
  listeners.forEach((l) => l());
}

function start() {
  const ads = getAds();
  const unitId = adUnitId('rewarded');
  if (ad || !ads || !unitId) return;
  const a = ads.RewardedAd.createForAdRequest(unitId);
  ad = a;
  // A failed load (e.g. offline for a moment) tries again later, waiting longer each time.
  let retry: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  a.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
    failures = 0;
    setLoaded(true);
  });
  a.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
    onReward?.();
    onReward = null;
  });
  a.addAdEventListener(ads.AdEventType.CLOSED, () => {
    onReward = null;
    setLoaded(false);
    a.load();
  });
  a.addAdEventListener(ads.AdEventType.ERROR, () => {
    setLoaded(false);
    failures++;
    clearTimeout(retry);
    retry = setTimeout(() => a.load(), Math.min(5 * 60_000, 15_000 * 2 ** (failures - 1)));
  });
  a.load();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getLoaded = () => loaded;

/** The shared rewarded ad. `enabled`: start loading it (skip while there are no bonuses left today). */
export function useRewarded(enabled = true): Rewarded {
  const ready = useSyncExternalStore(subscribe, getLoaded, getLoaded);
  const simulated = !getAds() && __DEV__;

  useEffect(() => {
    if (enabled) start();
  }, [enabled]);

  const show = useCallback((cb: () => void) => {
    const a = ad;
    if (!a || !loaded) return;
    onReward = cb;
    setLoaded(false);
    a.show().catch(() => {
      onReward = null;
      a.load();
    });
  }, []);

  return { ready: simulated || ready, simulated, show };
}
