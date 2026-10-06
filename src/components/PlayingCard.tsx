import { StyleSheet, Text, View } from 'react-native';

import { Card, isRed } from '../engine/cards';
import { hiLoValue } from '../engine/counting';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, radius, tagColor, tagText } from '../theme';

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Shows the card's Hi-Lo tag beneath it (used in lessons and drills). */
  showTag?: boolean;
}

const T = localized({
  en: {
    card: (rank: string, suit: string) => `${rank} of ${suit}`,
    suits: { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' } as Record<Card['suit'], string>,
    tag: (tag: number) => `count ${tag > 0 ? 'plus one' : tag < 0 ? 'minus one' : 'zero'}`,
  },
  es: {
    card: (rank: string, suit: string) => `${rank} de ${suit}`,
    suits: { '♠': 'picas', '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' },
    tag: (tag: number) => `conteo ${tag > 0 ? 'más uno' : tag < 0 ? 'menos uno' : 'cero'}`,
  },
});

const SIZES = { xs: { w: 30, h: 42, f: 12 }, sm: { w: 44, h: 64, f: 16 }, md: { w: 60, h: 88, f: 22 }, lg: { w: 96, h: 140, f: 36 } };

export function PlayingCard({ card, faceDown, size = 'md', showTag }: Props) {
  const { settings } = useSettings();
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
  if (size === 'xs') {
    // Tiny cards for other players' seats: just rank over suit.
    return (
      <View
        style={[styles.card, styles.xs, { width: s.w, height: s.h }]}
        accessible
        accessibilityLabel={T.card(card.rank, suitName(card.suit))}
      >
        <Text style={{ color, fontSize: s.f, fontWeight: '800', lineHeight: s.f + 2 }}>{card.rank}</Text>
        <Text style={{ color, fontSize: s.f, lineHeight: s.f + 2 }}>{card.suit}</Text>
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[styles.card, { width: s.w, height: s.h }]}
        accessible
        accessibilityLabel={T.card(card.rank, suitName(card.suit))}
      >
        <Text style={[styles.corner, { color, fontSize: s.f * 0.6 }]}>{card.rank}</Text>
        <Text style={[styles.center, { color, fontSize: s.f * 1.2 }]}>{card.suit}</Text>
        <Text style={[styles.rank, { color, fontSize: s.f }]}>{card.rank}</Text>
      </View>
      {showTag && (
        <Text style={[styles.tag, { color: tagColor(tag, settings.colorblind) }]} accessibilityLabel={T.tag(tag)}>
          {tagText(tag)}
        </Text>
      )}
    </View>
  );
}

function suitName(suit: Card['suit']) {
  return T.suits[suit];
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
  // Rank in the corner so it stays readable when cards are stacked.
  xs: { alignItems: 'flex-start', justifyContent: 'flex-start', paddingHorizontal: 3, paddingTop: 1 },
  back: { backgroundColor: colors.cardBack, padding: 4 },
  backInner: { flex: 1, alignSelf: 'stretch', borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  corner: { position: 'absolute', top: 3, left: 5, fontWeight: '700' },
  center: { lineHeight: undefined },
  rank: { position: 'absolute', bottom: 2, right: 5, fontWeight: '700', transform: [{ rotate: '180deg' }] },
  tag: { marginTop: 4, fontWeight: '700', fontSize: 14 },
});
