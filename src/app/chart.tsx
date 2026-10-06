import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { P, Screen, Segmented } from '../components/ui';
import { Cell, hardCell, pairCell, softCell } from '../engine/strategy';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const upLabel = (u: number) => (u === 11 ? 'A' : String(u));

const CELL_BG: Record<Cell, string> = {
  H: '#D9D9D9',
  S: '#F2C94C',
  D: '#6FCF97',
  Ds: '#6FCF97',
  P: '#56CCF2',
  Rh: '#EB8B8B',
  Rs: '#EB8B8B',
  Rp: '#EB8B8B',
};

const CELLS: Cell[] = ['H', 'S', 'D', 'Ds', 'P', 'Rh', 'Rs', 'Rp'];

/** Short code shown in each chart cell, and its legend text. */
const CELL_TEXT = localized<Record<Cell, { code: string; meaning: string }>>({
  en: {
    H: { code: 'H', meaning: 'Hit' },
    S: { code: 'S', meaning: 'Stand' },
    D: { code: 'D', meaning: 'Double, otherwise hit' },
    Ds: { code: 'Ds', meaning: 'Double, otherwise stand' },
    P: { code: 'P', meaning: 'Split' },
    Rh: { code: 'Rh', meaning: 'Surrender, otherwise hit' },
    Rs: { code: 'Rs', meaning: 'Surrender, otherwise stand' },
    Rp: { code: 'Rp', meaning: 'Surrender, otherwise split' },
  },
  es: {
    H: { code: 'P', meaning: 'Pedir' },
    S: { code: 'Pl', meaning: 'Plantarse' },
    D: { code: 'D', meaning: 'Doblar; si no se puede, pedir' },
    Ds: { code: 'Dpl', meaning: 'Doblar; si no se puede, plantarse' },
    P: { code: 'Di', meaning: 'Dividir' },
    Rh: { code: 'Rp', meaning: 'Rendirse; si no se puede, pedir' },
    Rs: { code: 'Rpl', meaning: 'Rendirse; si no se puede, plantarse' },
    Rp: { code: 'Rdi', meaning: 'Rendirse; si no se puede, dividir' },
  },
});

const T = localized({
  en: {
    rules: (decks: number, h17: boolean, das: boolean, surrender: boolean) =>
      `${decks} deck${decks > 1 ? 's' : ''}, dealer ${h17 ? 'hits' : 'stands on'} soft 17, ${das ? 'double after split' : 'no double after split'}${surrender ? ', late surrender' : ''}. Change rules in Settings.`,
    hard: 'Hard',
    soft: 'Soft',
    pairs: 'Pairs',
    you: 'You',
  },
  es: {
    rules: (decks: number, h17: boolean, das: boolean, surrender: boolean) =>
      `${decks} baraja${decks > 1 ? 's' : ''}, el crupier ${h17 ? 'pide' : 'se planta'} con 17 blando, ${das ? 'se puede doblar tras dividir' : 'no se puede doblar tras dividir'}${surrender ? ', rendición tardía' : ''}. Cambia las reglas en Ajustes.`,
    hard: 'Duras',
    soft: 'Blandas',
    pairs: 'Parejas',
    you: 'Tú',
  },
});

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
      <P muted>{T.rules(rules.decks, rules.dealerHitsSoft17, rules.doubleAfterSplit, rules.lateSurrender)}</P>
      <Segmented
        options={[
          { label: T.hard, value: 'hard' as Tab },
          { label: T.soft, value: 'soft' as Tab },
          { label: T.pairs, value: 'pairs' as Tab },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View>
        <View style={styles.row}>
          <Text style={[styles.head, styles.rowLabel]}>{T.you}</Text>
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
              <View
                key={i}
                style={[styles.cell, styles.cellBox, { backgroundColor: CELL_BG[c] }]}
                accessible
                accessibilityLabel={`${r.label}, ${upLabel(UPS[i])}: ${CELL_TEXT[c].meaning}`}
              >
                <Text style={styles.cellText} numberOfLines={1} adjustsFontSizeToFit>
                  {CELL_TEXT[c].code}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {CELLS.filter((k) => rules.lateSurrender || !k.startsWith('R')).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: CELL_BG[k] }]}>
              <Text style={styles.cellText}>{CELL_TEXT[k].code}</Text>
            </View>
            <Text style={{ color: colors.text, flex: 1 }}>{CELL_TEXT[k].meaning}</Text>
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
