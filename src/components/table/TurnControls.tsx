import { StyleSheet, Text, View } from 'react-native';

import { LegalActions } from '../../engine/game';
import { ACTION_LABEL, Action, Recommendation } from '../../engine/strategy';
import { localized } from '../../i18n/lang';
import { colors, spacing } from '../../theme';
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
  },
  es: {
    coachSeat: (seat: number, action: string) => `Asiento ${seat} · Coach: ${action}`,
    countPlay: ' (jugada por conteo)',
    prompt: 'El crupier muestra un As. ¿Seguro?',
    coach: (hint: string) => `Coach: ${hint}`,
    take: 'Tomar seguro',
    decline: 'Sin seguro',
    signals: 'Toca el paño para pedir · Desliza de lado para plantarte',
  },
});

const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];

/** Hit and Stand have casino hand signals; the other plays still use the buttons. */
const SIGNALED: Action[] = ['hit', 'stand'];

/**
 * Your turn: Hit / Stand / Double / Split / Surrender, with the coach's pick highlighted.
 * With `handSignals`, a hint explains the felt gestures and Hit/Stand are dimmed (still tappable).
 */
export function ActionBar({
  seat,
  legal,
  advice,
  showHints,
  surrenderAllowed,
  handSignals = false,
  onAction,
}: {
  seat: number;
  legal: LegalActions;
  advice: Recommendation | null;
  showHints: boolean;
  surrenderAllowed: boolean;
  handSignals?: boolean;
  onAction: (a: Action) => void;
}) {
  return (
    <>
      {showHints && advice && (
        <Text style={styles.hint}>
          {T.coachSeat(seat + 1, ACTION_LABEL[advice.action])}
          {advice.deviation ? T.countPlay : ''}
        </Text>
      )}
      {handSignals && <Text style={styles.signals}>✋ {T.signals}</Text>}
      <View style={styles.actions}>
        {ACTIONS.filter((a) => a !== 'surrender' || surrenderAllowed).map((a) => (
          <Button
            key={a}
            title={ACTION_LABEL[a]}
            variant="secondary"
            disabled={!legal[a]}
            highlighted={showHints && advice?.action === a}
            onPress={() => onAction(a)}
            style={handSignals && SIGNALED.includes(a) ? { ...styles.actionButton, ...styles.dimmed } : styles.actionButton}
          />
        ))}
      </View>
    </>
  );
}

/** The dealer shows an Ace: take insurance or not. */
export function InsurancePanel({ hint, onChoose }: { hint: string | null; onChoose: (take: boolean) => void }) {
  return (
    <Panel>
      <Text style={styles.prompt}>{T.prompt}</Text>
      {hint && <Text style={styles.hint}>{T.coach(hint)}</Text>}
      <View style={styles.actions}>
        <Button title={T.take} variant="secondary" onPress={() => onChoose(true)} style={styles.actionButton} />
        <Button title={T.decline} variant="secondary" onPress={() => onChoose(false)} style={styles.actionButton} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  actionButton: { minWidth: 96, flexGrow: 1 },
  dimmed: { opacity: 0.55 },
  signals: { color: colors.text, textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
