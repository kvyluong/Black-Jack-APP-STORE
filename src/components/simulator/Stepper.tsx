// A labelled −/+ control that steps through a list of values (no keyboard needed).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { localized } from '../../i18n/lang';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: { less: (label: string) => `Lower ${label}`, more: (label: string) => `Raise ${label}` },
  es: { less: (label: string) => `Bajar ${label}`, more: (label: string) => `Subir ${label}` },
});

/** Steps `value` through `values` (sorted ascending); an off-list value snaps to its neighbor. */
export function Stepper({
  label,
  value,
  values,
  format = String,
  onChange,
}: {
  label: string;
  value: number;
  values: number[];
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const lower = [...values].reverse().find((v) => v < value);
  const higher = values.find((v) => v > value);
  return (
    <View style={styles.row} accessible={false}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <StepButton text="−" a11y={T.less(label)} disabled={lower === undefined} onPress={() => lower !== undefined && onChange(lower)} />
        <Text style={styles.value} accessibilityLiveRegion="polite" accessibilityLabel={`${label}: ${format(value)}`}>
          {format(value)}
        </Text>
        <StepButton text="+" a11y={T.more(label)} disabled={higher === undefined} onPress={() => higher !== undefined && onChange(higher)} />
      </View>
    </View>
  );
}

function StepButton({ text, a11y, disabled, onPress }: { text: string; a11y: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, disabled && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(0.5), gap: spacing(1) },
  label: { color: colors.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.feltLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  value: { color: colors.gold, fontSize: 17, fontWeight: '800', minWidth: 86, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
