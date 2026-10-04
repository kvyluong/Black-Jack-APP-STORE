import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Preloads one rewarded ad and reloads after each one closes. */
export function useRewarded(): Rewarded {
  const adRef = useRef<RewardedAd | null>(null);
  const rewardRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const ads = getAds();
  const unitId = adUnitId('rewarded');
  const simulated = !ads && __DEV__;

  useEffect(() => {
    if (!ads || !unitId) return;
    const ad = ads.RewardedAd.createForAdRequest(unitId);
    adRef.current = ad;
    const subs = [
      ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => setReady(true)),
      ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
        rewardRef.current?.();
        rewardRef.current = null;
      }),
      ad.addAdEventListener(ads.AdEventType.CLOSED, () => {
        rewardRef.current = null;
        setReady(false);
        ad.load();
      }),
      ad.addAdEventListener(ads.AdEventType.ERROR, () => setReady(false)),
    ];
    ad.load();
    return () => {
      subs.forEach((unsubscribe) => unsubscribe());
      adRef.current = null;
    };
  }, [ads, unitId]);

  const show = useCallback((onReward: () => void) => {
    const ad = adRef.current;
    if (!ad) return;
    rewardRef.current = onReward;
    setReady(false);
    ad.show().catch(() => {
      rewardRef.current = null;
      ad.load();
    });
  }, []);

  return { ready: simulated || ready, simulated, show };
}
