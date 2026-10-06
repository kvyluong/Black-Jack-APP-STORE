import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Text } from 'react-native';

import { privacyOptionsRequired, showPrivacyOptions } from '../ads/init';
import { Button, H2, P, Panel, Screen, Segmented, ToggleRow } from '../components/ui';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

export default function SettingsScreen() {
  const { settings, updateSettings, updateStats, updateRules, resetProgress } = useSettings();
  const { rules } = settings;
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    privacyOptionsRequired().then(setShowPrivacy);
  }, []);

  const confirmReset = () =>
    Alert.alert('Reset progress?', 'This clears your stats, levels, unlocked tables, lesson progress and chips. You start again with 1,000 chips.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetProgress },
    ]);

  return (
    <Screen>
      <H2>Coaching</H2>
      <Panel>
        <ToggleRow
          label="Show hints"
          hint="Highlight the best play before you act"
          value={settings.showHints}
          onChange={(v) => updateSettings({ showHints: v })}
        />
        <ToggleRow
          label="Explain mistakes"
          hint="After a wrong play, show the correct one and why"
          value={settings.correctMistakes}
          onChange={(v) => updateSettings({ correctMistakes: v })}
        />
        <ToggleRow
          label="Show the count"
          hint="Display running count, decks left and true count at the table"
          value={settings.showCount}
          onChange={(v) => updateSettings({ showCount: v })}
        />
        <ToggleRow
          label="Count pop quizzes"
          hint="Sometimes ask for the running count between hands"
          value={settings.countQuizzes}
          onChange={(v) => updateSettings({ countQuizzes: v })}
        />
        <ToggleRow
          label="Count-based advice"
          hint="Coach uses Hi-Lo index plays and insurance at +3"
          value={settings.useDeviations}
          onChange={(v) => updateSettings({ useDeviations: v })}
        />
        <ToggleRow
          label="Sound effects"
          hint="Card, chip and win/lose sounds (follows your phone's silent switch)"
          value={settings.soundEffects}
          onChange={(v) => updateSettings({ soundEffects: v })}
        />
        <ToggleRow
          label="Haptics"
          hint="A light tap as your cards land, a buzz when you win"
          value={settings.haptics}
          onChange={(v) => updateSettings({ haptics: v })}
        />
        <ToggleRow
          label="Big effects"
          hint="Screen shake, chip bursts and score pop-ups"
          value={settings.bigEffects}
          onChange={(v) => updateSettings({ bigEffects: v })}
        />
      </Panel>

      <H2>Accessibility</H2>
      <Panel>
        <ToggleRow
          label="Color-blind mode"
          hint="Blue and orange instead of green and red. Count tags always show ▲ ● ▼ too."
          value={settings.colorblind}
          onChange={(v) => updateSettings({ colorblind: v })}
        />
        <Button
          title="Replay the welcome tour"
          variant="secondary"
          onPress={() => {
            updateStats((s) => ({ ...s, onboarded: false }));
            router.push('/welcome');
          }}
        />
      </Panel>

      <H2>The table</H2>
      <Panel>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Hands you play</Text>
        <Segmented
          options={[
            { label: '1 hand', value: 1 },
            { label: '2 hands', value: 2 },
          ]}
          value={settings.yourHands}
          onChange={(v) => updateSettings({ yourHands: v })}
        />
        <ToggleRow
          label="Other players"
          hint="Players sit down and leave like a real casino table. Their cards count too."
          value={settings.otherPlayers}
          onChange={(v) => updateSettings({ otherPlayers: v })}
        />
      </Panel>

      <H2>Table rules</H2>
      <Panel>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Decks</Text>
        <Segmented
          options={[1, 2, 6, 8].map((d) => ({ label: String(d), value: d }))}
          value={rules.decks}
          onChange={(d) => updateRules({ decks: d })}
        />
        <Text style={{ color: colors.text, fontWeight: '600' }}>Blackjack pays</Text>
        <Segmented
          options={[
            { label: '3:2', value: 1.5 },
            { label: '6:5', value: 1.2 },
          ]}
          value={rules.blackjackPayout}
          onChange={(v) => updateRules({ blackjackPayout: v })}
        />
        <ToggleRow label="Dealer hits soft 17" value={rules.dealerHitsSoft17} onChange={(v) => updateRules({ dealerHitsSoft17: v })} />
        <ToggleRow label="Double after split" value={rules.doubleAfterSplit} onChange={(v) => updateRules({ doubleAfterSplit: v })} />
        <ToggleRow label="Late surrender" value={rules.lateSurrender} onChange={(v) => updateRules({ lateSurrender: v })} />
        <P muted style={{ fontSize: 13 }}>
          The strategy chart and coach are tuned for multi-deck games. Changing rules starts a new shoe.
        </P>
      </Panel>

      <H2>Data</H2>
      <Panel>
        {showPrivacy && <Button title="Ad privacy choices" variant="secondary" onPress={showPrivacyOptions} />}
        <Button title="Reset progress and chips" variant="danger" onPress={confirmReset} />
      </Panel>

      <H2>About</H2>
      <P muted>
        Blackjack Coach is a training tool for entertainment and education. It uses play money only and offers no real-money
        gambling or prizes. Card counting is legal, but casinos may refuse service to players they suspect of counting. If
        gambling stops being fun, get help: in the US call 1-800-GAMBLER.
      </P>
    </Screen>
  );
}
