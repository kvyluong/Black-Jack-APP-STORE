// A small single-series chart drawn with plain Views: columns (magnitude from zero)
// or dots (a value on a trimmed scale, like accuracy). One gold series on a dark
// felt plot, hairline gridlines, tap a mark to read its value, and a table view.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { localized } from '../../i18n/lang';
import { usePrefs } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

export interface Datum {
  key: string;
  /** Null leaves a gap (e.g. a day with no decisions). */
  value: number | null;
  /** Short x label, e.g. "Oct 3". */
  label: string;
  /** What tapping the mark (and the table) shows, e.g. "92% (46/50)". */
  readout: string;
  /** Optional symbol under the mark, e.g. ✓ or ✗. */
  badge?: string;
}

const T = localized({
  en: { showTable: 'Show as table', hideTable: 'Hide table' },
  es: { showTable: 'Ver como tabla', hideTable: 'Ocultar tabla' },
});

const H = 140;

/** The smallest 1/2/5 × 10^k at or above v. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

export function Chart({
  data,
  kind,
  min = 0,
  max,
  ticks,
  formatTick,
  summary,
  reference,
}: {
  data: Datum[];
  kind: 'column' | 'dot';
  min?: number;
  max: number;
  ticks: number[];
  formatTick: (v: number) => string;
  /** Screen-reader summary of the whole chart. */
  summary: string;
  /** A labeled goal line, e.g. the 30-second target. */
  reference?: { value: number; label: string };
}) {
  usePrefs(); // re-render on language change
  const lastIndex = data.map((d) => d.value !== null).lastIndexOf(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const sel = picked ?? (lastIndex >= 0 ? lastIndex : null);
  const y = (v: number) => (Math.max(min, Math.min(max, v)) - min) / (max - min || 1) * H;
  const hasBadges = data.some((d) => d.badge);
  const current = sel !== null ? data[sel] : undefined;

  return (
    <View style={{ gap: spacing(1) }}>
      <Text style={styles.readout} accessibilityLiveRegion="polite">
        {current ? `${current.label} · ${current.readout}` : ' '}
      </Text>
      <View style={styles.frame} accessible accessibilityRole="image" accessibilityLabel={summary}>
        <View style={styles.axis}>
          {ticks.map((t) => (
            <Text key={t} style={[styles.tick, { bottom: y(t) - 7 }]}>
              {formatTick(t)}
            </Text>
          ))}
        </View>
        <View style={styles.plot}>
          {ticks.map((t) => (
            <View key={t} style={[styles.grid, { bottom: y(t) }]} />
          ))}
          {reference && (
            <>
              <View style={[styles.ref, { bottom: y(reference.value) }]} />
              <Text style={[styles.refLabel, { bottom: y(reference.value) + 2 }]}>{reference.label}</Text>
            </>
          )}
          <View style={styles.slots}>
            {data.map((d, i) => (
              <Pressable
                key={d.key}
                style={[styles.slot, i === sel && styles.slotOn]}
                onPress={() => d.value !== null && setPicked(i)}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                {d.value !== null &&
                  (kind === 'column' ? (
                    <View style={[styles.column, { height: Math.max(d.value > 0 ? 3 : 0, y(d.value)) }, i === sel && styles.markOn]} />
                  ) : (
                    <View style={[styles.dot, { bottom: y(d.value) - 6 }, i === sel && styles.markOn]} />
                  ))}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      {hasBadges && (
        <View style={styles.badges} importantForAccessibility="no-hide-descendants">
          {data.map((d) => (
            <Text key={d.key} style={styles.badge}>
              {d.badge ?? ''}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.xLabels} importantForAccessibility="no-hide-descendants">
        <Text style={styles.xLabel}>{data[0]?.label}</Text>
        <Text style={styles.xLabel}>{data[data.length - 1]?.label}</Text>
      </View>
      <Text style={styles.toggle} accessibilityRole="button" onPress={() => setTable((t) => !t)}>
        {table ? T.hideTable : T.showTable}
      </Text>
      {table && (
        <View style={styles.table}>
          {data
            .filter((d) => d.value !== null)
            .map((d) => (
              <View key={d.key} style={styles.tableRow} accessible>
                <Text style={styles.tableDay}>{d.label}</Text>
                <Text style={styles.tableValue}>
                  {d.readout}
                  {d.badge ? ` ${d.badge}` : ''}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const AXIS_W = 40;

const styles = StyleSheet.create({
  readout: { color: colors.text, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
  frame: { flexDirection: 'row', height: H + 8, paddingTop: 8 },
  axis: { width: AXIS_W, height: H },
  tick: { position: 'absolute', right: 6, color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  plot: { flex: 1, height: H, backgroundColor: colors.feltDark, borderRadius: radius.sm },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(244,241,232,0.18)' },
  ref: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(244,241,232,0.55)' },
  refLabel: { position: 'absolute', right: 4, color: colors.text, fontSize: 11, fontWeight: '700' },
  slots: { ...StyleSheet.absoluteFill, flexDirection: 'row', paddingHorizontal: 2 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  slotOn: { backgroundColor: 'rgba(244,241,232,0.07)' },
  column: { width: '64%', maxWidth: 24, backgroundColor: colors.gold, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.feltDark,
  },
  markOn: { backgroundColor: colors.text },
  badges: { flexDirection: 'row', marginLeft: AXIS_W, paddingHorizontal: 2 },
  badge: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 12, fontWeight: '800' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: AXIS_W, marginTop: -4 },
  xLabel: { color: colors.muted, fontSize: 11 },
  toggle: { color: colors.gold, textDecorationLine: 'underline', fontSize: 13, alignSelf: 'flex-start', paddingVertical: 4 },
  table: { gap: 2 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(244,241,232,0.15)' },
  tableDay: { color: colors.muted, fontSize: 13 },
  tableValue: { color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
