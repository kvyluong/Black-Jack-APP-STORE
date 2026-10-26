import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { localized } from '../../i18n/lang';
import { usePrefs } from '../../state/settings';
import { colors } from '../../theme';
import { Button, Panel, Segmented } from '../ui';

const T = localized({
  en: {
    one: 'Play 1 hand',
    two: 'Play 2 hands',
    deal: 'Deal',
    changeTable: 'Change table',
  },
  es: {
    one: 'Jugar 1 mano',
    two: 'Jugar 2 manos',
    deal: 'Repartir',
    changeTable: 'Cambiar de mesa',
  },
});

interface Props {
  onDeal: () => void;
  /** The table lobby link (off in the casino-conditions test). */
  extras?: boolean;
}

/** Between hands: play 1 or 2 hands, then Deal. Hands are practice only: nothing is bet. */
export function BettingPanel({ extras = true, onDeal }: Props) {
  const { settings, updateSettings } = usePrefs();
  return (
    <Panel>
      {/* Like playing a second spot at a real table: choose before each deal. */}
      <Segmented
        options={[
          { label: T.one, value: 1 },
          { label: T.two, value: 2 },
        ]}
        value={settings.yourHands}
        onChange={(v) => updateSettings({ yourHands: v })}
      />
      <Button title={T.deal} onPress={onDeal} />
      {extras && (
        <Text style={styles.lobby} onPress={() => router.navigate('/tables')} accessibilityRole="link">
          {T.changeTable}
        </Text>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  lobby: { color: colors.gold, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
});
