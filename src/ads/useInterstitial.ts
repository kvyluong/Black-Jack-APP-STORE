import { useCallback, useEffect, useRef } from 'react';
import type { InterstitialAd } from 'react-native-google-mobile-ads';

import { INTERSTITIAL_EVERY_N_ROUNDS, INTERSTITIAL_MIN_INTERVAL_MS, adUnitId, getAds } from './config';

/**
 * Preloads an interstitial and exposes `onRoundBreak()`, called at natural pauses
 * (between hands). It shows an ad at most every N rounds and every few minutes.
 */
export function useInterstitial() {
  const adRef = useRef<InterstitialAd | null>(null);
  const loaded = useRef(false);
  const rounds = useRef(0);
  const lastShown = useRef(Date.now());

  useEffect(() => {
    const ads = getAds();
    const unitId = adUnitId('interstitial');
    if (!ads || !unitId) return;
    const ad = ads.InterstitialAd.createForAdRequest(unitId);
    adRef.current = ad;
    const subs = [
      ad.addAdEventListener(ads.AdEventType.LOADED, () => {
        loaded.current = true;
      }),
      ad.addAdEventListener(ads.AdEventType.CLOSED, () => {
        loaded.current = false;
        ad.load();
      }),
      ad.addAdEventListener(ads.AdEventType.ERROR, () => {
        loaded.current = false;
      }),
    ];
    ad.load();
    return () => {
      subs.forEach((unsubscribe) => unsubscribe());
      adRef.current = null;
    };
  }, []);

  return useCallback(() => {
    rounds.current += 1;
    const due =
      rounds.current >= INTERSTITIAL_EVERY_N_ROUNDS && Date.now() - lastShown.current >= INTERSTITIAL_MIN_INTERVAL_MS;
    if (!due || !loaded.current || !adRef.current) return;
    rounds.current = 0;
    lastShown.current = Date.now();
    loaded.current = false;
    adRef.current.show().catch(() => adRef.current?.load());
  }, []);
}
