import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../engine/cards';
import { describeHand } from '../engine/hand';
import { colors } from '../theme';
import { PlayingCard } from './PlayingCard';

interface Props {
  cards: Card[];
  label?: string;
  hideHole?: boolean;
  active?: boolean;
  result?: string;
  size?: 'sm' | 'md';
}

export function HandView({ cards, label, hideHole, active, result, size = 'md' }: Props) {
  return (
    <View style={[styles.wrap, active && styles.active]}>
      <View style={styles.row}>
        {cards.map((c, i) => (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : size === 'sm' ? -12 : -16 }}>
            <PlayingCard card={c} faceDown={hideHole && i === 1} size={size} />
          </View>
        ))}
      </View>
      {cards.length > 0 && (
        <Text style={styles.label}>
          {label ? `${label}: ` : ''}
          {hideHole ? `showing ${cards[0].rank}` : describeHand(cards)}
          {result ? ` · ${result}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 6, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: colors.gold },
  row: { flexDirection: 'row' },
  label: { color: colors.text, marginTop: 6, fontWeight: '600' },
});
