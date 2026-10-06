import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSettings } from '../state/settings';
import { adUnitId, getAds } from './config';

/** Anchored adaptive banner. Renders nothing when ads aren't available. */
export function AdBanner() {
  const [failed, setFailed] = useState(false);
  const { settings } = useSettings();
  if (settings.adsRemoved) return null;
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
