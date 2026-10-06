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
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, spacing } from '../theme';

const T = localized({
  en: {
    notEnough: 'Not enough hands yet',
    notEnoughBody: (n: number) =>
      `Every decision you make at the table and in the strategy drill is tracked here. After ${n} decisions of a kind (stiff hands, soft hands, pairs and so on), you’ll see how often you get it right and which spots trip you up.`,
    playFew: 'Play a few hands',
    strategyDrill: 'Strategy drill',
    biggest: 'BIGGEST LEAK',
    drillWeakest: 'Drill my weakest spot',
    noLeaks: 'No leaks found 🎯',
    noLeaksBody: 'Every category you’ve played is at 100%. Keep it up.',
    byType: 'By decision type',
    rowA11y: (title: string, p: number, right: number, total: number) => `${title}: ${p} percent correct, ${right} of ${total}`,
    drillThis: 'Drill this',
    stillLearning: 'Still learning about you:',
    spots: 'Spots you miss most',
    spotA11y: (label: string, missed: number, total: number, best: string) => `${label}. Missed ${missed} of ${total}. ${best}`,
    footer: 'Graded against basic strategy for your table rules. Insurance is graded at the table only.',
  },
  es: {
    notEnough: 'Aún no hay suficientes manos',
    notEnoughBody: (n: number) =>
      `Aquí se registra cada decisión que tomas en la mesa y en el ejercicio de estrategia. Tras ${n} decisiones de un tipo (manos rígidas, manos blandas, parejas, etc.), verás qué tan seguido aciertas y qué jugadas te cuestan.`,
    playFew: 'Juega unas manos',
    strategyDrill: 'Ejercicio de estrategia',
    biggest: 'TU MAYOR FUGA',
    drillWeakest: 'Practicar mi punto débil',
    noLeaks: 'Sin fugas 🎯',
    noLeaksBody: 'Cada categoría que has jugado está al 100%. Sigue así.',
    byType: 'Por tipo de decisión',
    rowA11y: (title: string, p: number, right: number, total: number) => `${title}: ${p} por ciento de aciertos, ${right} de ${total}`,
    drillThis: 'Practicar esto',
    stillLearning: 'Todavía te estamos conociendo:',
    spots: 'Las jugadas que más fallas',
    spotA11y: (label: string, missed: number, total: number, best: string) => `${label}. Fallaste ${missed} de ${total}. ${best}`,
    footer: 'Calificado con la estrategia básica para las reglas de tu mesa. El seguro solo se califica en la mesa.',
  },
});

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
          <Text style={styles.title}>{T.notEnough}</Text>
          <P>{T.notEnoughBody(MIN_SAMPLE)}</P>
        </Panel>
        <Button title={T.playFew} onPress={() => router.push('/tables')} />
        <Button title={T.strategyDrill} variant="secondary" onPress={() => router.push('/drills/strategy')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {weakest ? (
        <Panel style={styles.focus}>
          <Text style={styles.label}>{T.biggest}</Text>
          <Text style={styles.title}>{CATEGORY_INFO[weakest].title}</Text>
          <P muted>{CATEGORY_INFO[weakest].example}</P>
          <Button title={T.drillWeakest} onPress={() => drill(weakest)} />
        </Panel>
      ) : (
        <Panel style={styles.focus}>
          <Text style={styles.title}>{T.noLeaks}</Text>
          <P muted>{T.noLeaksBody}</P>
        </Panel>
      )}

      <H2>{T.byType}</H2>
      <Panel>
        {ranked.map(({ category, tally }) => {
          const p = pct(tally);
          const color = p >= 90 ? good : p >= 75 ? colors.warn : bad;
          return (
            <View
              key={category}
              style={styles.row}
              accessible
              accessibilityLabel={T.rowA11y(CATEGORY_INFO[category].title, p, tally.right, tally.total)}
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
                  {T.drillThis}
                </Text>
              )}
            </View>
          );
        })}
        {pending.length > 0 && (
          <P muted style={{ fontSize: 13 }}>
            {T.stillLearning} {pending.map(([c, t]) => `${CATEGORY_INFO[c].title} (${t.total}/${MIN_SAMPLE})`).join(', ')}.
          </P>
        )}
      </Panel>

      {missed.length > 0 && (
        <>
          <H2>{T.spots}</H2>
          <Panel>
            {missed.map((s) => (
              <View key={s.label} style={styles.spot} accessible accessibilityLabel={T.spotA11y(s.label, s.total - s.right, s.total, describeBest(s))}>
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
        {T.footer}
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
