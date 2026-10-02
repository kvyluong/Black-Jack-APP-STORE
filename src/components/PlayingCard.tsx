import { StyleSheet, Text, View } from 'react-native';

import { Card, isRed } from '../engine/cards';
import { hiLoValue } from '../engine/counting';
import { colors, radius } from '../theme';

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Shows the card's Hi-Lo tag beneath it (used in lessons and drills). */
  showTag?: boolean;
}

const SIZES = { sm: { w: 44, h: 64, f: 16 }, md: { w: 60, h: 88, f: 22 }, lg: { w: 96, h: 140, f: 36 } };

export function PlayingCard({ card, faceDown, size = 'md', showTag }: Props) {
  const s = SIZES[size];
  if (faceDown || !card) {
    return (
      <View style={[styles.card, styles.back, { width: s.w, height: s.h }]}>
        <View style={styles.backInner} />
      </View>
    );
  }
  const color = isRed(card) ? colors.red : colors.black;
  const tag = hiLoValue(card.rank);
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[styles.card, { width: s.w, height: s.h }]}
        accessible
        accessibilityLabel={`${card.rank} of ${suitName(card.suit)}`}
      >
        <Text style={[styles.corner, { color, fontSize: s.f * 0.6 }]}>{card.rank}</Text>
        <Text style={[styles.center, { color, fontSize: s.f * 1.2 }]}>{card.suit}</Text>
        <Text style={[styles.rank, { color, fontSize: s.f }]}>{card.rank}</Text>
      </View>
      {showTag && (
        <Text style={[styles.tag, { color: tag > 0 ? colors.good : tag < 0 ? colors.bad : colors.muted }]}>
          {tag > 0 ? '+1' : tag < 0 ? '−1' : '0'}
        </Text>
      )}
    </View>
  );
}

function suitName(suit: Card['suit']) {
  return { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }[suit];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  back: { backgroundColor: colors.cardBack, padding: 4 },
  backInner: { flex: 1, alignSelf: 'stretch', borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  corner: { position: 'absolute', top: 3, left: 5, fontWeight: '700' },
  center: { lineHeight: undefined },
  rank: { position: 'absolute', bottom: 2, right: 5, fontWeight: '700', transform: [{ rotate: '180deg' }] },
  tag: { marginTop: 4, fontWeight: '700', fontSize: 14 },
});
