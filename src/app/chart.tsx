import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { P, Screen, Segmented } from '../components/ui';
import { Cell, hardCell, pairCell, softCell } from '../engine/strategy';
import { useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const upLabel = (u: number) => (u === 11 ? 'A' : String(u));

const CELL_STYLE: Record<string, { bg: string; label: string }> = {
  H: { bg: '#D9D9D9', label: 'H' },
  S: { bg: '#F2C94C', label: 'S' },
  D: { bg: '#6FCF97', label: 'D' },
  Ds: { bg: '#6FCF97', label: 'Ds' },
  P: { bg: '#56CCF2', label: 'P' },
  Rh: { bg: '#EB8B8B', label: 'Rh' },
  Rs: { bg: '#EB8B8B', label: 'Rs' },
  Rp: { bg: '#EB8B8B', label: 'Rp' },
};

type Tab = 'hard' | 'soft' | 'pairs';

export default function Chart() {
  const { settings } = useSettings();
  const rules = settings.rules;
  const [tab, setTab] = useState<Tab>('hard');

  let rows: { label: string; cells: Cell[] }[];
  if (tab === 'hard') {
    rows = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((t) => ({
      label: t === 8 ? '≤8' : t === 17 ? '17+' : String(t),
      cells: UPS.map((u) => hardCell(t, u, rules)),
    }));
  } else if (tab === 'soft') {
    rows = [13, 14, 15, 16, 17, 18, 19, 20].map((t) => ({
      label: `A,${t - 11}`,
      cells: UPS.map((u) => softCell(t, u, rules)),
    }));
  } else {
    rows = [1, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((p) => {
      const name = p === 1 ? 'A' : String(p);
      return {
        label: `${name},${name}`,
        cells: UPS.map((u) => pairCell(p, u, rules) ?? (p === 1 ? 'P' : p === 10 ? 'S' : hardCell(p * 2, u, rules))),
      };
    });
  }

  return (
    <Screen>
      <P muted>
        {rules.decks} deck{rules.decks > 1 ? 's' : ''}, dealer {rules.dealerHitsSoft17 ? 'hits' : 'stands on'} soft 17,{' '}
        {rules.doubleAfterSplit ? 'double after split' : 'no double after split'}
        {rules.lateSurrender ? ', late surrender' : ''}. Change rules in Settings.
      </P>
      <Segmented
        options={[
          { label: 'Hard', value: 'hard' as Tab },
          { label: 'Soft', value: 'soft' as Tab },
          { label: 'Pairs', value: 'pairs' as Tab },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View>
        <View style={styles.row}>
          <Text style={[styles.head, styles.rowLabel]}>You</Text>
          {UPS.map((u) => (
            <Text key={u} style={[styles.head, styles.cell]}>
              {upLabel(u)}
            </Text>
          ))}
        </View>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <Text style={[styles.head, styles.rowLabel]}>{r.label}</Text>
            {r.cells.map((c, i) => (
              <View key={i} style={[styles.cell, styles.cellBox, { backgroundColor: CELL_STYLE[c].bg }]}>
                <Text style={styles.cellText}>{CELL_STYLE[c].label}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {[
          ['H', 'Hit'],
          ['S', 'Stand'],
          ['D', 'Double, otherwise hit'],
          ['Ds', 'Double, otherwise stand'],
          ['P', 'Split'],
          ['Rh', 'Surrender, otherwise hit'],
          ['Rs', 'Surrender, otherwise stand'],
          ['Rp', 'Surrender, otherwise split'],
        ]
          .filter(([k]) => rules.lateSurrender || !k.startsWith('R'))
          .map(([k, v]) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: CELL_STYLE[k].bg }]}>
                <Text style={styles.cellText}>{k}</Text>
              </View>
              <Text style={{ color: colors.text }}>{v}</Text>
            </View>
          ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  head: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  rowLabel: { width: 44, fontSize: 13 },
  cell: { flex: 1, marginHorizontal: 1 },
  cellBox: { height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  cellText: { color: colors.black, fontWeight: '700', fontSize: 12 },
  legend: { gap: spacing(0.75), marginTop: spacing(1) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  swatch: { width: 32, height: 22, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
});
