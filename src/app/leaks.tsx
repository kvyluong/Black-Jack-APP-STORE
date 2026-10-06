// "Your leaks": which kinds of decisions you miss, the exact spots, and a drill aimed at them.
import { Href, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, H2, P, Panel, Screen } from '../components/ui';
import { useOutcomeColors } from '../components/useColors';
import {
  CATEGORY_INFO,
  DRILLABLE,
  LeakCategory,
  MIN_SAMPLE,
  Tally,
  accuracy,
  describeBest,
  rankedCategories,
  topMissedSpots,
  weakestDrillable,
} from '../engine/leaks';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const drill = (c: LeakCategory) => router.push(`/drills/strategy?focus=${c}` as Href);

export default function Leaks() {
  const { stats } = useSettings();
  const { good, bad } = useOutcomeColors();
  const ranked = rankedCategories(stats.leaks);
  const weakest = weakestDrillable(stats.leaks);
  const missed = topMissedSpots(stats.leaks);
  // Categories still collecting data, so players know why they aren't ranked yet.
  const pending = (Object.entries(stats.leaks.byCategory) as [LeakCategory, Tally][]).filter(([, t]) => t.total < MIN_SAMPLE);
  const pct = (t: Tally) => Math.round(accuracy(t) * 100);

  if (ranked.length === 0) {
    return (
      <Screen>
        <Panel>
          <Text style={styles.title}>Not enough hands yet</Text>
          <P>
            Every decision you make at the table and in the strategy drill is tracked here. After {MIN_SAMPLE} decisions of a kind (stiff
            hands, soft hands, pairs and so on), you’ll see how often you get it right and which spots trip you up.
          </P>
        </Panel>
        <Button title="Play a few hands" onPress={() => router.push('/tables')} />
        <Button title="Strategy drill" variant="secondary" onPress={() => router.push('/drills/strategy')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {weakest ? (
        <Panel style={styles.focus}>
          <Text style={styles.label}>BIGGEST LEAK</Text>
          <Text style={styles.title}>{CATEGORY_INFO[weakest].title}</Text>
          <P muted>{CATEGORY_INFO[weakest].example}</P>
          <Button title="Drill my weakest spot" onPress={() => drill(weakest)} />
        </Panel>
      ) : (
        <Panel style={styles.focus}>
          <Text style={styles.title}>No leaks found 🎯</Text>
          <P muted>Every category you’ve played is at 100%. Keep it up.</P>
        </Panel>
      )}

      <H2>By decision type</H2>
      <Panel>
        {ranked.map(({ category, tally }) => {
          const p = pct(tally);
          const color = p >= 90 ? good : p >= 75 ? colors.warn : bad;
          return (
            <View
              key={category}
              style={styles.row}
              accessible
              accessibilityLabel={`${CATEGORY_INFO[category].title}: ${p} percent correct, ${tally.right} of ${tally.total}`}
            >
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle}>{CATEGORY_INFO[category].title}</Text>
                <Text style={[styles.pct, { color }]}>
                  {p}% <Text style={styles.count}>({tally.right}/{tally.total})</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${p}%`, backgroundColor: color }]} />
              </View>
              {DRILLABLE.includes(category) && p < 100 && (
                <Text style={styles.link} onPress={() => drill(category)} accessibilityRole="button">
                  Drill this
                </Text>
              )}
            </View>
          );
        })}
        {pending.length > 0 && (
          <P muted style={{ fontSize: 13 }}>
            Still learning about you: {pending.map(([c, t]) => `${CATEGORY_INFO[c].title} (${t.total}/${MIN_SAMPLE})`).join(', ')}.
          </P>
        )}
      </Panel>

      {missed.length > 0 && (
        <>
          <H2>Spots you miss most</H2>
          <Panel>
            {missed.map((s) => (
              <View key={s.label} style={styles.spot} accessible accessibilityLabel={`${s.label}. Missed ${s.total - s.right} of ${s.total}. ${describeBest(s)}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.label}</Text>
                  <Text style={styles.best}>{describeBest(s)}</Text>
                </View>
                <Text style={[styles.missed, { color: bad }]}>
                  ✗ {s.total - s.right}/{s.total}
                </Text>
              </View>
            ))}
          </Panel>
        </>
      )}
      <P muted style={{ fontSize: 13 }}>
        Graded against basic strategy for your table rules. Insurance is graded at the table only.
      </P>
    </Screen>
  );
}

const styles = StyleSheet.create({
  focus: { borderWidth: 2, borderColor: colors.gold },
  label: { color: colors.gold, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  row: { gap: 4, paddingVertical: 4 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing(1) },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  pct: { fontWeight: '900', fontSize: 16 },
  count: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  track: { height: 8, backgroundColor: colors.feltDark, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.sm },
  link: { color: colors.gold, textDecorationLine: 'underline', fontSize: 14, alignSelf: 'flex-start', paddingVertical: 2 },
  spot: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingVertical: 4 },
  best: { color: colors.muted, fontSize: 14 },
  missed: { fontWeight: '900', fontSize: 16 },
});
