import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../ads/AdBanner';
import { colors, radius, spacing } from '../theme';

export function Screen({ children, scroll = true, ads = true }: { children: ReactNode; scroll?: boolean; ads?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
      {ads && <AdBanner />}
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  highlighted,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Draws a gold ring, used by the coach to point at the right play. */
  highlighted?: boolean;
  style?: ViewStyle;
  /** What screen readers say, when the title alone (e.g. "−") isn't enough. */
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        highlighted && styles.highlighted,
        disabled && styles.disabled,
        pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] },
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'primary' && { color: colors.black }]}>{title}</Text>
    </Pressable>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.p, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing(2) }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.gold }} accessibilityLabel={label} />
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[styles.segment, o.value === value && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, o.value === value && { color: colors.black }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.felt },
  content: { padding: spacing(2), gap: spacing(1.5) },
  button: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: colors.gold },
  secondary: { backgroundColor: colors.feltLight },
  ghost: { backgroundColor: 'transparent', borderColor: colors.muted },
  danger: { backgroundColor: '#7A1F2B' },
  highlighted: { borderColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 8, elevation: 8 },
  disabled: { opacity: 0.35 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  h2: { color: colors.gold, fontSize: 20, fontWeight: '700', marginTop: spacing(1) },
  p: { color: colors.text, fontSize: 16, lineHeight: 23 },
  panel: { backgroundColor: colors.panel, borderRadius: radius.md, padding: spacing(2), gap: spacing(1) },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1) },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  segmented: { flexDirection: 'row', backgroundColor: colors.feltDark, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing(1), alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.gold },
  segmentText: { color: colors.text, fontWeight: '600' },
});
