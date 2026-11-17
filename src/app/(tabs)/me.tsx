// Me: your level and stats, your casino-ready score and progress, and settings.
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { featureInfo } from '../../components/featureInfo';
import { IconName, IconWell } from '../../components/Icon';
import { Meter } from '../../components/progress/Meter';
import { P, Screen } from '../../components/ui';
import { useUnlocks } from '../../components/useUnlocks';
import { levelInfo } from '../../engine/progression';
import { benchmarks, readyHeadline, readyScore } from '../../engine/progress';
import { localized } from '../../i18n/lang';
import { useRemoveAds } from '../../purchases/RemoveAds';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    level: 'Level',
    accuracy: 'Accuracy',
    hands: 'Hands',
    xp: 'Total XP',
    levelN: (n: number) => `Level ${n}`,
    toNext: (into: number, span: number) => `${into.toLocaleString('en-US')} / ${span.toLocaleString('en-US')} XP`,
    score: 'Casino-ready score',
    settings: 'Settings',
    settingsBody: 'Language, table rules, coaching, sound and more',
    removeAds: 'Remove ads',
    disclaimer: 'For education and entertainment. ShoeSharp has no betting, no chips and no prizes: every hand is practice.',
  },
  es: {
    level: 'Nivel',
    accuracy: 'Precisión',
    hands: 'Manos',
    xp: 'XP total',
    levelN: (n: number) => `Nivel ${n}`,
    toNext: (into: number, span: number) => `${into.toLocaleString('es')} / ${span.toLocaleString('es')} XP`,
    score: 'Puntaje para el casino',
    settings: 'Ajustes',
    settingsBody: 'Idioma, reglas de la mesa, coach, sonido y más',
    removeAds: 'Quitar anuncios',
    disclaimer: 'Para aprender y entretenerse. ShoeSharp no tiene apuestas, fichas ni premios: cada mano es práctica.',
  },
});

export default function Me() {
  const { stats, settings } = useSettings();
  const unlocks = useUnlocks();
  const removeAds = useRemoveAds();
  const accuracy = stats.decisions ? `${Math.round((stats.correctDecisions / stats.decisions) * 100)}%` : '—';
  const list = benchmarks(stats);
  const score = readyScore(list);
  const lvl = levelInfo(stats.xp);

  const go = (f: 'ready' | 'progress') => {
    unlocks.markSeen(f);
    router.push(featureInfo(f).href);
  };

  return (
    <Screen>
      {/* Profile: your level as a casino chip, XP to the next one, and your numbers. */}
      <View style={styles.profile}>
        <View style={styles.profileTop}>
          <View style={styles.chip} accessible accessibilityLabel={T.levelN(lvl.level)}>
            <View style={styles.chipInner}>
              <Text style={styles.chipNum} numberOfLines={1} adjustsFontSizeToFit>
                {lvl.level}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.levelTitle}>{lvl.title}</Text>
            <Text style={styles.levelSub}>{T.levelN(lvl.level)}</Text>
            <Meter value={lvl.into / lvl.span} color={colors.gold} height={8} />
            <Text style={styles.xpText}>{T.toNext(lvl.into, lvl.span)}</Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat label={T.hands} value={stats.handsPlayed.toLocaleString('en-US')} />
          <View style={styles.statDivider} />
          <Stat label={T.accuracy} value={accuracy} />
          <View style={styles.statDivider} />
          <Stat label={T.xp} value={stats.xp.toLocaleString('en-US')} />
        </View>
      </View>

      {unlocks.has('ready') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${featureInfo('ready').title}. ${T.score} ${score}. ${readyHeadline(list, settings.experienced)}`}
          onPress={() => go('ready')}
          style={({ pressed }) => [styles.scoreCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.scoreHead}>
            <View style={styles.scoreRing}>
              <Text style={styles.scoreNum}>{score}</Text>
              <Text style={styles.scorePct}>%</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.scoreLabel}>{featureInfo('ready').title}</Text>
              <Meter value={score / 100} color={colors.gold} height={8} />
              <Text style={styles.next}>{readyHeadline(list, settings.experienced)}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </View>
        </Pressable>
      ) : (
        <Text style={styles.lockedNote}>
          {featureInfo('ready').title} · {unlocks.hint('ready')}
        </Text>
      )}

      <View style={styles.group}>
        {unlocks.has('progress') && (
          <Row
            icon="progress"
            tint="#7FD8A6"
            title={featureInfo('progress').title}
            body={featureInfo('progress').body}
            isNew={unlocks.isNew('progress')}
            onPress={() => go('progress')}
          />
        )}
        <Row
          icon="settings"
          tint="#8DB8F2"
          divider={unlocks.has('progress')}
          title={T.settings}
          body={T.settingsBody}
          onPress={() => router.push('/settings' as Href)}
        />
      </View>

      {!settings.adsRemoved && (removeAds.available || __DEV__) && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.removeAds, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.removeAdsText}>
            {T.removeAds}
            {removeAds.price ? ` · ${removeAds.price}` : ''}
          </Text>
        </Pressable>
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
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  tint,
  divider,
  title,
  body,
  isNew,
  onPress,
}: {
  icon: IconName;
  tint: string;
  divider?: boolean;
  title: string;
  body: string;
  isNew?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
    >
      <IconWell name={icon} tint={tint} />
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

const CARD = { backgroundColor: colors.feltDark, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' } as const;

const styles = StyleSheet.create({
  profile: { ...CARD, borderColor: 'rgba(232,197,71,0.3)', padding: spacing(2.5), gap: spacing(2) },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  // A gold casino chip: dashed edge spots around a solid center.
  chip: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gold,
    borderWidth: 5,
    borderStyle: 'dashed',
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipNum: { color: colors.black, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  levelTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  levelSub: { color: colors.gold, fontSize: 13, fontWeight: '700', marginTop: -2 },
  xpText: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: spacing(1.75) },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.15)' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.muted, fontSize: 12 },
  scoreCard: { ...CARD, padding: spacing(2) },
  scoreHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: 'rgba(232,197,71,0.1)',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: 14,
  },
  scoreNum: { color: colors.gold, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  scorePct: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  scoreLabel: { color: colors.text, fontWeight: '800', fontSize: 16 },
  next: { color: colors.muted, fontSize: 13 },
  lockedNote: { color: colors.muted, textAlign: 'center', paddingVertical: spacing(1) },
  group: { ...CARD, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), paddingVertical: spacing(1.75), paddingHorizontal: spacing(2) },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  rowBody: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chev: { color: 'rgba(183,201,190,0.6)', fontSize: 26 },
  removeAds: {
    alignSelf: 'center',
    marginTop: spacing(1),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.5)',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2.5),
  },
  removeAdsText: { color: colors.gold, fontWeight: '800' },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: spacing(1) },
});
