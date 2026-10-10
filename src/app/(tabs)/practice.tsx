// Practice: lessons, drills, the final test and tools, grouped. Only what you've
// unlocked is listed; the rest sits behind one "unlocks as you learn" line.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ListedFeature, featureInfo } from '../../components/featureInfo';
import { Screen } from '../../components/ui';
import { useUnlocks } from '../../components/useUnlocks';
import { localized } from '../../i18n/lang';
import { usePrefs } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    learn: 'Learn',
    drill: 'Drill',
    test: 'Test yourself',
    tools: 'Tools',
    new: 'NEW',
    locked: (n: number) => `🔒 ${n} more unlock as you learn`,
    hideLocked: 'Hide',
  },
  es: {
    learn: 'Aprender',
    drill: 'Ejercicios',
    test: 'Ponte a prueba',
    tools: 'Herramientas',
    new: 'NUEVO',
    locked: (n: number) => `🔒 ${n} más se desbloquean mientras aprendes`,
    hideLocked: 'Ocultar',
  },
});

const SECTIONS: { title: () => string; items: ListedFeature[] }[] = [
  { title: () => T.learn, items: ['lessons', 'academy'] },
  { title: () => T.drill, items: ['strategyDrill', 'leaks', 'countDrill', 'trueCountDrill', 'decksDrill', 'deviations'] },
  { title: () => T.test, items: ['exam'] },
  { title: () => T.tools, items: ['chart', 'simulator'] },
];

export default function Practice() {
  usePrefs(); // re-render on language change
  const unlocks = useUnlocks();
  const [showLocked, setShowLocked] = useState(false);
  const locked = SECTIONS.flatMap((s) => s.items).filter((f) => !unlocks.has(f));

  const open = (f: ListedFeature) => {
    unlocks.markSeen(f);
    router.push(featureInfo(f).href);
  };

  return (
    <Screen>
      {SECTIONS.map((section) => {
        const items = section.items.filter((f) => unlocks.has(f));
        if (!items.length) return null;
        return (
          <View key={section.items[0]} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              {section.title()}
            </Text>
            {items.map((f) => (
              <Item key={f} feature={f} isNew={unlocks.isNew(f)} onPress={() => open(f)} />
            ))}
          </View>
        );
      })}

      {locked.length > 0 && (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedToggle} onPress={() => setShowLocked(!showLocked)} accessibilityRole="button">
            {showLocked ? T.hideLocked : T.locked(locked.length)}
          </Text>
          {showLocked &&
            locked.map((f) => (
              <View key={f} style={styles.lockedRow}>
                <Text style={styles.lockedIcon}>{featureInfo(f).icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedTitle}>{featureInfo(f).title}</Text>
                  <Text style={styles.lockedHint}>{unlocks.hint(f)}</Text>
                </View>
              </View>
            ))}
        </View>
      )}
    </Screen>
  );
}

function Item({ feature, isNew, onPress }: { feature: ListedFeature; isNew: boolean; onPress: () => void }) {
  const info = featureInfo(feature);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${info.title}${isNew ? `, ${T.new}` : ''}. ${info.body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.icon}>{info.icon}</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{info.title}</Text>
          {isNew && <Text style={styles.badge}>{T.new}</Text>}
        </View>
        <Text style={styles.body}>{info.body}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing(1) },
  heading: { color: colors.gold, fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: spacing(1) },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), backgroundColor: colors.feltDark, padding: spacing(1.75), borderRadius: radius.md },
  icon: { fontSize: 26 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  badge: { color: colors.black, backgroundColor: colors.gold, fontSize: 11, fontWeight: '900', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  body: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chev: { color: colors.muted, fontSize: 26 },
  lockedBox: { marginTop: spacing(1), gap: spacing(1) },
  lockedToggle: { color: colors.muted, textAlign: 'center', paddingVertical: spacing(1), textDecorationLine: 'underline' },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), opacity: 0.6, paddingHorizontal: spacing(1) },
  lockedIcon: { fontSize: 22 },
  lockedTitle: { color: colors.text, fontWeight: '700' },
  lockedHint: { color: colors.muted, fontSize: 13 },
});
