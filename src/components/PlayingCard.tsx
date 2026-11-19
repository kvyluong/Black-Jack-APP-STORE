import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, isRed } from '../engine/cards';
import { CountingSystem, cardTag } from '../engine/counting';
import { localized } from '../i18n/lang';
import { useLang, usePrefs } from '../state/settings';
import { colors, radius, tagColor, tagText } from '../theme';

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Shows the card's count tag beneath it (used in lessons and drills). */
  showTag?: boolean;
  /** Which system's tag to show; defaults to the player's chosen counting system. */
  tagSystem?: CountingSystem;
  /** Another card lies over its right edge: drop the bottom corner index, which would peek out. */
  tucked?: boolean;
}

const NUM_EN: Record<number, string> = { 1: 'one', 2: 'two' };
const NUM_ES: Record<number, string> = { 1: 'uno', 2: 'dos' };

const T = localized({
  en: {
    card: (rank: string, suit: string) => `${rank} of ${suit}`,
    suits: { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' } as Record<Card['suit'], string>,
    tag: (tag: number) => `count ${tag === 0 ? 'zero' : `${tag > 0 ? 'plus' : 'minus'} ${NUM_EN[Math.abs(tag)] ?? Math.abs(tag)}`}`,
  },
  es: {
    card: (rank: string, suit: string) => `${rank} de ${suit}`,
    suits: { '♠': 'picas', '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' },
    tag: (tag: number) => `conteo ${tag === 0 ? 'cero' : `${tag > 0 ? 'más' : 'menos'} ${NUM_ES[Math.abs(tag)] ?? Math.abs(tag)}`}`,
  },
});

const SIZES = {
  xs: { w: 30, h: 42, f: 12, r: 4 },
  sm: { w: 44, h: 64, f: 16, r: 5 },
  md: { w: 60, h: 88, f: 22, r: 7 },
  lg: { w: 96, h: 140, f: 36, r: 10 },
};

/** Memoized: cards re-render only when what they show changes, not on every chip or stat update. */
export const PlayingCard = memo(function PlayingCard({ card, faceDown, size = 'md', showTag, tagSystem, tucked }: Props) {
  useLang(); // the screen-reader name ("K of spades") follows the language
  const s = SIZES[size];
  if (faceDown || !card) {
    return (
      <View style={[styles.card, styles.back, { width: s.w, height: s.h, borderRadius: s.r }]}>
        <View style={[styles.backInner, { borderRadius: Math.max(2, s.r - 3) }]}>
          {size !== 'xs' && <Text style={[styles.backMark, { fontSize: s.f * 0.9 }]}>♠</Text>}
        </View>
      </View>
    );
  }
  const color = isRed(card) ? colors.red : colors.black;
  const tagLabel = showTag ? <CardTag card={card} tiny={size === 'xs'} system={tagSystem} /> : null;
  if (size === 'xs') {
    // Tiny cards for other players' seats: just rank over suit.
    const tiny = (
      <View
        style={[styles.card, styles.xs, { width: s.w, height: s.h, borderRadius: s.r }]}
        accessible
        accessibilityLabel={T.card(card.rank, suitName(card.suit))}
      >
        {/* Rank and a small suit on one line: in a seat's stack only the top strip of a card
            shows, and a suit on its own line would peek out as a sliver beside the next card. */}
        <View style={styles.xsIndex}>
          <Text style={{ color, fontSize: s.f, fontWeight: '800', lineHeight: s.f + 1 }}>{card.rank}</Text>
          <Text style={{ color, fontSize: s.f * 0.7, lineHeight: s.f + 1 }}>{card.suit}</Text>
        </View>
        <Text style={[styles.xsPip, { color, fontSize: s.f }]}>{card.suit}</Text>
      </View>
    );
    return tagLabel ? (
      <View style={{ alignItems: 'center' }}>
        {tiny}
        {tagLabel}
      </View>
    ) : (
      tiny
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[styles.card, { width: s.w, height: s.h, borderRadius: s.r }]}
        accessible
        accessibilityLabel={T.card(card.rank, suitName(card.suit))}
      >
        {/* A corner index (rank over suit) at both corners, like a real deck, so a tucked card still reads. */}
        <View style={[styles.index, { top: s.f * 0.12, left: s.f * 0.2 }]}>
          <Text style={[styles.indexRank, { color, fontSize: s.f * 0.72, lineHeight: s.f * 0.8 }]}>{card.rank}</Text>
          <Text style={{ color, fontSize: s.f * 0.5, lineHeight: s.f * 0.6 }}>{card.suit}</Text>
        </View>
        <Text style={[styles.center, { color, fontSize: s.f * 1.35 }]}>{card.suit}</Text>
        {!tucked && (
          <View style={[styles.index, styles.flipped, { bottom: s.f * 0.12, right: s.f * 0.2 }]}>
            <Text style={[styles.indexRank, { color, fontSize: s.f * 0.72, lineHeight: s.f * 0.8 }]}>{card.rank}</Text>
            <Text style={{ color, fontSize: s.f * 0.5, lineHeight: s.f * 0.6 }}>{card.suit}</Text>
          </View>
        )}
      </View>
      {tagLabel}
    </View>
  );
});

/** The count tag under a card; only this part follows the counting-system and color-blind settings. */
function CardTag({ card, tiny, system }: { card: Card; tiny: boolean; system?: CountingSystem }) {
  const { settings } = usePrefs();
  const tag = cardTag(card.rank, system ?? settings.countingSystem);
  return (
    <Text style={[styles.tag, tiny && styles.tagXs, { color: tagColor(tag, settings.colorblind) }]} accessibilityLabel={T.tag(tag)}>
      {tagText(tag)}
    </Text>
  );
}

function suitName(suit: Card['suit']) {
  return T.suits[suit];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    // A darker bottom edge instead of a drop shadow: real shadows on cards that move are drawn
    // off-screen on every frame on iOS (and add a render layer per card on Android).
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.28)',
  },
  // Rank in the corner so it stays readable when cards are stacked.
  xs: { alignItems: 'flex-start', justifyContent: 'flex-start', paddingHorizontal: 3, paddingTop: 0 },
  xsIndex: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  // The big suit sits mid-card, where the next card in a stack covers it completely.
  xsPip: { alignSelf: 'center', marginTop: 2 },
  back: { backgroundColor: colors.cardBack, padding: 3, borderColor: 'rgba(255,255,255,0.9)', borderWidth: 2 },
  backInner: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.55)',
    backgroundColor: colors.cardBackDark,
  },
  backMark: { color: colors.gold, opacity: 0.8 },
  index: { position: 'absolute', alignItems: 'center' },
  indexRank: { fontWeight: '800', letterSpacing: -0.5 },
  flipped: { transform: [{ rotate: '180deg' }] },
  center: { lineHeight: undefined },
  tag: { marginTop: 4, fontWeight: '700', fontSize: 14 },
  tagXs: { fontSize: 10, marginTop: 2 },
});
