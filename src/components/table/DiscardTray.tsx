// A casino discard tray: the stack grows as cards are played, so you can read
// how much of the shoe is gone (and how many decks are left) by eye.
import { StyleSheet, Text, View } from 'react-native';

import { CARDS_PER_DECK } from '../../engine/decks';
import { localized } from '../../i18n/lang';
import { colors } from '../../theme';

const T = localized({
  en: {
    tray: 'Discard tray',
    a11y: (pct: number, decks: number) => `Discard tray for a ${decks}-deck shoe, about ${pct}% full`,
    oneDeck: '1 deck',
  },
  es: {
    tray: 'Bandeja de descartes',
    a11y: (pct: number, decks: number) => `Bandeja de descartes de un zapato de ${decks} barajas, llena en un ${pct}% aprox.`,
    oneDeck: '1 baraja',
  },
});

/** Card edges drawn every quarter deck, like the layers you see in a real tray. */
const EDGE_EVERY = 13;

interface Props {
  /** Cards in the tray. */
  cards: number;
  /** Decks in the shoe; the tray is tall enough for all of them. */
  decks: number;
  /** Stack height for one deck, in px. */
  deckPx?: number;
  /** Show a one-deck stack next to the tray for scale (training aid). */
  reference?: boolean;
  /** Show the "Discard tray" caption. */
  caption?: boolean;
}

/** A clear tray with the discards stacked from the bottom, plus an optional one-deck reference stack. */
export function DiscardTray({ cards, decks, deckPx = 16, reference = false, caption = true }: Props) {
  const capacity = decks * CARDS_PER_DECK;
  const height = decks * deckPx;
  const fill = Math.max(0, Math.min(1, cards / capacity));
  const pct = Math.round((fill * 100) / 5) * 5;
  return (
    <View style={styles.wrap} accessible accessibilityRole="image" accessibilityLabel={T.a11y(pct, decks)}>
      <View style={styles.row}>
        <View style={[styles.tray, { height: height + 6 }]}>
          <Stack px={fill * height} cards={cards} />
        </View>
        {reference && (
          <View style={styles.reference}>
            <Stack px={deckPx} cards={CARDS_PER_DECK} />
            <Text style={styles.refText}>{T.oneDeck}</Text>
          </View>
        )}
      </View>
      {caption && <Text style={styles.caption}>{T.tray}</Text>}
    </View>
  );
}

/** A stack of cards seen from the side: a block with faint edge lines. */
function Stack({ px, cards }: { px: number; cards: number }) {
  const edges = Math.floor(cards / EDGE_EVERY);
  return (
    <View style={[styles.stack, { height: px }]}>
      {Array.from({ length: edges }, (_, i) => (
        <View key={i} style={[styles.edge, { bottom: (px * (i + 1)) / Math.max(1, cards / EDGE_EVERY) }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  tray: {
    width: 64,
    justifyContent: 'flex-end',
    padding: 3,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.45)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  stack: { width: '100%', backgroundColor: '#EDE7D9', borderRadius: 2, overflow: 'hidden' },
  edge: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.25)' },
  reference: { width: 40, alignItems: 'center', gap: 2 },
  refText: { color: colors.muted, fontSize: 10 },
  caption: { color: colors.muted, fontSize: 11 },
});
