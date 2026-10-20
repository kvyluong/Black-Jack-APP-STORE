import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LegalActions } from '../../engine/game';
import { formatChips } from '../../engine/progression';
import { ACTION_LABEL, Action, Recommendation } from '../../engine/strategy';
import { localized } from '../../i18n/lang';
import { colors, spacing } from '../../theme';
import { Icon } from '../Icon';
import { Button, Panel } from '../ui';

const T = localized({
  en: {
    coachSeat: (seat: number, action: string) => `Seat ${seat} · Coach: ${action}`,
    countPlay: ' (count play)',
    prompt: 'Dealer shows an Ace. Insurance?',
    coach: (hint: string) => `Coach: ${hint}`,
    take: 'Take insurance',
    decline: 'No insurance',
    signals: 'Tap the felt to hit · Swipe sideways to stand',
    askCoach: 'Ask the coach',
    need: (play: string, n: string) => `${play} · Need $${n}`,
    needLabel: (play: string, n: string) => `${play}, not available: you need $${n} more in chips`,
  },
  es: {
    coachSeat: (seat: number, action: string) => `Asiento ${seat} · Coach: ${action}`,
    countPlay: ' (jugada por conteo)',
    prompt: 'El crupier muestra un As. ¿Seguro?',
    coach: (hint: string) => `Coach: ${hint}`,
    take: 'Tomar seguro',
    decline: 'Sin seguro',
    signals: 'Toca el paño para pedir · Desliza de lado para plantarte',
    askCoach: 'Pregúntale al coach',
    need: (play: string, n: string) => `${play} · Faltan $${n}`,
    needLabel: (play: string, n: string) => `${play}, no disponible: te faltan $${n} en fichas`,
  },
});

const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];

/** Hit and Stand have casino hand signals; the other plays still use the buttons. */
const SIGNALED: Action[] = ['hit', 'stand'];

/**
 * Your turn: Hit / Stand / Double / Split / Surrender. With hints on, the coach waits to be
 * asked: "Ask the coach" shows and highlights the best play for this decision only (the bar
 * remounts for each decision, so it starts hidden again).
 * With `handSignals`, a hint explains the felt gestures and Hit/Stand are dimmed (still tappable).
 */
export function ActionBar({
  seat,
  legal,
  advice,
  showHints,
  surrenderAllowed,
  handSignals = false,
  shortfall = {},
  onAction,
}: {
  seat: number;
  legal: LegalActions;
  advice: Recommendation | null;
  showHints: boolean;
  surrenderAllowed: boolean;
  handSignals?: boolean;
  /** Chips you're short to split or double: those buttons say so instead of just greying out. */
  shortfall?: Partial<Record<'split' | 'double', number>>;
  onAction: (a: Action) => void;
}) {
  const [asked, setAsked] = useState(false);
  const coach = showHints && asked;
  return (
    <>
      {showHints && advice && !asked && <CoachButton onPress={() => setAsked(true)} />}
      {coach && advice && (
        <Text style={styles.hint}>
          {T.coachSeat(seat + 1, ACTION_LABEL[advice.action])}
          {advice.deviation ? T.countPlay : ''}
        </Text>
      )}
      {handSignals && <Text style={styles.signals}>{T.signals}</Text>}
      <View style={styles.actions}>
        {ACTIONS.filter((a) => a !== 'surrender' || surrenderAllowed).map((a) => {
          const missing = a === 'split' || a === 'double' ? (shortfall[a] ?? 0) : 0;
          const short = !legal[a] && missing > 0 ? formatChips(missing) : null;
          return (
            <Button
              key={a}
              title={short ? T.need(ACTION_LABEL[a], short) : ACTION_LABEL[a]}
              accessibilityLabel={short ? T.needLabel(ACTION_LABEL[a], short) : undefined}
              variant="secondary"
              disabled={!legal[a]}
              highlighted={coach && advice?.action === a}
              onPress={() => onAction(a)}
              style={handSignals && SIGNALED.includes(a) ? { ...styles.actionButton, ...styles.dimmed } : styles.actionButton}
            />
          );
        })}
      </View>
    </>
  );
}

/** The dealer shows an Ace: take insurance or not. */
export function InsurancePanel({ hint, onChoose }: { hint: string | null; onChoose: (take: boolean) => void }) {
  const [asked, setAsked] = useState(false);
  return (
    <Panel>
      <Text style={styles.prompt}>{T.prompt}</Text>
      {hint && (asked ? <Text style={styles.hint}>{T.coach(hint)}</Text> : <CoachButton onPress={() => setAsked(true)} />)}
      <View style={styles.actions}>
        <Button title={T.take} variant="secondary" onPress={() => onChoose(true)} style={styles.actionButton} />
        <Button title={T.decline} variant="secondary" onPress={() => onChoose(false)} style={styles.actionButton} />
      </View>
    </Panel>
  );
}

/** A small link-style button that reveals the coach's advice. */
function CoachButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={T.askCoach} hitSlop={8} style={styles.askRow}>
      <Icon name="coach" size={16} />
      <Text style={styles.ask}>{T.askCoach}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  askRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center' },
  ask: { color: colors.gold, fontWeight: '700', textAlign: 'center', paddingVertical: 4, textDecorationLine: 'underline' },
  hint: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  actionButton: { minWidth: 96, flexGrow: 1 },
  dimmed: { opacity: 0.55 },
  signals: { color: colors.text, textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
