import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LevelBar } from '../../components/chips';
import { Icon } from '../../components/Icon';
import { P, Panel, Screen } from '../../components/ui';
import { TABLES, isUnlocked, levelInfo } from '../../engine/progression';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, radius, spacing } from '../../theme';

const T = localized({
  en: {
    intro: 'Pick a table to practice at. New rooms unlock as your level rises. Every hand is practice: nothing is bet.',
    yourTable: 'your table',
    reach: (n: number) => `Reach level ${n} to unlock`,
  },
  es: {
    intro: 'Elige una mesa para practicar. Se desbloquean salas nuevas al subir de nivel. Cada mano es práctica: no se apuesta nada.',
    yourTable: 'tu mesa',
    reach: (n: number) => `Llega al nivel ${n} para desbloquear`,
  },
});

/** The practice floor: pick a table. More rooms unlock as your level rises. */
export default function Tables() {
  const { settings, stats, updateSettings } = useSettings();
  const { level, into, span } = levelInfo(stats.xp);

  return (
    <Screen>
      <Panel>
        <LevelBar xp={stats.xp} />
      </Panel>

      <P muted>{T.intro}</P>

      {TABLES.map((t) => {
        const unlocked = isUnlocked(t, level);
        const here = settings.tableId === t.id;
        // Progress toward the unlock level, counting the current level's partial XP.
        const progress = Math.min(1, (level - 1 + into / span) / Math.max(1, t.unlockLevel - 1));
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: !unlocked }}
            disabled={!unlocked}
            onPress={() => {
              updateSettings({ tableId: t.id });
              router.push('/play');
            }}
            style={({ pressed }) => [styles.table, { backgroundColor: t.felt }, !unlocked && styles.locked, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.nameRow}>
                {!unlocked && <Icon name="lock" size={15} color={colors.text} />}
                <Text style={styles.name}>
                  {t.name}
                  {here ? `  · ${T.yourTable}` : ''}
                </Text>
              </View>
              <Text style={styles.blurb}>{t.blurb}</Text>
              {!unlocked && (
                <View style={{ gap: 3, marginTop: 4 }}>
                  <Text style={styles.need}>{T.reach(t.unlockLevel)}</Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${progress * 100}%` }]} />
                  </View>
                </View>
              )}
            </View>
            {unlocked && <Text style={styles.chev}>›</Text>}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  table: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    borderRadius: radius.md,
  },
  locked: { opacity: 0.6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  blurb: { color: colors.muted, fontSize: 13 },
  need: { color: colors.text, fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.4)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold },
  chev: { color: colors.text, fontSize: 28 },
});
