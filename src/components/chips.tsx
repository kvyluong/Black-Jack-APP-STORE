import { StyleSheet, Text, View } from 'react-native';

import { levelInfo } from '../engine/progression';
import { localized } from '../i18n/lang';
import { colors } from '../theme';

const T = localized({
  en: { level: 'Lv' },
  es: { level: 'Nv' },
});

/** Level, title and progress toward the next level. */
export function LevelBar({ xp, compact }: { xp: number; compact?: boolean }) {
  const { level, title, into, span } = levelInfo(xp);
  return (
    <View style={{ gap: 3 }}>
      <View style={styles.levelRow}>
        <Text style={[styles.level, compact && { fontSize: 12 }]}>
          {T.level} {level} · {title}
        </Text>
        {!compact && (
          <Text style={styles.xp}>
            {into}/{span} XP
          </Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, (into / span) * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  inner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontWeight: '900', fontSize: 13 },
  stack: { width: 30, alignSelf: 'center' },
  stackChip: {
    position: 'absolute',
    left: 0,
    width: 30,
    height: 10,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  level: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  xp: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.35)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
});
