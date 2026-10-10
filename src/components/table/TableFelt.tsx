import { memo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { DealSchedule, cardDelay } from '../../engine/dealSchedule';
import { GameState, Outcome, isYours } from '../../engine/game';
import { CasinoTable, formatChips } from '../../engine/progression';
import { SEAT_COUNT, Table, isNpc } from '../../engine/table';
import { localized } from '../../i18n/lang';
import { colors, spacing } from '../../theme';
import { HandView } from '../HandView';
import { FanfareOverlay } from '../juice';
import { SeatView } from '../SeatView';
import { ShownFanfare } from '../useDealAnimation';

const OUTCOME_LABEL: Record<Outcome, string> = localized<Record<Outcome, string>>({
  en: { win: 'Win', lose: 'Lose', push: 'Push', blackjack: 'Blackjack!', surrender: 'Surrendered' },
  es: { win: 'Gana', lose: 'Pierde', push: 'Empate', blackjack: '¡Blackjack!', surrender: 'Rendido' },
});

const T = localized({
  en: {
    dealer: 'Dealer',
    seat: (n: number) => `Seat ${n}`,
    decks: (n: number) => `${n} deck${n > 1 ? 's' : ''}`,
    dealerRule: (h17: boolean) => `Dealer ${h17 ? 'hits soft 17' : 'stands on all 17s'}`,
    pays: (p: string) => `Blackjack pays ${p}`,
  },
  es: {
    dealer: 'Crupier',
    seat: (n: number) => `Asiento ${n}`,
    decks: (n: number) => `${n} baraja${n > 1 ? 's' : ''}`,
    dealerRule: (h17: boolean) => `El crupier ${h17 ? 'pide con 17 blando' : 'se planta con todo 17'}`,
    pays: (p: string) => `Blackjack paga ${p}`,
  },
});
/** Seats from the player's point of view: seat 1 (first base) is on the right. */
const SEAT_ORDER = Array.from({ length: SEAT_COUNT }, (_, i) => SEAT_COUNT - 1 - i);
/** Seats sit on an arc around the dealer. */
const ARC = [0, 10, 16, 18, 16, 10, 0];

interface Props {
  game: GameState;
  table: Table;
  casino: CasinoTable;
  schedule: DealSchedule | null;
  settled: boolean;
  instant: boolean;
  bubbles: Record<string, string>;
  fanfare: ShownFanfare | null;
  effects: boolean;
  shakeStyle: object;
}

/**
 * The felt: dealer, the seven seats on an arc, and your hands shown large.
 * Memoized, so the chip count-up and coaching messages don't redraw the whole table.
 */
export const TableFelt = memo(function TableFelt({ game, table, casino, schedule, settled, instant, bubbles, fanfare, effects, shakeStyle }: Props) {
  const { rules } = game;
  const hideHole = !game.holeRevealed && game.dealer.length > 0;
  // Your hands, shown large, in the same left-to-right order as the seats.
  const yourHands = game.hands.map((h, i) => ({ h, i })).filter(({ h }) => isYours(h)).reverse();
  const small = yourHands.length > 2 || (yourHands.length > 1 && yourHands.some(({ h }) => h.cards.length >= 4));

  return (
    <Animated.View style={[shakeStyle, styles.felt, { backgroundColor: casino.felt }]}>
      <View style={styles.dealer}>
        {game.dealer.length > 0 ? (
          <HandView
            cards={game.dealer}
            hideHole={hideHole}
            label={T.dealer}
            size="sm"
            dealDelay={(i) => cardDelay(schedule, 'dealer', i)}
            flipDelay={schedule?.holeFlipAt ?? 0}
            settling={!settled && game.holeRevealed}
            instant={instant}
          />
        ) : (
          <Text style={styles.placeholder}>
            {casino.name} · ${formatChips(casino.minBet)}–${formatChips(casino.maxBet)} · {T.decks(rules.decks)} ·{' '}
            {T.dealerRule(rules.dealerHitsSoft17)} · {T.pays(rules.blackjackPayout === 1.5 ? '3:2' : '6:5')}
          </Text>
        )}
      </View>

      {/* The seats, on an arc; seat 1 is on the right and is dealt first. */}
      <View style={styles.seats}>
        {SEAT_ORDER.map((seat, pos) => {
          const occupant = table.seats[seat];
          return (
            <View key={seat} style={{ flex: 1, marginTop: ARC[pos] }}>
              <SeatView
                seat={seat}
                occupant={occupant}
                game={game}
                schedule={schedule}
                settled={settled}
                instant={instant}
                bubble={isNpc(occupant) ? bubbles[occupant.id] : undefined}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.yours}>
        {yourHands.map(({ h, i }) => (
          <HandView
            key={h.id}
            cards={h.cards}
            size={small ? 'sm' : 'md'}
            active={game.phase === 'playing' && i === game.active}
            label={T.seat(h.seat + 1)}
            result={h.outcome ? OUTCOME_LABEL[h.outcome] : `$${h.bet}`}
            dealDelay={(c) => cardDelay(schedule, i, c)}
            settling={!settled}
            instant={instant}
          />
        ))}
      </View>
      <FanfareOverlay fanfare={fanfare} effects={effects} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  felt: { borderRadius: 18, paddingVertical: spacing(1), paddingHorizontal: 4 },
  dealer: { minHeight: 100, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.muted, textAlign: 'center' },
  seats: { flexDirection: 'row', gap: 2, minHeight: 150 },
  yours: { minHeight: 130, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
});
