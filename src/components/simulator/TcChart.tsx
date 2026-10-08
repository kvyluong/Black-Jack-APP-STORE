// Bar chart of how often each true count comes up at bet time, marked where you have the edge.
import { StyleSheet, Text, View } from 'react-native';

import { useOutcomeColors } from '../useColors';
import { MAX_TC, MIN_TC, TcBucket, edgeAt } from '../../engine/simulator';
import { localized } from '../../i18n/lang';
import { colors, spacing } from '../../theme';

const T = localized({
  en: {
    a11y: (rows: string) => `True count frequency at bet time. ${rows}`,
    row: (tc: string, pct: string) => `${tc}: ${pct}`,
    legendGood: '▲ you have the edge',
    legendBad: '▼ the casino has the edge',
    legendOut: '○ sitting out',
    axis: 'True count when you bet',
  },
  es: {
    a11y: (rows: string) => `Frecuencia del conteo real al apostar. ${rows}`,
    row: (tc: string, pct: string) => `${tc}: ${pct}`,
    legendGood: '▲ tú tienes la ventaja',
    legendBad: '▼ el casino tiene la ventaja',
    legendOut: '○ fuera de juego',
    axis: 'Conteo real al apostar',
  },
});

const tcLabel = (tc: number) => (tc <= MIN_TC ? `≤${tc}` : tc >= MAX_TC ? `${tc}+` : tc > 0 ? `+${tc}` : String(tc)).replace('-', '−');

/** `houseEdge` in percent; `sitsOut` says which counts you don't bet. */
export function TcChart({
  buckets,
  houseEdge,
  countPlays,
  sitsOut,
}: {
  buckets: TcBucket[];
  houseEdge: number;
  countPlays: boolean;
  sitsOut: (tc: number) => boolean }) {
  const { good, bad } = useOutcomeColors();
  const max = Math.max(...buckets.map((b) => b.freq), 0.0001);
  const pct = (f: number) => `${(f * 100).toFixed(1)}%`;
  const label = T.a11y(buckets.map((b) => T.row(tcLabel(b.tc), pct(b.freq))).join(', '));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={styles.chart}>
        {buckets.map((b) => {
          const out = sitsOut(b.tc);
          const plus = edgeAt(houseEdge, b.meanTc, countPlays) > 0;
          const color = out ? 'transparent' : plus ? good : bad;
          return (
            <View key={b.tc} style={styles.col}>
              <Text style={[styles.mark, { color: out ? colors.muted : color }]}>{out ? '○' : plus ? '▲' : '▼'}</Text>
              <View style={styles.barArea}>
                <View
                  style={[
                    styles.bar,
                    { height: `${Math.max(1, (b.freq / max) * 100)}%`, backgroundColor: color },
                    out && { borderWidth: 1, borderColor: colors.muted },
                  ]}
                />
              </View>
              <Text style={styles.tick} numberOfLines={1} adjustsFontSizeToFit>
                {tcLabel(b.tc)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.axis}>{T.axis}</Text>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: good }]}>{T.legendGood}</Text>
        <Text style={[styles.legendText, { color: bad }]}>{T.legendBad}</Text>
        {buckets.some((b) => sitsOut(b.tc)) && <Text style={styles.legendText}>{T.legendOut}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 2 },
  col: { flex: 1, alignItems: 'center', height: '100%' },
  mark: { fontSize: 9, height: 12 },
  barArea: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  tick: { color: colors.muted, fontSize: 10, marginTop: 2 },
  axis: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing(0.5) },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5), justifyContent: 'center', marginTop: spacing(0.5) },
  legendText: { color: colors.muted, fontSize: 12 },
});
