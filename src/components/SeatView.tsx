import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

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
  /** Tablet size: bigger cards and text. */
  big?: boolean;
}

/**
 * A computer player's cards stack in a box of fixed size (room for four), so a hit
 * never grows the table and shoves your hand and buttons down mid-deal. Longer hands
 * squeeze closer together instead: `stackStep` scales the per-card offset.
 */
const STACK_ROOM = 3;
const stackStep = (n: number) => (n <= STACK_ROOM + 1 ? 1 : STACK_ROOM / (n - 1));
/** Card size and per-card offset of the stack, on phones and on tablets. */
const STACK = {
  phone: { card: 'xs', w: 30, h: 42, dx: 6, dy: 12 },
  tablet: { card: 'sm', w: 44, h: 64, dx: 9, dy: 18 },
} as const;

/** One seat at the table: a computer player's avatar, bet and small cards, your spot, or an open seat. */
export function SeatView({ seat, occupant, game, schedule, settled, instant, bubble, big = false }: Props) {
  const { good, bad } = useOutcomeColors();
  // Each style, with its tablet-size override on a tablet.
  const st = (k: keyof typeof styles) =>
    [styles[k], big && tabletStyles[k as keyof typeof tabletStyles]] as StyleProp<ViewStyle & TextStyle>;
  const stack = big ? STACK.tablet : STACK.phone;
  const stackBox = { width: stack.w + stack.dx * STACK_ROOM, height: stack.h + stack.dy * STACK_ROOM };
  const label = <Text style={st('seatNo')}>{seat + 1}</Text>;
  if (occupant === null) {
    return (
      <View style={styles.seat} accessible accessibilityLabel={T.openSeat(seat + 1)}>
        <View style={[st('avatar'), styles.empty]} />
        <Text style={st('open')}>{T.open}</Text>
        {label}
      </View>
    );
  }
  if (occupant === YOU) {
    const bet = game.hands.filter((h) => h.seat === seat).reduce((sum, h) => sum + h.bet, 0);
    return (
      <View style={styles.seat} accessible accessibilityLabel={T.yourSeat(seat + 1, bet)}>
        <View style={[st('avatar'), styles.you]}>
          <Text style={st('youText')}>{T.you}</Text>
        </View>
        {bet > 0 && <Text style={st('bet')}>${bet}</Text>}
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
      T.bet(h.bet, settled ? (h.outcome ? OUTCOME_SHORT[h.outcome] : `${h.cards.map((c) => c.rank).join(' ')}, ${describeHand(h.cards, h.fromSplit)}`) : T.dealing),
    ),
    theirTurn ? T.theirTurn : '',
    bubble ?? '',
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <View style={styles.seat} accessible accessibilityLabel={summary}>
      <View style={[st('avatar'), { backgroundColor: `hsl(${occupant.hue}, 45%, 38%)` }, theirTurn && styles.turn]}>
        <Text style={st('initials')}>{initials}</Text>
      </View>
      <Text style={st('name')} numberOfLines={1}>
        {occupant.name}
      </Text>
      <Text style={st('style')} numberOfLines={2}>
        {STYLE_LABEL[occupant.style]}
      </Text>
      {hands.map(({ h, i }) => (
        <View key={h.id} style={styles.hand}>
          <Text style={st('bet')}>${h.bet}</Text>
          <View style={stackBox}>
            {h.cards.map((c, ci) => (
              <View
                key={`${ci}-${c.rank}${c.suit}`}
                style={{ position: 'absolute', top: ci * stackStep(h.cards.length) * stack.dy, left: ci * stackStep(h.cards.length) * stack.dx }}
              >
                <AnimatedCard card={c} faceDown={false} size={stack.card} dealDelay={cardDelay(schedule, i, ci)} flipDelay={0} instant={instant} />
              </View>
            ))}
          </View>
          <Text
            style={[st('total'), h.outcome && { color: h.payout! > h.bet ? good : h.payout === h.bet ? colors.text : bad }]}
            // One line, shrinking a long total ("17 blando", "Pasado (22)") instead of wrapping it.
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {!settled ? ' ' : h.outcome ? OUTCOME_SHORT[h.outcome] : describeHand(h.cards, h.fromSplit)}
          </Text>
        </View>
      ))}
      {bubble && (
        <Text
          style={[st('bubble'), bubble.includes('✗') && styles.bubbleMistake]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
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
  name: { color: colors.text, fontSize: 11, fontWeight: '700', maxWidth: '100%' },
  // Always two lines tall, so every seat's cards and total line up on the arc.
  style: { color: colors.muted, fontSize: 9, textAlign: 'center', lineHeight: 11, height: 22 },
  open: { color: colors.muted, fontSize: 10, opacity: 0.6 },
  hand: { alignItems: 'center', gap: 2, marginTop: 2 },
  bet: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  total: { color: colors.text, fontSize: 12, fontWeight: '700' },
  // Floats over the avatar (a long one also over the name), so a new bubble doesn't make the
  // seat taller. A little wider than the seat; the text shrinks to fit rather than break a word.
  bubble: {
    position: 'absolute',
    top: 6,
    left: -4,
    right: -4,
    zIndex: 1,
    color: colors.black,
    backgroundColor: colors.text,
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    textAlign: 'center',
    overflow: 'hidden',
  },
  bubbleMistake: { backgroundColor: '#FFD6D6' },
  seatNo: { color: colors.muted, fontSize: 10, opacity: 0.7, marginTop: 'auto' },
});

/** Tablet sizes: everything about a third bigger. */
const tabletStyles = StyleSheet.create({
  avatar: { width: 42, height: 42, borderRadius: 21 },
  youText: { fontSize: 12 },
  initials: { fontSize: 16 },
  name: { fontSize: 14 },
  style: { fontSize: 12, lineHeight: 15, height: 30 },
  open: { fontSize: 13 },
  bet: { fontSize: 14 },
  total: { fontSize: 15 },
  bubble: { top: 9, fontSize: 13, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  seatNo: { fontSize: 13 },
});
