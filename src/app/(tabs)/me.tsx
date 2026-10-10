// Me: your chips and level, your casino-ready score and progress, and settings.
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LevelBar } from '../../components/chips';
import { featureInfo } from '../../components/featureInfo';
import { Meter } from '../../components/progress/Meter';
import { P, Panel, Screen } from '../../components/ui';
import { useUnlocks } from '../../components/useUnlocks';
import { formatChips } from '../../engine/progression';
import { benchmarks, readyHeadline, readyScore } from '../../engine/progress';
import { localized } from '../../i18n/lang';
import { useRemoveAds } from '../../purchases/RemoveAds';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    chips: 'Chips',
    accuracy: 'Accuracy',
    hands: 'Hands',
    score: 'Casino-ready score',
    settings: 'Settings',
    settingsBody: 'Language, table rules, coaching, sound and more',
    removeAds: 'Remove ads',
    disclaimer: 'For entertainment and education only. No real money gambling. Play responsibly.',
  },
  es: {
    chips: 'Fichas',
    accuracy: 'Precisión',
    hands: 'Manos',
    score: 'Puntaje para el casino',
    settings: 'Ajustes',
    settingsBody: 'Idioma, reglas de la mesa, coach, sonido y más',
    removeAds: 'Quitar anuncios',
    disclaimer: 'Solo para entretenimiento y aprendizaje. Sin apuestas con dinero real. Juega con responsabilidad.',
  },
});

export default function Me() {
  const { stats, settings } = useSettings();
  const unlocks = useUnlocks();
  const removeAds = useRemoveAds();
  const accuracy = stats.decisions ? `${Math.round((stats.correctDecisions / stats.decisions) * 100)}%` : '—';
  const list = benchmarks(stats);
  const score = readyScore(list);

  const go = (f: 'ready' | 'progress') => {
    unlocks.markSeen(f);
    router.push(featureInfo(f).href);
  };

  return (
    <Screen>
      <Panel>
        <View style={styles.stats}>
          <Stat label={T.chips} value={`$${formatChips(settings.bankroll)}`} />
          <Stat label={T.hands} value={String(stats.handsPlayed)} />
          <Stat label={T.accuracy} value={accuracy} />
        </View>
        <LevelBar xp={stats.xp} />
      </Panel>

      {unlocks.has('ready') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${featureInfo('ready').title}. ${T.score} ${score}. ${readyHeadline(list)}`}
          onPress={() => go('ready')}
          style={({ pressed }) => [styles.scoreCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.scoreHead}>
            <Text style={styles.scoreNum}>{score}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.scoreLabel}>{featureInfo('ready').title}</Text>
              <Meter value={score / 100} color={colors.gold} height={8} />
              <Text style={styles.next}>{readyHeadline(list)}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </View>
        </Pressable>
      ) : (
        <Text style={styles.lockedNote}>
          🔒 {featureInfo('ready').title} · {unlocks.hint('ready')}
        </Text>
      )}

      {unlocks.has('progress') && <Row icon="📈" title={featureInfo('progress').title} body={featureInfo('progress').body} isNew={unlocks.isNew('progress')} onPress={() => go('progress')} />}
      <Row icon="⚙️" title={T.settings} body={T.settingsBody} onPress={() => router.push('/settings' as Href)} />

      {!settings.adsRemoved && (removeAds.available || __DEV__) && (
        <Text style={styles.removeAds} onPress={() => router.push('/settings')} accessibilityRole="link">
          {T.removeAds}
          {removeAds.price ? ` · ${removeAds.price}` : ''}
        </Text>
      )}
      <P muted style={styles.disclaimer}>
        {T.disclaimer}
      </P>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, title, body, isNew, onPress }: { icon: string; title: string; body: string; isNew?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${body}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {title}
          {isNew ? '  ✦' : ''}
        </Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row' },
  statValue: { color: colors.gold, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 13 },
  scoreCard: { backgroundColor: colors.feltDark, borderRadius: radius.md, padding: spacing(2), borderWidth: 2, borderColor: colors.gold },
  scoreHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  scoreNum: { color: colors.gold, fontSize: 40, fontWeight: '900', minWidth: 60, textAlign: 'center' },
  scoreLabel: { color: colors.text, fontWeight: '800', fontSize: 16 },
  next: { color: colors.muted, fontSize: 13 },
  lockedNote: { color: colors.muted, textAlign: 'center', paddingVertical: spacing(1) },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), backgroundColor: colors.feltDark, padding: spacing(1.75), borderRadius: radius.md },
  icon: { fontSize: 26 },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  rowBody: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chev: { color: colors.muted, fontSize: 26 },
  removeAds: { color: colors.gold, textAlign: 'center', textDecorationLine: 'underline', marginTop: spacing(1) },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: spacing(1) },
});
