import { useCallback, useEffect, useRef } from 'react';
import type { InterstitialAd } from 'react-native-google-mobile-ads';

import { usePrefs } from '../state/settings';
import { INTERSTITIAL_EVERY_N_ROUNDS, INTERSTITIAL_MIN_INTERVAL_MS, adUnitId, getAds } from './config';

/**
 * Preloads an interstitial and exposes `onRoundBreak(shuffled)`, called between hands.
 * Every hand counts toward the cap (at most every N rounds and every few minutes), but
 * the ad only shows at a natural break: when the shoe is reshuffled. `quiet` (the
 * player's first day) shows none at all.
 */
export function useInterstitial(quiet = false) {
  const { settings } = usePrefs();
  const adsRemoved = settings.adsRemoved;
  const adRef = useRef<InterstitialAd | null>(null);
  const loaded = useRef(false);
  const rounds = useRef(0);
  // The clock starts when the screen opens (set in the effect below).
  const lastShown = useRef(0);

  useEffect(() => {
    lastShown.current = Date.now();
    const ads = getAds();
    const unitId = adUnitId('interstitial');
    if (!ads || !unitId || adsRemoved) return;
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
  }, [adsRemoved]);

  return useCallback(
    (shuffled: boolean) => {
      rounds.current += 1;
      const due =
        rounds.current >= INTERSTITIAL_EVERY_N_ROUNDS && Date.now() - lastShown.current >= INTERSTITIAL_MIN_INTERVAL_MS;
      if (quiet || !shuffled || !due || !loaded.current || !adRef.current) return;
      rounds.current = 0;
      lastShown.current = Date.now();
      loaded.current = false;
      adRef.current.show().catch(() => adRef.current?.load());
    },
    [quiet],
  );
}
