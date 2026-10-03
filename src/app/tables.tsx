import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LevelBar } from '../components/chips';
import { P, Panel, Screen } from '../components/ui';
import { TABLES, canSit, formatChips, isUnlocked } from '../engine/progression';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

/** The casino floor: pick a table. Higher-stakes rooms unlock as your chips grow. */
export default function Tables() {
  const { settings, stats, updateSettings } = useSettings();
  const chips = settings.bankroll;
  const peak = stats.peakChips;

  return (
    <Screen>
      <Panel>
        <View style={styles.header}>
          <Text style={styles.chips}>${formatChips(chips)}</Text>
          <Text style={styles.chipsLabel}>chips</Text>
        </View>
        <LevelBar xp={stats.xp} />
        <Text style={styles.small}>
          Best ever: ${formatChips(peak)} · Biggest win: ${formatChips(stats.biggestWin)}
        </Text>
      </Panel>

      <P muted>Grow your chips to unlock bigger tables. Chips are play money and can't be bought.</P>

      {TABLES.map((t) => {
        const unlocked = isUnlocked(t, peak);
        const sit = canSit(t, chips, peak);
        const here = settings.tableId === t.id;
        const progress = Math.min(1, peak / t.unlockAt);
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: !sit }}
            disabled={!sit}
            onPress={() => {
              updateSettings({ tableId: t.id });
              router.push('/play');
            }}
            style={({ pressed }) => [styles.table, { backgroundColor: t.felt }, !unlocked && styles.locked, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>
                {unlocked ? '' : '🔒 '}
                {t.name}
                {here ? '  · your table' : ''}
              </Text>
              <Text style={styles.limits}>
                ${formatChips(t.minBet)} – ${formatChips(t.maxBet)}
              </Text>
              <Text style={styles.blurb}>{t.blurb}</Text>
              {!unlocked && (
                <View style={{ gap: 3, marginTop: 4 }}>
                  <Text style={styles.need}>Reach ${formatChips(t.unlockAt)} chips to unlock</Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${progress * 100}%` }]} />
                  </View>
                </View>
              )}
              {unlocked && !sit && <Text style={styles.need}>You need ${formatChips(t.minBet)} to sit here</Text>}
            </View>
            {sit && <Text style={styles.chev}>›</Text>}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  chips: { color: colors.gold, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  chipsLabel: { color: colors.muted, fontSize: 16 },
  small: { color: colors.muted, fontSize: 12 },
  table: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(232,197,71,0.35)',
  },
  locked: { opacity: 0.6, borderColor: 'transparent' },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  limits: { color: colors.gold, fontWeight: '800' },
  blurb: { color: colors.muted, fontSize: 13 },
  need: { color: colors.text, fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.4)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold },
  chev: { color: colors.text, fontSize: 28 },
});
