// Daily review of your leaks: 10 hands built from the exact spots you've missed,
// each brought back 1, 3 and 7 days after you get it right (see engine/leakReview).
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { playSound } from '../../audio/sounds';
import { HandView } from '../../components/HandView';
import { PlayingCard } from '../../components/PlayingCard';
import { Button, P, Panel, Screen } from '../../components/ui';
import { useOutcomeColors } from '../../components/useColors';
import { useToday } from '../../components/goals';
import { answerReview, dueSpots, questionForSpot, reviewSession } from '../../engine/leakReview';
import { localizeSpotLabel, recordDecision } from '../../engine/leaks';
import { ACTION_LABEL, Action, recommend } from '../../engine/strategy';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';

const T = localized({
  en: {
    progress: (n: number, total: number) => `Hand ${n} of ${total}`,
    progressA11y: (n: number, total: number, right: number) => `Hand ${n} of ${total}. ${right} right so far`,
    spot: (label: string) => `Spot: ${label}`,
    dealerShows: 'Dealer shows',
    you: 'You',
    correct: '✓ Correct',
    best: (action: string) => `✗ The best play is ${action}`,
    next: 'Next hand',
    finish: 'See results',
    nothingTitle: 'Nothing to review today',
    nothingBody:
      'Hands you miss at the table or in the strategy drill come back here the next day, then 3 and 7 days after you get them right.',
    toLeaks: 'See your leaks',
    doneTitle: 'Review done',
    doneBody: (right: number, total: number) => `${right} of ${total} right.`,
    doneMore: (n: number) => `${n} ${n === 1 ? 'spot is' : 'spots are'} still due today. Go again to clear ${n === 1 ? 'it' : 'them'}.`,
    doneClear: 'Every spot you got right moves further out: 1, then 3, then 7 days. Misses come back tomorrow.',
    again: 'Review again',
    back: 'Done',
  },
  es: {
    progress: (n: number, total: number) => `Mano ${n} de ${total}`,
    progressA11y: (n: number, total: number, right: number) => `Mano ${n} de ${total}. ${right} correctas hasta ahora`,
    spot: (label: string) => `Jugada: ${label}`,
    dealerShows: 'El crupier muestra',
    you: 'Tú',
    correct: '✓ Correcto',
    best: (action: string) => `✗ La mejor jugada es ${action}`,
    next: 'Siguiente mano',
    finish: 'Ver resultados',
    nothingTitle: 'Nada que repasar hoy',
    nothingBody:
      'Las manos que fallas en la mesa o en el ejercicio de estrategia vuelven aquí al día siguiente, y luego 3 y 7 días después de acertarlas.',
    toLeaks: 'Ver tus fugas',
    doneTitle: 'Repaso terminado',
    doneBody: (right: number, total: number) => `${right} de ${total} correctas.`,
    doneMore: (n: number) =>
      `${n === 1 ? 'Aún toca repasar 1 jugada hoy' : `Aún toca repasar ${n} jugadas hoy`}. Repasa otra vez para terminar.`,
    doneClear: 'Cada jugada que aciertas vuelve más tarde: en 1, luego 3 y luego 7 días. Las que fallas vuelven mañana.',
    again: 'Repasar otra vez',
    back: 'Listo',
  },
});

export default function LeakReview() {
  const { settings, stats, updateStats } = useSettings();
  const { good, bad } = useOutcomeColors();
  const today = useToday();
  const { rules } = settings;
  // The session is fixed when it starts (answers change what's due); "Review again" rebuilds it.
  const [round, setRound] = useState(0);
  const session = useMemo(
    () => reviewSession(stats.leaks, stats.leakReview, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round, today],
  );
  const questions = useMemo(() => session.map((key) => ({ key, q: questionForSpot(key)! })), [session]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Action | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!questions.length) {
    return (
      <Screen>
        <Panel>
          <Text style={styles.title}>{T.nothingTitle}</Text>
          <P muted>{T.nothingBody}</P>
        </Panel>
        <Button title={T.toLeaks} onPress={() => router.replace('/leaks')} />
      </Screen>
    );
  }

  if (finished) {
    const stillDue = dueSpots(stats.leaks, stats.leakReview, today).length;
    return (
      <Screen>
        <Panel style={{ backgroundColor: colors.feltDark }}>
          <Text style={styles.title} accessibilityRole="header">
            {T.doneTitle}
          </Text>
          <Text style={styles.big}>{T.doneBody(right, questions.length)}</Text>
          <P muted>{stillDue > 0 ? T.doneMore(stillDue) : T.doneClear}</P>
        </Panel>
        {stillDue > 0 && (
          <Button
            title={T.again}
            onPress={() => {
              setRound((r) => r + 1);
              setI(0);
              setRight(0);
              setPicked(null);
              setFinished(false);
            }}
          />
        )}
        <Button title={T.back} variant={stillDue > 0 ? 'secondary' : 'primary'} onPress={() => router.back()} />
      </Screen>
    );
  }

  const { key, q } = questions[Math.min(i, questions.length - 1)];
  const canDouble = q.cards.length === 2;
  const advice = recommend({
    cards: q.cards,
    dealerUp: q.dealerUp.rank,
    rules,
    canDouble,
    canSplit: q.canSplit,
    canSurrender: rules.lateSurrender && q.cards.length === 2,
  });
  const actions: Action[] = [
    'hit',
    'stand',
    ...(canDouble ? (['double'] as Action[]) : []),
    ...(q.canSplit ? (['split'] as Action[]) : []),
    ...(rules.lateSurrender && q.cards.length === 2 ? (['surrender'] as Action[]) : []),
  ];

  const choose = (a: Action) => {
    if (picked) return;
    setPicked(a);
    const ok = a === advice.action;
    if (ok) setRight((r) => r + 1);
    if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong');
    updateStats((s) => {
      const leaks = recordDecision(s.leaks, { cards: q.cards, dealerUp: q.dealerUp.rank, canSplit: q.canSplit, chosen: a, best: advice.action });
      const spot = leaks.spots[key];
      const missesAfter = spot ? spot.total - spot.right : 0;
      return {
        ...s,
        leaks,
        leakReview: answerReview(s.leakReview, key, ok, missesAfter, today),
        decisions: s.decisions + 1,
        correctDecisions: s.correctDecisions + (ok ? 1 : 0),
      };
    });
  };

  const next = () => {
    if (i + 1 >= questions.length) setFinished(true);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };

  const ok = picked === advice.action;

  return (
    <Screen>
      <View style={styles.head} accessible accessibilityLabel={T.progressA11y(i + 1, questions.length, right)}>
        <Text style={styles.score}>{T.progress(i + 1, questions.length)}</Text>
        <Text style={styles.spot} numberOfLines={1}>
          {T.spot(localizeSpotLabel(key))}
        </Text>
      </View>

      <View style={styles.table}>
        <Text style={styles.label}>{T.dealerShows}</Text>
        <PlayingCard card={q.dealerUp} />
        <View style={{ height: spacing(2) }} />
        <HandView cards={q.cards} label={T.you} />
      </View>

      <View style={styles.actions}>
        {actions.map((a) => (
          <Button
            key={a}
            title={ACTION_LABEL[a]}
            variant={picked && a === advice.action ? 'primary' : picked === a ? 'danger' : 'secondary'}
            onPress={() => choose(a)}
            style={styles.actionButton}
          />
        ))}
      </View>

      {picked && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: ok ? good : bad }}>
          <Text style={{ color: ok ? good : bad, fontWeight: '800', fontSize: 17 }} accessibilityLiveRegion="polite">
            {ok ? T.correct : T.best(ACTION_LABEL[advice.action])}
          </Text>
          <Text style={styles.reason}>{advice.reason}</Text>
          <Button title={i + 1 >= questions.length ? T.finish : T.next} onPress={next} />
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing(1) },
  score: { color: colors.gold, fontWeight: '700' },
  spot: { color: colors.muted, fontWeight: '700', flexShrink: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  big: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  table: { alignItems: 'center', paddingVertical: spacing(2) },
  label: { color: colors.muted, marginBottom: spacing(1) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  actionButton: { minWidth: 96, flexGrow: 1 },
  reason: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
