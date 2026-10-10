import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { haptic } from '../../audio/haptics';
import { CasinoTable, STARTING_CHIPS, formatChips } from '../../engine/progression';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { BonusAdButton } from '../BonusAdButton';
import { ChipButton, ChipStack } from '../chips';
import { Button, Panel, Segmented } from '../ui';

const T = localized({
  en: {
    one: 'Play 1 hand',
    two: 'Play 2 hands',
    bet: (amount: string, seats: number) => `Bet $${amount}${seats > 1 ? ` on each of your ${seats} hands` : ''}`,
    limits: (min: string, max: string) => `Table limits $${min}–$${max}`,
    suggest: (units: number, amount: string) =>
      `Count suggests ${units} unit${units > 1 ? 's' : ''} ($${amount}) per hand · tap to bet it`,
    clear: 'Clear',
    refill: (amount: string) => `Out of chips: free refill to $${amount}`,
    move: (min: string, table: string) => `You need $${min} here. Move to ${table}`,
    addChips: (min: string) => `Add chips: $${min} minimum`,
    dealLow: 'Deal (1 hand: low on chips)',
    deal: 'Deal',
    lower: (min: string) => `Lower bet to $${min}`,
    changeTable: 'Change table',
  },
  es: {
    one: 'Jugar 1 mano',
    two: 'Jugar 2 manos',
    bet: (amount: string, seats: number) => `Apuesta $${amount}${seats > 1 ? ` en cada una de tus ${seats} manos` : ''}`,
    limits: (min: string, max: string) => `Límites de la mesa $${min}–$${max}`,
    suggest: (units: number, amount: string) =>
      `El conteo sugiere ${units} unidad${units > 1 ? 'es' : ''} ($${amount}) por mano · toca para apostarla${units > 1 ? 's' : ''}`,
    clear: 'Borrar',
    refill: (amount: string) => `Sin fichas: recarga gratis a $${amount}`,
    move: (min: string, table: string) => `Aquí necesitas $${min}. Cámbiate a ${table}`,
    addChips: (min: string) => `Agrega fichas: mínimo $${min}`,
    dealLow: 'Repartir (1 mano: pocas fichas)',
    deal: 'Repartir',
    lower: (min: string) => `Bajar apuesta a $${min}`,
    changeTable: 'Cambiar de mesa',
  },
});

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
  /** Bonus chips and the table lobby link (off in the casino-conditions test). */
  extras?: boolean;
}

/** Between hands: 1 or 2 hands, the chip tray, and the Deal button. */
export function BettingPanel({ extras = true, ...p }: Props) {
  const { settings, updateSettings } = useSettings();
  const unit = p.casino.minBet;
  return (
    <Panel>
      {/* Like spreading to a second betting spot at a real table: choose before each deal. */}
      <Segmented
        options={[
          { label: T.one, value: 1 },
          { label: T.two, value: 2 },
        ]}
        value={settings.yourHands}
        onChange={(v) => updateSettings({ yourHands: v })}
      />
      <View style={styles.betRow}>
        <ChipStack amount={p.bet} />
        <Text style={styles.prompt}>
          {T.bet(formatChips(p.bet), p.yourSeatCount)}
        </Text>
      </View>
      <Text style={styles.limits}>
        {T.limits(formatChips(unit), formatChips(p.casino.maxBet))}
      </Text>
      {p.suggestedUnits !== null && (
        <Text style={styles.hint} onPress={() => p.setBet(Math.min(p.maxPerHand, p.suggestedUnits! * unit))}>
          {T.suggest(p.suggestedUnits, formatChips(p.suggestedUnits * unit))}
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
        <Button title={T.clear} variant="ghost" disabled={p.bet === 0} onPress={() => p.setBet(0)} style={styles.clear} />
      </View>
      {p.outOfChips ? (
        <Button title={T.refill(formatChips(STARTING_CHIPS))} onPress={p.onRefill} />
      ) : p.moveTo ? (
        <Button
          title={T.move(formatChips(unit), p.moveTo.name)}
          onPress={() => updateSettings({ tableId: p.moveTo!.id })}
        />
      ) : p.bet < unit ? (
        <Button title={T.addChips(formatChips(unit))} disabled onPress={() => {}} />
      ) : p.affordableSeats >= 1 ? (
        <Button title={p.affordableSeats < p.yourSeatCount ? T.dealLow : T.deal} onPress={p.onDeal} />
      ) : (
        <Button title={T.lower(formatChips(unit))} onPress={() => p.setBet(unit)} />
      )}
      {extras && <BonusAdButton onGranted={p.onBonus} />}
      {extras && (
        <Text style={styles.lobby} onPress={() => router.navigate('/tables')} accessibilityRole="link">
          {T.changeTable}
        </Text>
      )}
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
