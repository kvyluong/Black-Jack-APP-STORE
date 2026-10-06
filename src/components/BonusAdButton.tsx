import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { useRewarded } from '../ads/useRewarded';
import { bonusAdsLeft, bonusChips, formatChips, recordBonusClaim } from '../engine/progression';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';
import { Button } from './ui';

const TEST_AD_SECONDS = 5;

const T = localized({
  en: {
    tomorrow: 'Bonus chips: come back tomorrow for more.',
    watch: (amount: string, left: number) => `▶ Watch an ad: +$${amount} chips (${left} left today)`,
    testAd: 'Test ad',
    testBody: 'Real rewarded ads only play in a development or store build. This stand-in lets you try the flow.',
    rewardIn: (s: number) => `Reward in ${s}s`,
    claim: (amount: string) => `Claim +$${amount}`,
    close: 'Close without reward',
  },
  es: {
    tomorrow: 'Fichas extra: vuelve mañana por más.',
    watch: (amount: string, left: number) => `▶ Mira un anuncio: +$${amount} en fichas (te quedan ${left} hoy)`,
    testAd: 'Anuncio de prueba',
    testBody: 'Los anuncios con recompensa reales solo se muestran en una build de desarrollo o de la tienda. Este sustituto te deja probar el flujo.',
    rewardIn: (s: number) => `Recompensa en ${s} s`,
    claim: (amount: string) => `Reclamar +$${amount}`,
    close: 'Cerrar sin recompensa',
  },
});

/**
 * "Watch an ad for bonus chips" button. Grants chips only after the ad is
 * watched to the end, up to a few times a day. Hidden when no ad is available.
 */
export function BonusAdButton({ onGranted }: { onGranted: (amount: number) => void }) {
  const { stats, addChips, updateStats } = useSettings();
  const rewarded = useRewarded();
  const [testAd, setTestAd] = useState<number | null>(null);
  const left = bonusAdsLeft(stats.bonusClaims, new Date());
  const amount = bonusChips(stats.peakChips);

  const grant = () => {
    addChips(amount);
    updateStats((s) => ({
      ...s,
      bonusClaims: recordBonusClaim(s.bonusClaims, new Date()),
      bonusChipsEarned: (s.bonusChipsEarned ?? 0) + amount,
    }));
    onGranted(amount);
  };

  // Development-only stand-in for the real ad, counting down like one.
  useEffect(() => {
    if (testAd === null || testAd <= 0) return;
    const id = setTimeout(() => setTestAd(testAd - 1), 1000);
    return () => clearTimeout(id);
  }, [testAd]);

  if (left === 0) return <Text style={styles.note}>{T.tomorrow}</Text>;
  if (!rewarded.ready) return null;

  return (
    <>
      <Button
        title={T.watch(formatChips(amount), left)}
        variant="secondary"
        onPress={() => (rewarded.simulated ? setTestAd(TEST_AD_SECONDS) : rewarded.show(grant))}
      />
      <Modal visible={testAd !== null} transparent animationType="fade" onRequestClose={() => setTestAd(null)}>
        <View style={styles.backdrop}>
          <View style={styles.box}>
            <Text style={styles.title}>{T.testAd}</Text>
            <Text style={styles.body}>{T.testBody}</Text>
            {testAd !== null && testAd > 0 ? (
              <Text style={styles.count}>{T.rewardIn(testAd)}</Text>
            ) : (
              <Button
                title={T.claim(formatChips(amount))}
                onPress={() => {
                  setTestAd(null);
                  grant();
                }}
              />
            )}
            <Button title={T.close} variant="ghost" onPress={() => setTestAd(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.muted, textAlign: 'center', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: spacing(2) },
  box: {
    backgroundColor: '#1B1B1B',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#666',
    borderStyle: 'dashed',
    padding: spacing(3),
    gap: spacing(1.5),
    maxWidth: 360,
    width: '100%',
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: '#CCCCCC', textAlign: 'center' },
  count: { color: colors.gold, fontSize: 18, fontWeight: '800', textAlign: 'center' },
});
