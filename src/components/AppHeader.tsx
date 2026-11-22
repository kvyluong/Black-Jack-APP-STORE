/**
 * The app's own top bar, used instead of the system header (whose iOS back button is a grey pill).
 * A round chevron button in the app's colours on the left, a bold title in the middle, and an
 * optional right-hand slot. The swipe-back gesture still works: it belongs to the native stack.
 */
import type { NativeStackHeaderProps } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../i18n/lang';
import { colors } from '../theme';

const BAR = 52;
const BTN = 40;

export function AppHeader({ navigation, options, back, route }: NativeStackHeaderProps) {
  const top = useSafeAreaInsets().top;
  const title = typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? route.name;
  const right = options.headerRight?.({ canGoBack: !!back, tintColor: colors.text });
  return (
    <View style={[s.bar, { paddingTop: top, height: top + BAR }]}>
      <View style={s.side}>
        {options.headerLeft ? options.headerLeft({ canGoBack: !!back, tintColor: colors.text }) : back && options.headerBackVisible !== false && (
          <Pressable
            onPress={() => { navigation.goBack(); }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={tr('Back', 'Atrás')}
            style={({ pressed }) => [s.back, pressed && s.pressed]}
          >
            {Platform.OS === 'ios' ? (
              <SymbolView name="chevron.left" size={17} weight="bold" tintColor={colors.text} />
            ) : (
              <Text style={s.chevron}>‹</Text>
            )}
          </Pressable>
        )}
      </View>
      <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      <View style={[s.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: colors.feltDark },
  side: { width: 64, justifyContent: 'center' },
  back: {
    width: BTN, height: BTN, borderRadius: BTN / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(232,197,71,0.45)',
  },
  pressed: { transform: [{ scale: 0.92 }], backgroundColor: 'rgba(0,0,0,0.45)' },
  chevron: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: -3, marginLeft: -2 },
  title: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
});
