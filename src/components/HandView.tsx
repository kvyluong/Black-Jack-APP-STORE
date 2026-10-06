import { StyleSheet, Text, View } from 'react-native';

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
  size?: 'sm' | 'md';
  /** Deal delay per card index, used when that card first appears. */
  dealDelay?: (index: number) => number;
  flipDelay?: number;
  /** While cards are still landing, hide the total so it doesn't give the result away. */
  settling?: boolean;
  instant?: boolean;
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
}: Props) {
  return (
    <View style={[styles.wrap, active && styles.active]}>
      <View style={styles.row}>
        {cards.map((c, i) => (
          // Keyed by the card itself so a replaced card (e.g. after a split) deals in fresh.
          <View key={`${i}-${c.rank}${c.suit}`} style={{ marginLeft: i === 0 ? 0 : size === 'sm' ? -12 : -16 }}>
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
          {settling ? '…' : hideHole ? tr(`showing ${cards[0].rank}`, `muestra ${cards[0].rank}`) : describeHand(cards)}
          {result && !settling ? ` · ${result}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 6, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: colors.gold },
  row: { flexDirection: 'row' },
  label: { color: colors.text, marginTop: 6, fontWeight: '600', textAlign: 'center', maxWidth: 150 },
});
