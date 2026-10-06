// First-launch walkthrough: two scripted hands (stand, then hit), then a
// first look at the running count.
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { playSound } from '../audio/sounds';
import { HandView } from '../components/HandView';
import { FanfareOverlay } from '../components/juice';
import { PlayingCard } from '../components/PlayingCard';
import { Button, H1, P, Panel, Screen } from '../components/ui';
import { useDealAnimation } from '../components/useDealAnimation';
import { Card } from '../engine/cards';
import { hiLoValue } from '../engine/counting';
import { cardDelay } from '../engine/dealSchedule';
import { GameState, act, startRound } from '../engine/game';
import { STARTING_CHIPS, formatChips } from '../engine/progression';
import { ACTION_LABEL, Action } from '../engine/strategy';
import { TUTORIAL, TUTORIAL_BET, tutorialGame } from '../engine/tutorial';
import { useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const ACTIONS: Action[] = ['hit', 'stand', 'double'];
/** Practice chips for the walkthrough; your real stack isn't touched. */
const PRACTICE_CHIPS = 100;

type Stage = { kind: 'intro' } | { kind: 'hand'; index: number } | { kind: 'finish' };

export default function Welcome() {
  const { settings, updateStats } = useSettings();
  const anim = useDealAnimation();
  const { schedule, settled, fanfare, reduceMotion } = anim;
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [game, setGame] = useState<GameState | null>(null);
  const [step, setStep] = useState(0);
  // Every card seen in the two hands, for the count teaser at the end.
  const [seen, setSeen] = useState<Card[]>([]);

  const finish = (to?: Parameters<typeof router.replace>[0]) => {
    updateStats((s) => ({ ...s, onboarded: true }));
    router.replace(to ?? '/');
  };

  /** Same deal animation, sounds and haptics as the real table. */
  const commit = (prev: GameState, next: GameState) => {
    setGame(next);
    anim.play(prev, next, () => {
      if (next.phase === 'roundOver') setSeen((c) => [...c, ...next.hands.flatMap((h) => h.cards), ...next.dealer]);
    });
  };

  const deal = (index: number) => {
    const fresh = tutorialGame(TUTORIAL[index], PRACTICE_CHIPS);
    setStage({ kind: 'hand', index });
    setStep(0);
    commit(fresh, startRound(fresh, TUTORIAL_BET));
  };

  const onAction = (a: Action) => {
    if (!game) return;
    if (settings.soundEffects) playSound('correct');
    setStep((s) => s + 1);
    commit(game, act(game, a));
  };

  const skip = (
    <Text style={styles.skip} onPress={() => finish()} accessibilityRole="button">
      Skip the tour
    </Text>
  );

  if (stage.kind === 'intro') {
    return (
      <Screen ads={false}>
        <Stack.Screen options={{ title: 'Welcome', headerBackVisible: false }} />
        <View style={styles.hero}>
          <Text style={styles.logo}>♠ ♥ 21 ♣ ♦</Text>
          <H1>Welcome to Blackjack Coach</H1>
        </View>
        <Panel>
          <P>Let’s play two quick practice hands together. I’ll tell you exactly what to do and why.</P>
          <P muted>Takes about a minute. Practice chips only: your real stack of ${formatChips(STARTING_CHIPS)} is waiting for you after.</P>
        </Panel>
        <Button title="Let's play" onPress={() => deal(0)} />
        {skip}
      </Screen>
    );
  }

  if (stage.kind === 'finish') {
    const rc = seen.reduce((sum, c) => sum + hiLoValue(c.rank), 0);
    return (
      <Screen ads={false}>
        <Stack.Screen options={{ title: 'Nice playing!', headerBackVisible: false }} />
        <H1>Two hands, two wins</H1>
        <P>You already know the heart of the game: stand when the dealer is likely to bust, hit when you can’t.</P>
        <Panel>
          <Text style={styles.coachTitle}>Your first look at counting</Text>
          <P>
            Card counters give every card a tag: low cards (2–6) are +1, 7–9 are 0, and 10s and Aces are −1. Here are the cards from
            your two hands:
          </P>
          <View style={styles.seen} accessibilityLabel={`Cards seen. Running count ${rc > 0 ? '+' : ''}${rc}`}>
            {seen.map((c, i) => (
              <PlayingCard key={i} card={c} size="sm" showTag />
            ))}
          </View>
          <Text style={styles.rc}>
            Running count: {rc > 0 ? '+' : ''}
            {rc}
          </Text>
          <P muted>
            {rc > 0
              ? 'Positive means more low cards than high ones have gone, so the cards left are rich in 10s and Aces. That favors you, so counters bet more.'
              : 'Negative means lots of 10s and Aces have gone, which is bad news for you. When the count is high, counters bet more.'}{' '}
            The Counting Academy teaches you to keep this count in your head.
          </P>
        </Panel>
        <Button title="Start the lessons" onPress={() => finish('/learn')} />
        <Button title="Go to the casino floor" variant="secondary" onPress={() => finish('/tables')} />
        <Button title="Learn to count" variant="secondary" onPress={() => finish('/academy')} />
        <Text style={styles.skip} onPress={() => finish()} accessibilityRole="button">
          Home
        </Text>
      </Screen>
    );
  }

  const hand = TUTORIAL[stage.index];
  const coachStep = game?.phase === 'playing' ? hand.steps[step] : undefined;
  const over = game?.phase === 'roundOver';
  const last = stage.index === TUTORIAL.length - 1;

  return (
    <Screen ads={false}>
      <Stack.Screen options={{ title: `Practice hand ${stage.index + 1} of ${TUTORIAL.length}`, headerBackVisible: false }} />
      <Text style={styles.coachTitle}>{hand.title}</Text>
      <View style={styles.felt}>
        {game && (
          <>
            <HandView
              cards={game.dealer}
              hideHole={!game.holeRevealed}
              label="Dealer"
              size="sm"
              dealDelay={(i) => cardDelay(schedule, 'dealer', i)}
              flipDelay={schedule?.holeFlipAt ?? 0}
              settling={!settled && game.holeRevealed}
              instant={reduceMotion}
            />
            <HandView
              cards={game.hands[0].cards}
              label="You"
              active={game.phase === 'playing'}
              result={game.hands[0].outcome === 'win' ? 'Win' : `$${TUTORIAL_BET}`}
              dealDelay={(c) => cardDelay(schedule, 0, c)}
              settling={!settled}
              instant={reduceMotion}
            />
          </>
        )}
        <FanfareOverlay fanfare={fanfare} effects={anim.effects} />
      </View>

      {settled && (
        <Panel style={styles.coach}>
          <Text style={styles.coachLabel}>COACH</Text>
          <P>{over ? hand.outro : coachStep?.say ?? hand.intro}</P>
        </Panel>
      )}

      {settled && coachStep && (
        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <Button
              key={a}
              title={ACTION_LABEL[a]}
              variant="secondary"
              disabled={a !== coachStep.action}
              highlighted={a === coachStep.action}
              onPress={() => onAction(a)}
              style={styles.actionButton}
            />
          ))}
        </View>
      )}

      {settled && over && (
        <Button title={last ? 'See what counters see' : 'Next hand'} onPress={() => (last ? setStage({ kind: 'finish' }) : deal(stage.index + 1))} />
      )}
      {skip}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: spacing(2), gap: spacing(1) },
  logo: { color: colors.gold, fontSize: 22, letterSpacing: 4 },
  felt: { backgroundColor: colors.feltDark, borderRadius: 18, padding: spacing(2), gap: spacing(2), alignItems: 'center', minHeight: 260 },
  coach: { borderLeftWidth: 4, borderLeftColor: colors.gold },
  coachLabel: { color: colors.gold, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  coachTitle: { color: colors.gold, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing(1), justifyContent: 'center' },
  actionButton: { minWidth: 96, flexGrow: 1 },
  skip: { color: colors.muted, textAlign: 'center', textDecorationLine: 'underline', marginTop: spacing(1) },
  seen: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  rc: { color: colors.gold, fontSize: 22, fontWeight: '900', textAlign: 'center' },
});
