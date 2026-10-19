import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePrefs } from '../state/settings';
import { adUnitId, getAds } from './config';

/**
 * Anchored adaptive banner. Renders nothing when ads aren't available.
 * Only the screen you're looking at keeps its banner: screens left underneath in the stack
 * (or in other tabs) drop theirs, instead of each holding a live ad that keeps refreshing.
 */
export function AdBanner() {
  const [failed, setFailed] = useState(false);
  const { settings } = usePrefs();
  const focused = useIsFocused();
  if (settings.adsRemoved || !focused) return null;
  const ads = getAds();
  const unitId = adUnitId('banner');
  if (!ads || !unitId || failed) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={styles.wrap}>
      <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} onAdFailedToLoad={() => setFailed(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', backgroundColor: '#000' },
});
