// One icon set for the whole app: SF Symbols on iPhone and iPad, Material Symbols on
// Android and the web (bundled with the app, nothing loads from the internet). Replaces
// the emoji the app used as icons, which drew in each platform's own colorful style.
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { ColorValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme';

const SYMBOLS = {
  home: { ios: 'house.fill', android: 'home' },
  practice: { ios: 'target', android: 'target' },
  me: { ios: 'person.fill', android: 'person' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  lessons: { ios: 'book.closed.fill', android: 'menu_book' },
  tables: { ios: 'suit.spade.fill', android: 'playing_cards' },
  academy: { ios: 'brain.head.profile', android: 'psychology' },
  strategy: { ios: 'checklist', android: 'checklist' },
  count: { ios: 'plus.forwardslash.minus', android: 'exposure_plus_1' },
  trueCount: { ios: 'divide', android: 'calculate' },
  decks: { ios: 'rectangle.stack.fill', android: 'stacks' },
  deviations: { ios: 'rectangle.on.rectangle.angled', android: 'style' },
  leaks: { ios: 'magnifyingglass', android: 'search' },
  exam: { ios: 'graduationcap.fill', android: 'school' },
  chart: { ios: 'tablecells', android: 'table_chart' },
  simulator: { ios: 'function', android: 'functions' },
  ready: { ios: 'trophy.fill', android: 'trophy' },
  progress: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
  lock: { ios: 'lock.fill', android: 'lock' },
  streak: { ios: 'flame.fill', android: 'local_fire_department' },
  coach: { ios: 'lightbulb.fill', android: 'lightbulb' },
  hand: { ios: 'hand.raised.fill', android: 'back_hand' },
  newPlayer: { ios: 'suit.club.fill', android: 'playing_cards' },
  knowsPlay: { ios: 'suit.spade.fill', android: 'style' },
  counter: { ios: 'brain.head.profile', android: 'psychology' },
} as const;

export type IconName = keyof typeof SYMBOLS;

export function Icon({
  name,
  size = 22,
  color = colors.gold,
  style,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const s = SYMBOLS[name];
  return (
    <SymbolView
      name={{ ios: s.ios as SFSymbol, android: s.android, web: s.android }}
      size={size}
      tintColor={color}
      style={style}
      // Decorative: the text next to every icon already says what it is.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** A list row's icon: the symbol in a round, gold-tinted well, the same size everywhere. */
export function IconWell({ name, dim = false }: { name: IconName; dim?: boolean }) {
  return (
    <View style={[wellStyles.well, dim && { opacity: 0.6 }]}>
      <Icon name={name} size={22} />
    </View>
  );
}

const wellStyles = StyleSheet.create({
  well: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,197,71,0.12)',
  },
});
