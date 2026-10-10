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
import { cardTag } from '../engine/counting';
import { cardDelay } from '../engine/dealSchedule';
import { GameState, act, startRound } from '../engine/game';
import { STARTING_CHIPS, formatChips } from '../engine/progression';
import { ACTION_LABEL, Action } from '../engine/strategy';
import { TUTORIAL, TUTORIAL_BET, tutorialGame } from '../engine/tutorial';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const T = localized({
  en: {
    skip: 'Skip the tour',
    welcome: 'Welcome',
    welcomeTitle: 'Welcome to ShoeSharp',
    introBody: 'Let’s play two quick practice hands together. I’ll tell you exactly what to do and why.',
    introNote: (chips: string) => `Takes about a minute. Practice chips only: your real stack of $${chips} is waiting for you after.`,
    letsPlay: 'Let’s play',
    experienced: 'I already know how to play',
    experiencedHint: 'Skips the tour and opens every feature now.',
    nicePlaying: 'Nice playing!',
    twoWins: 'Two hands, two wins',
    heart: 'You already know the heart of the game: stand when the dealer is likely to bust, hit when you can’t.',
    firstLook: 'Your first look at counting',
    tags: 'Card counters give every card a tag. In Hi-Lo, the most popular count, low cards (2–6) are +1, 7–9 are 0, and 10s and Aces are −1. Here are the cards from your two hands:',
    seenA11y: (rc: string) => `Cards seen. Running count ${rc}`,
    runningCount: 'Running count:',
    positive:
      'Positive means more low cards than high ones have gone, so the cards left are rich in 10s and Aces. That favors you, so counters bet more.',
    negative: 'Negative means lots of 10s and Aces have gone, which is bad news for you. When the count is high, counters bet more.',
    academyNote: 'The Counting Academy teaches you to keep this count in your head.',
    startLessons: 'Start the lessons',
    goFloor: 'Go to the casino floor',
    learnCount: 'Learn to count',
    home: 'Home',
    practiceHand: (n: number, of: number) => `Practice hand ${n} of ${of}`,
    dealer: 'Dealer',
    you: 'You',
    win: 'Win',
    coach: 'COACH',
    seeCounters: 'See what counters see',
    nextHand: 'Next hand',
  },
  es: {
    skip: 'Saltar el tour',
    welcome: 'Bienvenida',
    welcomeTitle: 'Bienvenido a ShoeSharp',
    introBody: 'Juguemos juntos dos manos rápidas de práctica. Te diré exactamente qué hacer y por qué.',
    introNote: (chips: string) => `Toma como un minuto. Solo fichas de práctica: tu pila real de $${chips} te espera después.`,
    letsPlay: '¡A jugar!',
    experienced: 'Ya sé jugar',
    experiencedHint: 'Salta el tour y abre todas las funciones desde ya.',
    nicePlaying: '¡Bien jugado!',
    twoWins: 'Dos manos, dos victorias',
    heart: 'Ya conoces lo esencial del juego: plántate cuando el crupier probablemente se pase y pide cuando no.',
    firstLook: 'Tu primer vistazo al conteo',
    tags: 'Quienes cuentan cartas le dan a cada carta una etiqueta. En Hi-Lo, el conteo más popular, las bajas (2–6) son +1, del 7 al 9 son 0, y los 10 y los ases son −1. Estas son las cartas de tus dos manos:',
    seenA11y: (rc: string) => `Cartas vistas. Conteo continuo ${rc}`,
    runningCount: 'Conteo continuo:',
    positive:
      'Positivo significa que han salido más cartas bajas que altas, así que las que quedan están cargadas de 10 y ases. Eso te favorece, por eso los contadores apuestan más.',
    negative: 'Negativo significa que han salido muchos 10 y ases, lo cual es malo para ti. Cuando el conteo es alto, los contadores apuestan más.',
    academyNote: 'La Academia de conteo te enseña a llevar este conteo de memoria.',
    startLessons: 'Empezar las lecciones',
    goFloor: 'Ir a la sala del casino',
    learnCount: 'Aprender a contar',
    home: 'Inicio',
    practiceHand: (n: number, of: number) => `Mano de práctica ${n} de ${of}`,
    dealer: 'Crupier',
    you: 'Tú',
    win: 'Gana',
    coach: 'COACH',
    seeCounters: 'Mira lo que ven los contadores',
    nextHand: 'Siguiente mano',
  },
});

const ACTIONS: Action[] = ['hit', 'stand', 'double'];
/** Practice chips for the walkthrough; your real stack isn't touched. */
const PRACTICE_CHIPS = 100;

type Stage = { kind: 'intro' } | { kind: 'hand'; index: number } | { kind: 'finish' };

export default function Welcome() {
  const { updateSettings, settings, updateStats } = useSettings();
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
      {T.skip}
    </Text>
  );

  if (stage.kind === 'intro') {
    return (
      <Screen ads={false}>
        <Stack.Screen options={{ title: T.welcome, headerBackVisible: false }} />
        <View style={styles.hero}>
          <Text style={styles.logo}>♠ ♥ 21 ♣ ♦</Text>
          <H1>{T.welcomeTitle}</H1>
        </View>
        <Panel>
          <P>{T.introBody}</P>
          <P muted>{T.introNote(formatChips(STARTING_CHIPS))}</P>
        </Panel>
        <Button title={T.letsPlay} onPress={() => deal(0)} />
        <Button
          title={T.experienced}
          variant="ghost"
          onPress={() => {
            updateSettings({ experienced: true });
            finish();
          }}
        />
        <Text style={styles.experiencedHint}>{T.experiencedHint}</Text>
        {skip}
      </Screen>
    );
  }

  if (stage.kind === 'finish') {
    const rc = seen.reduce((sum, c) => sum + cardTag(c.rank, 'hiLo'), 0);
    return (
      <Screen ads={false}>
        <Stack.Screen options={{ title: T.nicePlaying, headerBackVisible: false }} />
        <H1>{T.twoWins}</H1>
        <P>{T.heart}</P>
        <Panel>
          <Text style={styles.coachTitle}>{T.firstLook}</Text>
          <P>{T.tags}</P>
          <View style={styles.seen} accessibilityLabel={T.seenA11y(`${rc > 0 ? '+' : ''}${rc}`)}>
            {seen.map((c, i) => (
              <PlayingCard key={i} card={c} size="sm" showTag tagSystem="hiLo" />
            ))}
          </View>
          <Text style={styles.rc}>
            {T.runningCount} {rc > 0 ? '+' : ''}
            {rc}
          </Text>
          <P muted>
            {rc > 0 ? T.positive : T.negative} {T.academyNote}
          </P>
        </Panel>
        <Button title={T.startLessons} onPress={() => finish('/learn')} />
        <Button title={T.goFloor} variant="secondary" onPress={() => finish('/tables')} />
        <Button title={T.learnCount} variant="secondary" onPress={() => finish('/academy')} />
        <Text style={styles.skip} onPress={() => finish()} accessibilityRole="button">
          {T.home}
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
      <Stack.Screen options={{ title: T.practiceHand(stage.index + 1, TUTORIAL.length), headerBackVisible: false }} />
      <Text style={styles.coachTitle}>{hand.title}</Text>
      <View style={styles.felt}>
        {game && (
          <>
            <HandView
              cards={game.dealer}
              hideHole={!game.holeRevealed}
              label={T.dealer}
              size="sm"
              dealDelay={(i) => cardDelay(schedule, 'dealer', i)}
              flipDelay={schedule?.holeFlipAt ?? 0}
              settling={!settled && game.holeRevealed}
              instant={reduceMotion}
            />
            <HandView
              cards={game.hands[0].cards}
              label={T.you}
              active={game.phase === 'playing'}
              result={game.hands[0].outcome === 'win' ? T.win : `$${TUTORIAL_BET}`}
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
          <Text style={styles.coachLabel}>{T.coach}</Text>
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
        <Button title={last ? T.seeCounters : T.nextHand} onPress={() => (last ? setStage({ kind: 'finish' }) : deal(stage.index + 1))} />
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
  experiencedHint: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: -4 },
  skip: { color: colors.muted, textAlign: 'center', textDecorationLine: 'underline', marginTop: spacing(1) },
  seen: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  rc: { color: colors.gold, fontSize: 22, fontWeight: '900', textAlign: 'center' },
});
