// The casino table, shared by the practice table (/play) and the Casino
// Conditions test (/exam). In 'exam' mode there are no hints, no count on screen,
// no feedback during play, the dealer deals faster, the other players chat,
// and a discard tray shows the cards played. The exam screen gets every
// decision and the end of the shoe through `exam` callbacks.
// Nothing is bet: every hand is played for practice with a fixed, hidden stake.
import { Stack } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useInterstitial } from '../../ads/useInterstitial';
import { haptic } from '../../audio/haptics';
import { playSound } from '../../audio/sounds';
import { decksRemaining, initialRunningCount, isBalanced, shouldTakeInsurance } from '../../engine/counting';
import { DEAL_STEP_MS, SPEED_FACTOR } from '../../engine/dealSchedule';
import { discardedCards } from '../../engine/decks';
import { chatterLine } from '../../engine/exam';
import {
  GameState,
  act,
  currentTrueCount,
  hiLoTrueCount,
  decisionContext,
  isYours,
  legalActions,
  needsShuffle,
  newGame,
  resolveInsurance,
  shuffleIfNeeded,
  startRound,
} from '../../engine/game';
import { streakPitch } from '../../engine/juice';
import { recordDecision, recordInsurance } from '../../engine/leaks';
import {
  CasinoTable,
  PRACTICE_BUDGET,
  PRACTICE_STAKE,
  getTable,
  levelInfo,
  newlyUnlocked,
  roundXp,
} from '../../engine/progression';
import { ACTION_LABEL, Action, formatTrueCount, recommend } from '../../engine/strategy';
import {
  Table,
  TableEvent,
  betweenRounds,
  createTable,
  findNpc,
  isNpc,
  npcAction,
  roundBets,
  setYourHands,
  settleNpcs,
} from '../../engine/table';
import { localized } from '../../i18n/lang';
import { useSettings } from '../../state/settings';
import { colors, spacing } from '../../theme';
import { LevelBar } from '../chips';
import { useUnlocks } from '../useUnlocks';
import { StreakBadge } from '../juice';
import { Button, Panel, Screen } from '../ui';
import { useOutcomeColors } from '../useColors';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useReviewPrompt } from '../useReviewPrompt';
import { BettingPanel } from './BettingPanel';
import { CountQuiz, Quiz } from './CountQuiz';
import { DiscardTray } from './DiscardTray';
import { HandSignalArea, Signal } from './HandSignalArea';
import { TableFelt } from './TableFelt';
import { ActionBar, InsurancePanel } from './TurnControls';
import { useDealAnimation } from '../useDealAnimation';

const QUIZ_CHANCE = 0.25;
/** How long a computer player "thinks" before acting (quicker under casino conditions). */
const NPC_THINK_MS = { practice: 450, exam: 320 };
/** Time between dealt cards: a busy casino dealer is quicker than the practice table. */
const DEAL_STEP = { practice: DEAL_STEP_MS, exam: Math.round(DEAL_STEP_MS * 0.65) };
/** How often a computer player says something instead of just signaling their play (test only). */
const CHATTER_CHANCE = 0.4;
const KEY_ACTIONS: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };

const T = localized({
  en: {
    level: (n: number, title: string) => `Level ${n}: ${title}`,
    unlocked: (name: string) => `New table unlocked: ${name}`,
    countPlay: '\ncount play',
    book: (a: string) => ` ✗\nbook: ${a}`,
    correct: 'Correct!',
    inARow: (n: number) => `Correct! ${n} in a row`,
    best: (a: string, reason: string) => `Best play: ${a}. ${reason}`,
    takeIns: (tc: string) =>
      `Take insurance: the true count is ${tc} (+3 or more), so over a third of the remaining cards are 10s.`,
    declineIns: 'Decline insurance. It’s the wrong call unless the true count is +3 or higher.',
    takesIns: 'Takes insurance',
    noIns: 'No insurance',
    count: (rc: string, decks: number, tc: string) => `RC ${rc} · Decks ${decks} · TC ${tc}`,
    countRc: (rc: string) => `RC ${rc}`,
    tapCount: 'Tap to check count',
    shuffled: 'New shoe shuffled · count resets to 0',
    shuffledKo: (start: string) => `New shoe shuffled · KO count starts at ${start}`,
    goTo: (name: string) => `Go to ${name}`,
    playing: (name: string) => `${name} is playing…`,
    hintTake: 'Take it (TC +3 or higher)',
    hintDecline: 'Decline',
    won: 'You win',
    blackjack: 'Blackjack! You win',
    lost: 'Dealer wins',
    surrendered: 'You surrendered',
    push: 'Push',
    both: { win: 'All your hands win', lose: 'All your hands lose', push: 'All your hands push' },
    split: (w: number, l: number, p: number) => [w && `${w} won`, l && `${l} lost`, p && `${p} pushed`].filter(Boolean).join(' · '),
    nextHand: 'Next hand',
    hand: (n: number) => `Round ${n}`,
  },
  es: {
    level: (n: number, title: string) => `Nivel ${n}: ${title}`,
    unlocked: (name: string) => `Nueva mesa desbloqueada: ${name}`,
    countPlay: '\njugada por conteo',
    book: (a: string) => ` ✗\nmanual: ${a}`,
    correct: '¡Correcto!',
    inARow: (n: number) => `¡Correcto! ${n} seguidas`,
    best: (a: string, reason: string) => `Mejor jugada: ${a}. ${reason}`,
    takeIns: (tc: string) =>
      `Toma el seguro: el conteo real es ${tc} (+3 o más), así que más de un tercio de las cartas restantes son 10.`,
    declineIns: 'Rechaza el seguro. No conviene, salvo que el conteo real sea +3 o más.',
    takesIns: 'Toma seguro',
    noIns: 'Sin seguro',
    count: (rc: string, decks: number, tc: string) => `CC ${rc} · Barajas ${decks} · CR ${tc}`,
    countRc: (rc: string) => `CC ${rc}`,
    tapCount: 'Toca para ver el conteo',
    shuffled: 'Zapato nuevo barajado · el conteo vuelve a 0',
    shuffledKo: (start: string) => `Zapato nuevo barajado · el conteo KO empieza en ${start}`,
    goTo: (name: string) => `Ir a ${name}`,
    playing: (name: string) => `${name} está jugando…`,
    hintTake: 'Tómalo (CR +3 o más)',
    hintDecline: 'Recházalo',
    won: 'Ganas',
    blackjack: '¡Blackjack! Ganas',
    lost: 'Gana el crupier',
    surrendered: 'Te rendiste',
    push: 'Empate',
    both: { win: 'Ganan todas tus manos', lose: 'Pierden todas tus manos', push: 'Empatan todas tus manos' },
    split: (w: number, l: number, p: number) =>
      [w && `${w} ${w === 1 ? 'ganada' : 'ganadas'}`, l && `${l} ${l === 1 ? 'perdida' : 'perdidas'}`, p && `${p} ${p === 1 ? 'empate' : 'empates'}`]
        .filter(Boolean)
        .join(' · '),
    nextHand: 'Siguiente mano',
    hand: (n: number) => `Ronda ${n}`,
  },
});

export type TableMode = 'practice' | 'exam';

/** What the Casino Conditions test hears from the table. */
export interface ExamHooks {
  /** One of your decisions (plays and insurance), graded silently. */
  onDecision: (ok: boolean) => void;
  /** A round finished with this many hands of yours (split hands included). */
  onRoundEnd: (yourHands: number) => void;
  /** The cut card came out: `final` is the last finished round. */
  onShoeEnd: (final: GameState) => void;
  /** Between rounds, shown instead of the deal panel when it returns something (the decks-left question). */
  gate?: (game: GameState) => ReactNode;
}

type Feedback = { ok: boolean; text: string } | null;

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

/**
 * One shoe at a casino table. The parent should give it a `key` that changes
 * with the table and its rules, so a change starts a fresh shoe.
 */
export function TableScreen({ mode, exam }: { mode: TableMode; exam?: ExamHooks }) {
  const { lang, settings, stats, updateSettings, updateStats } = useSettings();
  const testing = mode === 'exam';
  const { rules, countingSystem } = settings;
  // Under casino conditions you're on your own: no hints, count or corrections.
  const showHints = !testing && settings.showHints;
  const correctMistakes = !testing && settings.correctMistakes;
  // Beginners see just the cards, the coach and the buttons; the count bar,
  // level bar and count quizzes appear with the counting lessons.
  const counting = useUnlocks().has('tableCount');
  const showCount = !testing && counting && settings.showCount;
  const countQuizzes = !testing && counting && settings.countQuizzes;
  // The count plays (DEVIATIONS) are Hi-Lo indices, so they only apply with Hi-Lo.
  // The test always grades them for Hi-Lo counters.
  const countPlays = countingSystem === 'hiLo' && (testing || settings.useDeviations);
  const otherPlayers = testing || settings.otherPlayers;
  const { good, bad } = useOutcomeColors();
  // The table you're sitting at sets the room's look and name.
  const casino = getTable(settings.tableId);
  const [game, setGame] = useState<GameState>(() => newGame(rules, PRACTICE_BUDGET));
  // The last state whose cards have all landed: the count on screen follows this.
  const [countSource, setCountSource] = useState<GameState>(game);
  const [table, setTable] = useState<Table>(() => createTable(settings.yourHands, PRACTICE_STAKE, otherPlayers));
  const [events, setEvents] = useState<TableEvent[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [streak, setStreak] = useState(0);
  const [rounds, setRounds] = useState(0);
  // Level-ups and newly unlocked tables to announce after a round.
  const [milestones, setMilestones] = useState<{ text: string; table?: CasinoTable }[]>([]);
  // Correct decisions this round, for XP.
  const [roundCorrect, setRoundCorrect] = useState(0);
  // No ads on the player's first day (nothing filed into history yet).
  const roundBreak = useInterstitial(!stats.history?.length);
  const askForReview = useReviewPrompt();
  // A stable object: a new one each render would make the navigator update the header on every render.
  const headerOptions = useMemo(() => ({ title: casino.name }), [casino.name]);
  // Settings → Game speed scales the practice table; the casino test keeps its own pace.
  const speed = testing ? 1 : SPEED_FACTOR[settings.gameSpeed ?? 'normal'];
  const anim = useDealAnimation(Math.round(DEAL_STEP[mode] * speed));
  const { settled } = anim;

  // You can hide or peek at the count; turning "Show the count" on or off in Settings resets that.
  const [peek, setPeek] = useState({ base: showCount, visible: showCount });
  const countVisible = !testing && (peek.base === showCount ? peek.visible : showCount);
  const setCountVisible = (visible: boolean) => setPeek({ base: showCount, visible });

  const betting = game.phase === 'betting';
  // Between rounds, 1-or-2 hands and other players follow your settings; the next deal locks them in.
  const seated = useMemo(() => {
    if (!betting) return table;
    const t = setYourHands(table, settings.yourHands);
    return otherPlayers ? t : { ...t, seats: t.seats.map((o) => (isNpc(o) ? null : o)) };
  }, [betting, table, settings.yourHands, otherPlayers]);
  const activeHand = game.phase === 'playing' ? game.hands[game.active] : undefined;
  const yourTurn = isYours(activeHand);
  const legal = legalActions(game);
  const tc = currentTrueCount(game);
  const shownTc = currentTrueCount(countSource);
  const advice = useMemo(() => {
    const ctx = yourTurn ? decisionContext(game, countPlays) : null;
    return ctx ? recommend(ctx) : null;
    // `lang`: the coach's reason text follows the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, countPlays, yourTurn, lang]);

  /** `correct`: right calls so far this round, passed in when this move just changed it. */
  const commit = (prev: GameState, next: GameState, correct = roundCorrect) => {
    setGame(next);
    anim.play(prev, next, () => setCountSource(next));
    recordRoundEnd(next, correct);
  };

  const recordRoundEnd = (g: GameState, correct: number) => {
    if (g.phase !== 'roundOver') return;
    setTable((t) => settleNpcs(t, g));
    if (testing) {
      exam?.onRoundEnd(g.hands.filter(isYours).length);
      return;
    }
    // XP for each of your seats played and each correct call; new levels unlock tables.
    const seatsPlayed = new Set(g.hands.filter(isYours).map((h) => h.seat)).size;
    const xp = stats.xp + roundXp(seatsPlayed, correct);
    const before = levelInfo(stats.xp);
    const after = levelInfo(xp);
    const found: { text: string; table?: CasinoTable }[] = [];
    if (after.level > before.level) found.push({ text: T.level(after.level, after.title) });
    for (const t of newlyUnlocked(before.level, after.level)) found.push({ text: T.unlocked(t.name), table: t });
    if (found.length) setMilestones(found);
    if (after.level > before.level) askForReview();
    updateStats((s) => ({
      ...s,
      handsPlayed: s.handsPlayed + 1,
      xp,
    }));
    if (countQuizzes && Math.random() < QUIZ_CHANCE) {
      setQuiz({ guess: 0, revealed: false });
      setCountVisible(false);
    }
  };

  // Computer players take their turns on their own, after a short pause.
  useEffect(() => {
    if (!settled || !activeHand || isYours(activeHand)) return;
    const id = setTimeout(() => {
      const npc = findNpc(table, activeHand.owner);
      let action: Action = 'stand';
      if (npc) {
        const choice = npcAction(game, npc);
        action = choice.action;
        let text: string;
        if (testing) {
          // Table talk, not coaching: no "book" notes or count plays to give the count away.
          text = Math.random() < CHATTER_CHANCE ? chatterLine() : ACTION_LABEL[action];
        } else {
          const note =
            action === choice.book ? '' : npc.style === 'counter' ? T.countPlay : T.book(ACTION_LABEL[choice.book]);
          text = `${ACTION_LABEL[action]}${note}`;
        }
        setBubbles((b) => ({ ...b, [npc.id]: text }));
      }
      commit(game, act(game, action));
    }, Math.round(NPC_THINK_MS[mode] * speed));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, game]);

  /** Scores a decision; returns 1 if it was right, for this round's XP. */
  const grade = (ok: boolean, text: string) => {
    if (testing) {
      // Graded silently: no sounds, streaks or explanations until the report card.
      exam?.onDecision(ok);
      return ok ? 1 : 0;
    }
    const nextStreak = ok ? streak + 1 : 0;
    setStreak(nextStreak);
    if (ok) setRoundCorrect((c) => c + 1);
    // The chime climbs a semitone with every correct play in a row.
    if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong', ok ? streakPitch(nextStreak) : 1);
    updateStats((s) => ({ ...s, decisions: s.decisions + 1, correctDecisions: s.correctDecisions + (ok ? 1 : 0) }));
    if (!ok && correctMistakes) setFeedback({ ok, text });
    else if (ok) setFeedback({ ok, text: nextStreak >= 5 ? T.inARow(nextStreak) : T.correct });
    return ok ? 1 : 0;
  };

  const onAction = (action: Action) => {
    const ctx = decisionContext(game, false);
    let graded = 0;
    if (advice && ctx) {
      graded = grade(action === advice.action, T.best(ACTION_LABEL[advice.action], advice.reason));
      // Track which kinds of decisions you miss (see the Your Leaks screen). Hands where a
      // count play changes the answer aren't basic strategy, so they stay out of it.
      if (!advice.deviation) {
        updateStats((s) => ({
          ...s,
          leaks: recordDecision(s.leaks, { cards: ctx.cards, dealerUp: ctx.dealerUp, canSplit: ctx.canSplit, chosen: action, best: advice.action }),
        }));
      }
    }
    commit(game, act(game, action), roundCorrect + graded);
  };

  /** Hand signals on the felt: tap = hit, sideways swipe = stand. */
  const onSignal = (s: Signal) => {
    if (!settled || !yourTurn || !legal[s]) return;
    if (settings.haptics) haptic('cardLand');
    onAction(s);
  };

  const onInsurance = (take: boolean) => {
    const best = countPlays && shouldTakeInsurance(tc);
    updateStats((s) => ({ ...s, leaks: recordInsurance(s.leaks, take === best) }));
    const graded = grade(take === best, best ? T.takeIns(formatTrueCount(tc)) : T.declineIns);
    commit(game, resolveInsurance(game, take), roundCorrect + graded);
  };

  const deal = () => {
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    setMilestones([]);
    setRoundCorrect(0);
    setRounds((n) => n + 1);
    // The hidden practice budget is topped up every round, so it can never run out.
    const base = { ...game, bankroll: PRACTICE_BUDGET };
    setTable(seated);
    const bets = roundBets(seated, PRACTICE_STAKE, PRACTICE_STAKE);
    const next = startRound(base, bets);
    if (next.phase === 'insurance' && !testing) {
      // Card counters at the table take insurance when the count is high.
      const take = shouldTakeInsurance(hiLoTrueCount(next));
      const counters = seated.seats.filter((o) => isNpc(o) && o.style === 'counter');
      setBubbles(Object.fromEntries(counters.map((o) => [isNpc(o) ? o.id : '', take ? T.takesIns : T.noIns])));
    }
    setCountSource(base);
    commit(base, next, 0);
  };

  const nextHand = () => {
    const { table: t, events: e } = betweenRounds(table, PRACTICE_STAKE, otherPlayers);
    const handsNext = t.seats.filter((o) => o !== null).length;
    const cleared: GameState = { ...game, phase: 'betting', hands: [], dealer: [] };
    // The test is one shoe: it ends when the cut card comes out.
    if (testing && needsShuffle(cleared, handsNext)) {
      exam?.onShoeEnd(game);
      return;
    }
    // Ads wait for the reshuffle, a natural pause, rather than interrupting mid-shoe.
    if (!testing) roundBreak(needsShuffle(cleared, handsNext));
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    anim.clear();
    setTable(t);
    if (e.length) setEvents((prev) => [...e, ...prev].slice(0, 3));
    // Shuffle now (not at the deal) when the cut card is out, so the count shown is the new shoe's.
    const fresh = shuffleIfNeeded(cleared, handsNext);
    setGame(fresh);
    setCountSource(fresh);
  };

  // Between rounds the test may ask a question (decks left) before the next deal.
  const gate = betting && testing ? exam?.gate?.(game) : null;
  const canDeal = betting && !gate;
  useKeyboardShortcuts({
    ...Object.fromEntries(
      Object.entries(KEY_ACTIONS).map(([k, a]) => [k, settled && yourTurn && legal[a] ? () => onAction(a) : undefined]),
    ),
    enter: canDeal ? () => deal() : settled && game.phase === 'roundOver' ? () => nextHand() : undefined,
  });

  const waitingOn = activeHand && !isYours(activeHand) ? findNpc(table, activeHand.owner) : undefined;
  const rc = signed(countSource.runningCount);
  // KO is unbalanced: players use the running count itself, so show RC only.
  const countText = isBalanced(countingSystem)
    ? T.count(rc, decksRemaining(countSource.shoe.length), formatTrueCount(shownTc))
    : T.countRc(rc);
  const signals = settings.handSignals && settled && yourTurn;

  // Your moves. On phones they're pinned below the table so they're always in reach; a tablet has
  // room for them right under it. They stay in place while a card lands (they just don't take taps
  // yet) instead of vanishing and reappearing on every hit. Keyed by the decision, so the coach hint resets.
  const { height } = useWindowDimensions();
  const pinActions = height < 1000;
  // A short screen (iPhone Duo, SE) drops the level bar so the whole table fits.
  const short = height < 760;
  const actionBar = yourTurn && (
    <View pointerEvents={settled ? 'auto' : 'none'} style={{ gap: spacing(1.5) }} key={`${game.active}-${activeHand!.cards.length}`}>
      <ActionBar
        seat={activeHand!.seat}
        legal={legal}
        advice={advice}
        showHints={showHints}
        surrenderAllowed={rules.lateSurrender}
        handSignals={settings.handSignals}
        onAction={(a) => settled && onAction(a)}
      />
    </View>
  );

  // Insurance and the round result are pinned too, so the next step is always on screen.
  const insurancePanel = settled && game.phase === 'insurance' && (
    <InsurancePanel
      hint={showHints ? (countPlays && shouldTakeInsurance(tc) ? T.hintTake : T.hintDecline) : null}
      onChoose={onInsurance}
    />
  );
  const result = roundResult(game);
  const resultPanel = settled && game.phase === 'roundOver' && (
    <Panel>
      <Text style={[styles.prompt, { color: result.tone > 0 ? good : result.tone < 0 ? bad : colors.text }]}>{result.text}</Text>
      {quiz && <CountQuiz quiz={quiz} setQuiz={setQuiz} actual={game.runningCount} />}
      <Button title={T.nextHand} onPress={nextHand} />
    </Panel>
  );
  const nextStep = actionBar || insurancePanel || resultPanel;

  return (
    // On a short phone, bring your hand into view when it's your move.
    <Screen
      wide
      footer={pinActions && nextStep}
      // Also at the end of the round, so your hands' results aren't left under the pinned panel.
      scrollToEndOn={pinActions && settled && (yourTurn ? `${game.active}` : game.phase === 'roundOver' && 'over')}
    >
      {!testing && <Stack.Screen options={headerOptions} />}
      {/* Status bar: level or round, and the count (the test shows the discard tray instead of the count) */}
      <View style={styles.topBar}>
        {/* The level bar below already shows your level once the count is unlocked. */}
        <Text style={styles.level}>
          {testing ? T.hand(Math.max(1, rounds)) : counting && !short ? '' : T.level(levelInfo(stats.xp).level, levelInfo(stats.xp).title)}
        </Text>
        {testing ? (
          <DiscardTray cards={discardedCards(countSource)} decks={rules.decks} deckPx={9} caption={false} />
        ) : counting ? (
          <Text style={styles.count} onPress={() => setCountVisible(!countVisible)} accessibilityRole="button">
            {countVisible ? countText : T.tapCount}
          </Text>
        ) : null}
      </View>
      {!testing && counting && !short && <LevelBar xp={stats.xp} compact />}
      {/* One fixed-height line for the shuffle notice or your streak, so neither pushes the table down when it appears. */}
      {!testing && (
        <View style={styles.notice}>
          {counting && game.justShuffled ? (
            <Text style={styles.shuffle} numberOfLines={2}>
              {isBalanced(countingSystem) ? T.shuffled : T.shuffledKo(signed(initialRunningCount(rules.decks)))}
            </Text>
          ) : (
            <StreakBadge streak={streak} />
          )}
        </View>
      )}

      <HandSignalArea enabled={signals} onSignal={onSignal}>
        <TableFelt
          game={game}
          table={seated}
          casino={casino}
          schedule={anim.schedule}
          settled={settled}
          instant={anim.reduceMotion}
          bubbles={bubbles}
          fanfare={anim.fanfare}
          effects={anim.effects}
          shakeStyle={anim.shakeStyle}
        />
      </HandSignalArea>

      {events.length > 0 && (
        <View style={styles.events}>
          {events.map((e, i) => (
            <Text key={`${e.text}-${i}`} style={[styles.event, i > 0 && { opacity: 0.55 }]}>
              {e.kind === 'join' ? '→ ' : '← '}
              {e.text}
            </Text>
          ))}
        </View>
      )}

      {settled && milestones.length > 0 && (
        <Panel style={styles.milestone}>
          {milestones.map((m) => (
            <View key={m.text} style={{ gap: 6 }}>
              <Text style={styles.milestoneText}>★ {m.text}</Text>
              {m.table && (
                <Button
                  title={T.goTo(m.table.name)}
                  variant="secondary"
                  onPress={() => updateSettings({ tableId: m.table!.id })}
                />
              )}
            </View>
          ))}
        </Panel>
      )}

      {feedback && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: feedback.ok ? good : bad }}>
          <Text style={{ color: feedback.ok ? good : bad, fontWeight: '700' }}>
            {feedback.ok ? '✓ ' : '✗ '}
            {feedback.text}
          </Text>
        </Panel>
      )}

      {settled && waitingOn && <Text style={styles.waiting}>{T.playing(waitingOn.name)}</Text>}

      {!pinActions && nextStep}

      {gate}

      {betting && !gate && (
        <BettingPanel extras={!testing} onDeal={deal} />
      )}
    </Screen>
  );
}

/** The round's result in words, from your hands' outcomes (nothing is bet, so no amounts). */
function roundResult(g: GameState): { text: string; tone: number } {
  const yours = g.hands.filter(isYours);
  const won = yours.filter((h) => h.outcome === 'win' || h.outcome === 'blackjack').length;
  const lost = yours.filter((h) => h.outcome === 'lose' || h.outcome === 'surrender').length;
  const pushed = yours.length - won - lost;
  const tone = won - lost;
  if (yours.length !== 1) {
    const all = won === yours.length ? 'win' : lost === yours.length ? 'lose' : pushed === yours.length ? 'push' : null;
    return { text: all ? T.both[all] : T.split(won, lost, pushed), tone };
  }
  const o = yours[0].outcome;
  const text = o === 'blackjack' ? T.blackjack : o === 'win' ? T.won : o === 'surrender' ? T.surrendered : o === 'lose' ? T.lost : T.push;
  return { text, tone };
}

const styles = StyleSheet.create({
  milestone: { backgroundColor: colors.feltDark },
  milestoneText: { color: colors.gold, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  level: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  count: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  notice: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  shuffle: { color: colors.warn, textAlign: 'center', fontSize: 13 },
  events: { gap: 2 },
  event: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  waiting: { color: colors.muted, textAlign: 'center', fontStyle: 'italic' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
