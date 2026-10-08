// Deck Estimation drill: read the discard tray and say how many decks are left.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { playSound } from '../../audio/sounds';
import { DiscardTray } from '../../components/table/DiscardTray';
import { Button, P, Panel, Screen } from '../../components/ui';
import { useOutcomeColors } from '../../components/useColors';
import {
  DECKS_ROUND,
  DeckQuestion,
  averageError,
  deckAnswerText,
  deckQuestion,
  deckTip,
  formatDecks,
  recordDeckEstimate,
  scoreDeckGuess,
} from '../../engine/decks';
import { emptyDeckEstimates } from '../../engine/records';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';

const T = localized({
  en: {
    intro: 'The true count divides by the decks left in the shoe. Dealers stack played cards in the discard tray, so read the tray and subtract.',
    progress: (n: number, total: number, right: number) => `Question ${n}/${total} · ${right} right`,
    shoe: (decks: number) => `${decks}-deck shoe`,
    question: 'How many decks are left in the shoe?',
    choiceA11y: (d: string) => `${d} decks left`,
    right: '✓ Close enough',
    exact: '✓ Spot on',
    wrong: (err: string) => `✗ Off by ${err} deck${err === '1' ? '' : 's'}`,
    tip: (t: string) => `Tip: ${t}`,
    next: 'Next tray',
    finish: 'See your score',
    done: (right: number, total: number) => `${right}/${total} within half a deck`,
    verdict: (right: number, total: number): string =>
      right === total ? 'Perfect round. You read trays like a pro. 🎯' : right >= total * 0.8 ? 'Casino-ready.' : 'Keep practicing: aim for 8/10.',
    allTime: (right: number, total: number) => `All time: ${right}/${total} right`,
    avgError: (err: string) => `Average error (last 20): ${err} deck${err === '1' ? '' : 's'}`,
    again: 'Another round',
  },
  es: {
    intro: 'El conteo real se divide entre las barajas que quedan en el zapato. El crupier apila las cartas jugadas en la bandeja de descartes: mírala y resta.',
    progress: (n: number, total: number, right: number) => `Pregunta ${n}/${total} · ${right} correctas`,
    shoe: (decks: number) => `Zapato de ${decks} barajas`,
    question: '¿Cuántas barajas quedan en el zapato?',
    choiceA11y: (d: string) => `Quedan ${d} barajas`,
    right: '✓ Suficientemente cerca',
    exact: '✓ Exacto',
    wrong: (err: string) => `✗ Te equivocaste por ${err} baraja${err === '1' ? '' : 's'}`,
    tip: (t: string) => `Consejo: ${t}`,
    next: 'Siguiente bandeja',
    finish: 'Ver tu puntaje',
    done: (right: number, total: number) => `${right}/${total} con un margen de media baraja`,
    verdict: (right: number, total: number) =>
      right === total
        ? 'Ronda perfecta. Lees bandejas como un profesional. 🎯'
        : right >= total * 0.8
          ? 'Listo para el casino.'
          : 'Sigue practicando: apunta a 8/10.',
    allTime: (right: number, total: number) => `En total: ${right}/${total} correctas`,
    avgError: (err: string) => `Error promedio (últimas 20): ${err} baraja${err === '1' ? '' : 's'}`,
    again: 'Otra ronda',
  },
});

interface Answer {
  guess: number;
  error: number;
  right: boolean;
  tip: string;
}

export default function DecksDrill() {
  const { settings, stats, updateStats } = useSettings();
  const { good, bad } = useOutcomeColors();
  const [q, setQ] = useState<DeckQuestion>(() => deckQuestion());
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [round, setRound] = useState({ asked: 1, right: 0, finished: false });

  const choose = (guess: number) => {
    if (answer) return;
    const { error, right } = scoreDeckGuess(guess, q.exact);
    setAnswer({ guess, error, right, tip: deckTip() });
    setRound((r) => ({ ...r, right: r.right + (right ? 1 : 0) }));
    if (settings.soundEffects) playSound(right ? 'correct' : 'wrong');
    updateStats((s) => ({ ...s, deckEstimates: recordDeckEstimate(s.deckEstimates ?? emptyDeckEstimates(), error, right) }));
  };

  const next = () => {
    if (round.asked >= DECKS_ROUND) {
      setRound((r) => ({ ...r, finished: true }));
      return;
    }
    setAnswer(null);
    setQ(deckQuestion());
    setRound((r) => ({ ...r, asked: r.asked + 1 }));
  };

  const again = () => {
    setAnswer(null);
    setQ(deckQuestion());
    setRound({ asked: 1, right: 0, finished: false });
  };

  const rec = stats.deckEstimates ?? emptyDeckEstimates();
  const avg = averageError(rec.recentErrors);

  if (round.finished) {
    return (
      <Screen>
        <Panel style={{ alignItems: 'center' }}>
          <Text style={styles.big}>{T.done(round.right, DECKS_ROUND)}</Text>
          <P>{T.verdict(round.right, DECKS_ROUND)}</P>
        </Panel>
        <P muted>{T.allTime(rec.right, rec.total)}</P>
        {avg !== null && <P muted>{T.avgError(formatDecks(avg))}</P>}
        <Button title={T.again} onPress={again} />
      </Screen>
    );
  }

  const color = answer ? (answer.right ? good : bad) : colors.text;
  return (
    <Screen>
      <P muted>{T.intro}</P>
      <Text style={styles.progress}>{T.progress(round.asked, DECKS_ROUND, round.right)}</Text>
      <Panel style={{ alignItems: 'center' }}>
        <Text style={styles.shoe}>{T.shoe(q.decks)}</Text>
        <DiscardTray cards={q.played} decks={q.decks} deckPx={q.decks === 8 ? 22 : 26} reference />
      </Panel>
      <Text style={styles.question}>{T.question}</Text>
      <View style={styles.choices}>
        {q.choices.map((c) => (
          <Button
            key={c}
            title={formatDecks(c)}
            accessibilityLabel={T.choiceA11y(formatDecks(c))}
            variant={answer && c === q.answer ? 'primary' : answer?.guess === c && !answer.right ? 'danger' : 'secondary'}
            disabled={!!answer && c !== q.answer && c !== answer.guess}
            onPress={() => choose(c)}
            style={styles.choice}
          />
        ))}
      </View>
      {answer && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: color }}>
          <Text style={[styles.verdict, { color }]}>
            {!answer.right ? T.wrong(formatDecks(answer.error)) : answer.guess === q.answer ? T.exact : T.right}
          </Text>
          <P>{deckAnswerText(q)}</P>
          <P muted>{T.tip(answer.tip)}</P>
          <Button title={round.asked >= DECKS_ROUND ? T.finish : T.next} onPress={next} />
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { color: colors.muted, textAlign: 'center', fontVariant: ['tabular-nums'] },
  shoe: { color: colors.gold, fontWeight: '800', marginBottom: spacing(1) },
  question: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  choice: { minWidth: 56, flexGrow: 1 },
  verdict: { fontSize: 17, fontWeight: '800' },
  big: { color: colors.gold, fontSize: 24, fontWeight: '900', textAlign: 'center' },
});
