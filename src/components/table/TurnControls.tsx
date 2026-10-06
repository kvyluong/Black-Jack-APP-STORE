import { StyleSheet, Text, View } from 'react-native';

import { LegalActions } from '../../engine/game';
import { ACTION_LABEL, Action, Recommendation } from '../../engine/strategy';
import { colors, spacing } from '../../theme';
import { Button, Panel } from '../ui';

const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];

/** Your turn: Hit / Stand / Double / Split / Surrender, with the coach's pick highlighted. */
export function ActionBar({
  seat,
  legal,
  advice,
  showHints,
  surrenderAllowed,
  onAction,
}: {
  seat: number;
  legal: LegalActions;
  advice: Recommendation | null;
  showHints: boolean;
  surrenderAllowed: boolean;
  onAction: (a: Action) => void;
}) {
  return (
    <>
      {showHints && advice && (
        <Text style={styles.hint}>
          Seat {seat + 1} · Coach: {ACTION_LABEL[advice.action]}
          {advice.deviation ? ' (count play)' : ''}
        </Text>
      )}
      <View style={styles.actions}>
        {ACTIONS.filter((a) => a !== 'surrender' || surrenderAllowed).map((a) => (
          <Button
            key={a}
            title={ACTION_LABEL[a]}
            variant="secondary"
            disabled={!legal[a]}
            highlighted={showHints && advice?.action === a}
            onPress={() => onAction(a)}
            style={styles.actionButton}
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
      <Text style={styles.prompt}>Dealer shows an Ace. Insurance?</Text>
      {hint && <Text style={styles.hint}>Coach: {hint}</Text>}
      <View style={styles.actions}>
        <Button title="Take insurance" variant="secondary" onPress={() => onChoose(true)} style={styles.actionButton} />
        <Button title="No insurance" variant="secondary" onPress={() => onChoose(false)} style={styles.actionButton} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  actionButton: { minWidth: 96, flexGrow: 1 },
});
