import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import { Card } from '../engine/cards';
import { describeHand } from '../engine/hand';
import { tr } from '../i18n/lang';
import { colors } from '../theme';
import { AnimatedCard } from './AnimatedCard';

interface Props {
  cards: Card[];
  label?: string;
  hideHole?: boolean;
  active?: boolean;
  result?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Deal delay per card index, used when that card first appears. */
  dealDelay?: (index: number) => number;
  flipDelay?: number;
  /** While cards are still landing, hide the total so it doesn't give the result away. */
  settling?: boolean;
  instant?: boolean;
  /** A split hand: a two-card 21 is shown as 21, not Blackjack. */
  fromSplit?: boolean;
}

export function HandView({
  cards,
  label,
  hideHole,
  active,
  result,
  size = 'md',
  dealDelay,
  flipDelay = 0,
  settling,
  instant = false,
  fromSplit = false,
}: Props) {
  return (
    <Animated.View layout={instant ? undefined : MAKE_ROOM} style={[styles.wrap, active && styles.active]}>
      <View style={styles.row}>
        {cards.map((c, i) => (
          // Keyed by the card itself so a replaced card (e.g. after a split) deals in fresh.
          <View key={`${i}-${c.rank}${c.suit}`} style={{ marginLeft: i === 0 ? 0 : OVERLAP[size] }}>
            <AnimatedCard
              card={c}
              faceDown={!!hideHole && i === 1}
              size={size}
              dealDelay={dealDelay?.(i) ?? 0}
              flipDelay={flipDelay}
              instant={instant}
            />
          </View>
        ))}
      </View>
      {cards.length > 0 && (
        <Text style={styles.label}>
          {label ? `${label}: ` : ''}
          {settling ? '…' : hideHole ? tr(`showing ${cards[0].rank}`, `muestra ${cards[0].rank}`) : describeHand(cards, fromSplit)}
          {result && !settling ? ` · ${result}` : ''}
        </Text>
      )}
    </Animated.View>
  );
}

/** How far each card tucks under the one before it. */
const OVERLAP = { sm: -12, md: -16, lg: -26 };

/** When a card joins the hand, the cards already down slide over to make room instead of jumping. */
const MAKE_ROOM = LinearTransition.duration(240).easing(Easing.out(Easing.quad));

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 6, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: colors.gold },
  row: { flexDirection: 'row' },
  // The total sits in a small dark badge under the cards, readable on any felt color.
  label: {
    color: colors.text,
    marginTop: 6,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 230,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
