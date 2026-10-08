import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SystemBadge } from '../../components/academy';
import { Button, P, Panel, Screen } from '../../components/ui';
import { KO_PIVOT, KoBetZone, SYSTEM_NAME, initialRunningCount, koKeyCount, koQuestion, signedTag } from '../../engine/counting';
import { trueCountQuestion } from '../../engine/drills';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { useOutcomeColors } from '../../components/useColors';

const T = localized({
  en: {
    formula: (name: string) => `${name} true count = running count ÷ decks remaining.`,
    koIntro: `KO is unbalanced, so there’s no true count to work out. Instead you compare the running count with two fixed numbers: the key count (bet more from here) and the pivot, +${KO_PIVOT} (bet the most from here).`,
    koKeys: (list: string) => `Key counts: ${list}. A real shoe starts at 4 − 4 × decks.`,
    correctOf: (right: number, total: number) => `${right}/${total} correct`,
    allTime: (right: number, total: number) => `All time: ${right}/${total}`,
    running: (n: string) => `Running count ${n}`,
    decksLeft: (d: number) => `${d} deck${d === 1 ? '' : 's'} left`,
    decksGame: (d: number) => `${d}-deck game`,
    question: 'What’s the true count?',
    koQuestion: 'How much do you bet?',
    zone: { min: 'Minimum bet', raise: 'Raise the bet', max: 'Biggest bet' } as Record<KoBetZone, string>,
    correct: '✓ Correct',
    wrong: (n: string) => `✗ It’s ${n}`,
    koExplain: (rc: string, key: string, irc: string, zone: KoBetZone) =>
      `Key count ${key}, pivot +${KO_PIVOT} (this shoe started at ${irc}). ${rc} is ${
        { min: 'below the key count: bet the minimum', raise: 'at or above the key count but below the pivot: raise the bet', max: 'at or above the pivot: bet the most' }[zone]
      }.`,
    next: 'Next',
  },
  es: {
    formula: (name: string) => `Conteo real ${name} = conteo continuo ÷ barajas restantes.`,
    koIntro: `KO no es balanceado, así que no calculas un conteo real. En su lugar comparas el conteo continuo con dos números fijos: el conteo clave (sube la apuesta desde ahí) y el pivote, +${KO_PIVOT} (apuesta lo máximo desde ahí).`,
    koKeys: (list: string) => `Conteos clave: ${list}. Un zapato real empieza en 4 − 4 × barajas.`,
    correctOf: (right: number, total: number) => `${right}/${total} correctas`,
    allTime: (right: number, total: number) => `En total: ${right}/${total}`,
    running: (n: string) => `Conteo continuo ${n}`,
    decksLeft: (d: number) => `${d === 1 ? 'Queda' : 'Quedan'} ${d} baraja${d === 1 ? '' : 's'}`,
    decksGame: (d: number) => `Juego de ${d} baraja${d === 1 ? '' : 's'}`,
    question: '¿Cuál es el conteo real?',
    koQuestion: '¿Cuánto apuestas?',
    zone: { min: 'Apuesta mínima', raise: 'Sube la apuesta', max: 'Apuesta máxima' },
    correct: '✓ Correcto',
    wrong: (n: string) => `✗ Es ${n}`,
    koExplain: (rc: string, key: string, irc: string, zone: KoBetZone) =>
      `Conteo clave ${key}, pivote +${KO_PIVOT} (este zapato empezó en ${irc}). ${rc} está ${
        { min: 'debajo del conteo clave: apuesta lo mínimo', raise: 'en el conteo clave o más, pero debajo del pivote: sube la apuesta', max: 'en el pivote o más: apuesta lo máximo' }[zone]
      }.`,
    next: 'Siguiente',
  },
});

const KO_DECKS = [1, 2, 6, 8];
const ZONES: KoBetZone[] = ['min', 'raise', 'max'];

/** True count drill: divide by decks left (balanced systems), or KO's key-count/pivot bet quiz. */
export default function TrueCountDrill() {
  const { settings, stats, updateStats } = useSettings();
  const system = settings.countingSystem;
  const tally = stats.trueCountDrill;
  const [score, setScore] = useState({ right: 0, total: 0 });

  const record = (ok: boolean) => {
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    updateStats((s) => ({ ...s, trueCountDrill: { right: s.trueCountDrill.right + (ok ? 1 : 0), total: s.trueCountDrill.total + 1 } }));
  };

  return (
    <Screen>
      <SystemBadge />
      <View style={styles.row}>
        <Text style={styles.score}>{T.correctOf(score.right, score.total)}</Text>
        <Text style={styles.allTime}>{T.allTime(tally.right, tally.total)}</Text>
      </View>
      {system === 'ko' ? (
        <KoDrill onAnswer={record} />
      ) : (
        <BalancedDrill key={system} name={SYSTEM_NAME[system]} maxDecks={Math.max(2, settings.rules.decks)} onAnswer={record} />
      )}
    </Screen>
  );
}

/** Running count ÷ decks remaining (Hi-Lo, Hi-Opt I, Omega II). */
function BalancedDrill({ name, maxDecks, onAnswer }: { name: string; maxDecks: number; onAnswer: (ok: boolean) => void }) {
  const { good, bad } = useOutcomeColors();
  const [q, setQ] = useState(() => trueCountQuestion(maxDecks));
  const [picked, setPicked] = useState<number | null>(null);
  const ok = picked === q.answer;

  const choose = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    onAnswer(n === q.answer);
  };

  return (
    <>
      <P muted>{T.formula(name)}</P>
      <Panel style={{ alignItems: 'center' }}>
        <Text style={styles.big}>{T.running(signedTag(q.running))}</Text>
        <Text style={styles.big}>{T.decksLeft(q.decks)}</Text>
        <Text style={styles.muted}>{T.question}</Text>
      </Panel>
      <View style={styles.options}>
        {q.options.map((n) => (
          <Button
            key={n}
            title={signedTag(n)}
            variant={picked !== null && n === q.answer ? 'primary' : picked === n ? 'danger' : 'secondary'}
            onPress={() => choose(n)}
            style={styles.option}
          />
        ))}
      </View>
      {picked !== null && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
          <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 17 }}>{ok ? T.correct : T.wrong(signedTag(q.answer))}</Text>
          <Text style={styles.explain}>
            {signedTag(q.running)} ÷ {q.decks} = {signedTag(q.answer)}
          </Text>
          <Button
            title={T.next}
            onPress={() => {
              setPicked(null);
              setQ(trueCountQuestion(maxDecks));
            }}
          />
        </Panel>
      )}
    </>
  );
}

/** KO: no true count. Is the running count below the key count, between it and the pivot, or at the pivot? */
function KoDrill({ onAnswer }: { onAnswer: (ok: boolean) => void }) {
  const { good, bad } = useOutcomeColors();
  const [q, setQ] = useState(() => koQuestion(KO_DECKS));
  const [picked, setPicked] = useState<KoBetZone | null>(null);
  const ok = picked === q.answer;
  const keys = KO_DECKS.map((d) => `${d}D ${signedTag(koKeyCount(d))}`).join(' · ');

  const choose = (z: KoBetZone) => {
    if (picked !== null) return;
    setPicked(z);
    onAnswer(z === q.answer);
  };

  return (
    <>
      <P muted>{T.koIntro}</P>
      <P muted>{T.koKeys(keys)}</P>
      <Panel style={{ alignItems: 'center' }}>
        <Text style={styles.big}>{T.running(signedTag(q.running))}</Text>
        <Text style={styles.big}>{T.decksGame(q.decks)}</Text>
        <Text style={styles.muted}>{T.koQuestion}</Text>
      </Panel>
      <View style={styles.options}>
        {ZONES.map((z) => (
          <Button
            key={z}
            title={T.zone[z]}
            variant={picked !== null && z === q.answer ? 'primary' : picked === z ? 'danger' : 'secondary'}
            onPress={() => choose(z)}
            style={styles.zoneOption}
          />
        ))}
      </View>
      {picked !== null && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
          <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 17 }}>{ok ? T.correct : T.wrong(T.zone[q.answer])}</Text>
          <Text style={styles.explain}>
            {T.koExplain(signedTag(q.running), signedTag(koKeyCount(q.decks)), signedTag(initialRunningCount(q.decks, 'ko')), q.answer)}
          </Text>
          <Button
            title={T.next}
            onPress={() => {
              setPicked(null);
              setQ(koQuestion(KO_DECKS));
            }}
          />
        </Panel>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing(1) },
  score: { color: colors.gold, fontWeight: '700' },
  allTime: { color: colors.muted, fontWeight: '600' },
  big: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  muted: { color: colors.muted, marginTop: spacing(1) },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  option: { minWidth: 72, flexGrow: 1 },
  zoneOption: { minWidth: 140, flexGrow: 1 },
  explain: { color: colors.text, fontSize: 16 },
});
