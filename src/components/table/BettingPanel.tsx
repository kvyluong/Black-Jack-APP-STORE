import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { haptic } from '../../audio/haptics';
import { CasinoTable, STARTING_CHIPS, formatChips } from '../../engine/progression';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { BonusAdButton } from '../BonusAdButton';
import { ChipButton, ChipStack } from '../chips';
import { Button, Panel, Segmented } from '../ui';

interface Props {
  casino: CasinoTable;
  bet: number;
  setBet: (bet: number) => void;
  /** How many of your seats are at the table, and how many your chips cover at this bet. */
  yourSeatCount: number;
  affordableSeats: number;
  maxPerHand: number;
  /** Bet suggested by the count, in table units (only shown while the count is visible). */
  suggestedUnits: number | null;
  outOfChips: boolean;
  /** A cheaper table to move to when you can't cover this one's minimum. */
  moveTo?: CasinoTable;
  onDeal: () => void;
  onRefill: () => void;
  onBonus: (amount: number) => void;
}

/** Between hands: 1 or 2 hands, the chip tray, and the Deal button. */
export function BettingPanel(p: Props) {
  const { settings, updateSettings } = useSettings();
  const unit = p.casino.minBet;
  return (
    <Panel>
      {/* Like spreading to a second betting spot at a real table: choose before each deal. */}
      <Segmented
        options={[
          { label: 'Play 1 hand', value: 1 },
          { label: 'Play 2 hands', value: 2 },
        ]}
        value={settings.yourHands}
        onChange={(v) => updateSettings({ yourHands: v })}
      />
      <View style={styles.betRow}>
        <ChipStack amount={p.bet} />
        <Text style={styles.prompt}>
          Bet ${formatChips(p.bet)}
          {p.yourSeatCount > 1 ? ` on each of your ${p.yourSeatCount} hands` : ''}
        </Text>
      </View>
      <Text style={styles.limits}>
        Table limits ${formatChips(unit)}–${formatChips(p.casino.maxBet)}
      </Text>
      {p.suggestedUnits !== null && (
        <Text style={styles.hint} onPress={() => p.setBet(Math.min(p.maxPerHand, p.suggestedUnits! * unit))}>
          Count suggests {p.suggestedUnits} unit{p.suggestedUnits > 1 ? 's' : ''} (${formatChips(p.suggestedUnits * unit)}) per hand · tap to
          bet it
        </Text>
      )}
      {/* Chip tray: tap chips to build your bet. */}
      <View style={styles.tray}>
        {p.casino.chips.map((c) => (
          <ChipButton
            key={c}
            value={c}
            disabled={p.bet + c > p.maxPerHand}
            onPress={() => {
              if (settings.haptics) haptic('chip');
              p.setBet(p.bet + c);
            }}
          />
        ))}
        <Button title="Clear" variant="ghost" disabled={p.bet === 0} onPress={() => p.setBet(0)} style={styles.clear} />
      </View>
      {p.outOfChips ? (
        <Button title={`Out of chips: free refill to $${formatChips(STARTING_CHIPS)}`} onPress={p.onRefill} />
      ) : p.moveTo ? (
        <Button
          title={`You need $${formatChips(unit)} here. Move to ${p.moveTo.name}`}
          onPress={() => updateSettings({ tableId: p.moveTo!.id })}
        />
      ) : p.bet < unit ? (
        <Button title={`Add chips: $${formatChips(unit)} minimum`} disabled onPress={() => {}} />
      ) : p.affordableSeats >= 1 ? (
        <Button title={p.affordableSeats < p.yourSeatCount ? 'Deal (1 hand: low on chips)' : 'Deal'} onPress={p.onDeal} />
      ) : (
        <Button title={`Lower bet to $${formatChips(unit)}`} onPress={() => p.setBet(unit)} />
      )}
      <BonusAdButton onGranted={p.onBonus} />
      <Text style={styles.lobby} onPress={() => router.push('/tables')} accessibilityRole="link">
        Change table
      </Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  betRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.5) },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  limits: { color: colors.muted, textAlign: 'center', fontSize: 13 },
  hint: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  tray: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.5), flexWrap: 'wrap' },
  clear: { paddingVertical: 8, paddingHorizontal: 12 },
  lobby: { color: colors.gold, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
});
