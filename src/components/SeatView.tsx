import { StyleSheet, Text, View } from 'react-native';

import { DealSchedule, cardDelay } from '../engine/dealSchedule';
import { GameState, Outcome, YOU } from '../engine/game';
import { describeHand } from '../engine/hand';
import { Occupant, STYLE_LABEL, isNpc } from '../engine/table';
import { localized } from '../i18n/lang';
import { colors } from '../theme';
import { AnimatedCard } from './AnimatedCard';
import { useOutcomeColors } from './useColors';

const OUTCOME_SHORT: Record<Outcome, string> = localized<Record<Outcome, string>>({
  en: { win: 'Win', lose: 'Lose', push: 'Push', blackjack: 'BJ!', surrender: 'Surr.' },
  es: { win: 'Gana', lose: 'Pierde', push: 'Empate', blackjack: 'BJ!', surrender: 'Rend.' },
});

const T = localized({
  en: {
    open: 'open',
    openSeat: (n: number) => `Seat ${n}, open`,
    yourSeat: (n: number, bet: number) => `Seat ${n}, your seat${bet > 0 ? `, bet $${bet}` : ''}`,
    you: 'YOU',
    seat: (n: number, name: string, style: string) => `Seat ${n}, ${name}, ${style}`,
    bet: (bet: number, rest: string) => `bet $${bet}, ${rest}`,
    dealing: 'dealing',
    theirTurn: 'their turn',
  },
  es: {
    open: 'libre',
    openSeat: (n: number) => `Asiento ${n}, libre`,
    yourSeat: (n: number, bet: number) => `Asiento ${n}, tu asiento${bet > 0 ? `, apuesta $${bet}` : ''}`,
    you: 'TÚ',
    seat: (n: number, name: string, style: string) => `Asiento ${n}, ${name}, ${style}`,
    bet: (bet: number, rest: string) => `apuesta $${bet}, ${rest}`,
    dealing: 'repartiendo',
    theirTurn: 'su turno',
  },
});

interface Props {
  seat: number;
  occupant: Occupant;
  game: GameState;
  schedule: DealSchedule | null;
  settled: boolean;
  instant: boolean;
  /** What this player just did, e.g. "Hit" or "Stand ✗ book: Hit". */
  bubble?: string;
}

/** One seat at the table: a computer player's avatar, bet and small cards, your spot, or an open seat. */
export function SeatView({ seat, occupant, game, schedule, settled, instant, bubble }: Props) {
  const { good, bad } = useOutcomeColors();
  const label = <Text style={styles.seatNo}>{seat + 1}</Text>;
  if (occupant === null) {
    return (
      <View style={styles.seat} accessible accessibilityLabel={T.openSeat(seat + 1)}>
        <View style={[styles.avatar, styles.empty]} />
        <Text style={styles.open}>{T.open}</Text>
        {label}
      </View>
    );
  }
  if (occupant === YOU) {
    const bet = game.hands.filter((h) => h.seat === seat).reduce((sum, h) => sum + h.bet, 0);
    return (
      <View style={styles.seat} accessible accessibilityLabel={T.yourSeat(seat + 1, bet)}>
        <View style={[styles.avatar, styles.you]}>
          <Text style={styles.youText}>{T.you}</Text>
        </View>
        {bet > 0 && <Text style={styles.bet}>${bet}</Text>}
        {label}
      </View>
    );
  }
  if (!isNpc(occupant)) return null;
  const hands = game.hands.map((h, i) => ({ h, i })).filter(({ h }) => h.owner === occupant.id);
  const theirTurn = game.phase === 'playing' && hands.some(({ i }) => i === game.active);
  const initials = occupant.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  // One sentence for screen readers instead of a dozen tiny labels.
  const summary = [
    T.seat(seat + 1, occupant.name, STYLE_LABEL[occupant.style]),
    ...hands.map(({ h }) =>
      T.bet(h.bet, settled ? (h.outcome ? OUTCOME_SHORT[h.outcome] : `${h.cards.map((c) => c.rank).join(' ')}, ${describeHand(h.cards)}`) : T.dealing),
    ),
    theirTurn ? T.theirTurn : '',
    bubble ?? '',
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <View style={styles.seat} accessible accessibilityLabel={summary}>
      <View style={[styles.avatar, { backgroundColor: `hsl(${occupant.hue}, 45%, 38%)` }, theirTurn && styles.turn]}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {occupant.name}
      </Text>
      <Text style={styles.style} numberOfLines={2}>
        {STYLE_LABEL[occupant.style]}
      </Text>
      {hands.map(({ h, i }) => (
        <View key={i} style={styles.hand}>
          <Text style={styles.bet}>${h.bet}</Text>
          <View style={{ height: 42 + (h.cards.length - 1) * 14, width: 30 + (h.cards.length - 1) * 6 }}>
            {h.cards.map((c, ci) => (
              <View key={`${ci}-${c.rank}${c.suit}`} style={{ position: 'absolute', top: ci * 14, left: ci * 6 }}>
                <AnimatedCard card={c} faceDown={false} size="xs" dealDelay={cardDelay(schedule, i, ci)} flipDelay={0} instant={instant} />
              </View>
            ))}
          </View>
          <Text style={[styles.total, h.outcome && { color: h.payout! > h.bet ? good : h.payout === h.bet ? colors.text : bad }]}>
            {!settled ? ' ' : h.outcome ? OUTCOME_SHORT[h.outcome] : describeHand(h.cards)}
          </Text>
        </View>
      ))}
      {bubble && (
        <Text style={[styles.bubble, bubble.includes('✗') && styles.bubbleMistake]} numberOfLines={3}>
          {bubble}
        </Text>
      )}
      {label}
    </View>
  );
}

const styles = StyleSheet.create({
  seat: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted, opacity: 0.5 },
  you: { borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.feltDark },
  youText: { color: colors.gold, fontSize: 9, fontWeight: '900' },
  turn: { borderWidth: 2, borderColor: colors.gold },
  initials: { color: colors.text, fontWeight: '800', fontSize: 12 },
  name: { color: colors.text, fontSize: 10, fontWeight: '700', maxWidth: '100%' },
  style: { color: colors.muted, fontSize: 8, textAlign: 'center', lineHeight: 10 },
  open: { color: colors.muted, fontSize: 9, opacity: 0.6 },
  hand: { alignItems: 'center', gap: 2, marginTop: 2 },
  bet: { color: colors.gold, fontSize: 10, fontWeight: '800' },
  total: { color: colors.text, fontSize: 10, fontWeight: '700' },
  bubble: {
    color: colors.black,
    backgroundColor: colors.text,
    fontSize: 9,
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bubbleMistake: { backgroundColor: '#FFD6D6' },
  seatNo: { color: colors.muted, fontSize: 9, opacity: 0.7, marginTop: 'auto' },
});
