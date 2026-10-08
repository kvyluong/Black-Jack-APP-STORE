// A thin progress bar (0–1) on a darker track of the felt.
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../../theme';

export function Meter({ value, color = colors.gold, height = 8 }: { value: number; color?: string; height?: number }) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]} importantForAccessibility="no-hide-descendants">
      {p > 0 && <View style={[styles.fill, { width: `${Math.max(p * 100, 3)}%`, backgroundColor: color, borderRadius: height / 2 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.feltDark, overflow: 'hidden', borderRadius: radius.sm },
  fill: { height: '100%' },
});
