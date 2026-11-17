// Practice: lessons, drills, the final test and tools, grouped. Only what you've
// unlocked is listed; the rest sits behind one "unlocks as you learn" line.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ListedFeature, featureInfo } from '../../components/featureInfo';
import { IconWell } from '../../components/Icon';
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
    locked: (n: number) => `${n} more unlock as you learn`,
    hideLocked: 'Hide',
  },
  es: {
    learn: 'Aprender',
    drill: 'Ejercicios',
    test: 'Ponte a prueba',
    tools: 'Herramientas',
    new: 'NUEVO',
    locked: (n: number) => `${n} más se desbloquean mientras aprendes`,
    hideLocked: 'Ocultar',
  },
});

// Each section has its own accent so the list scans at a glance.
const SECTIONS: { title: () => string; tint: string; items: ListedFeature[] }[] = [
  { title: () => T.learn, tint: '#8DB8F2', items: ['lessons', 'academy'] },
  { title: () => T.drill, tint: colors.gold, items: ['strategyDrill', 'leaks', 'countDrill', 'trueCountDrill', 'decksDrill', 'deviations'] },
  { title: () => T.test, tint: '#F2948A', items: ['exam'] },
  { title: () => T.tools, tint: '#7FD8A6', items: ['chart'] },
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
            <View style={styles.headingRow}>
              <View style={[styles.headingDot, { backgroundColor: section.tint }]} />
              <Text style={styles.heading} accessibilityRole="header">
                {section.title()}
              </Text>
            </View>
            {/* One grouped card per section, rows split by hairlines. */}
            <View style={styles.group}>
              {items.map((f, i) => (
                <Item key={f} feature={f} tint={section.tint} first={i === 0} isNew={unlocks.isNew(f)} onPress={() => open(f)} />
              ))}
            </View>
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
                <IconWell name={featureInfo(f).icon} dim />
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

function Item({
  feature,
  tint,
  first,
  isNew,
  onPress,
}: {
  feature: ListedFeature;
  tint: string;
  first: boolean;
  isNew: boolean;
  onPress: () => void;
}) {
  const info = featureInfo(feature);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${info.title}${isNew ? `, ${T.new}` : ''}. ${info.body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.item, !first && styles.divider, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
    >
      <IconWell name={info.icon} tint={tint} />
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
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginTop: spacing(1), paddingLeft: spacing(0.5) },
  headingDot: { width: 7, height: 7, borderRadius: 4 },
  heading: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  group: {
    backgroundColor: colors.feltDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), paddingVertical: spacing(1.75), paddingHorizontal: spacing(2) },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  badge: { color: colors.black, backgroundColor: colors.gold, fontSize: 11, fontWeight: '900', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  body: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chev: { color: 'rgba(183,201,190,0.6)', fontSize: 26 },
  lockedBox: { marginTop: spacing(1), gap: spacing(1) },
  lockedToggle: { color: colors.muted, textAlign: 'center', paddingVertical: spacing(1), textDecorationLine: 'underline' },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), opacity: 0.6, paddingHorizontal: spacing(1) },
  lockedTitle: { color: colors.text, fontWeight: '700' },
  lockedHint: { color: colors.muted, fontSize: 13 },
});
