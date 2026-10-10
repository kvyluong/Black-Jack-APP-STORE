// The casino table, shared by the practice table (/play) and the Casino
// Conditions test (/exam). In 'exam' mode there are no hints, no count on screen,
// no feedback during play, chips come from a separate practice stack, the
// dealer deals faster, the other players chat, and a discard tray shows the
// cards played. The exam screen gets every bet, decision and the end of the shoe
// through `exam` callbacks.
import { Stack } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useInterstitial } from '../../ads/useInterstitial';
import { haptic } from '../../audio/haptics';
import { playSound } from '../../audio/sounds';
import { betUnitsForCount, decksRemaining, initialRunningCount, isBalanced, shouldTakeInsurance } from '../../engine/counting';
import { DEAL_STEP_MS } from '../../engine/dealSchedule';
import { discardedCards } from '../../engine/decks';
import { EXAM_STACK_UNITS, chatterLine } from '../../engine/exam';
import {
  GameState,
  YOU,
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
  STARTING_CHIPS,
  bestAffordableTable,
  formatChips,
  getTable,
  levelInfo,
  needsRefill,
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
import { colors } from '../../theme';
import { LevelBar } from '../chips';
import { useUnlocks } from '../useUnlocks';
import { StreakBadge, useCountUp } from '../juice';
import { Button, Panel, Screen } from '../ui';
import { useOutcomeColors } from '../useColors';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { BettingPanel } from './BettingPanel';
import { CountQuiz, Quiz } from './CountQuiz';
import { DiscardTray } from './DiscardTray';
import { HandSignalArea, Signal } from './HandSignalArea';
import { TableFelt } from './TableFelt';
import { ActionBar, InsurancePanel } from './TurnControls';
import { useDealAnimation } from '../useDealAnimation';

const QUIZ_CHANCE = 0.25;
/** How long a computer player "thinks" before acting (quicker under casino conditions). */
const NPC_THINK_MS = { practice: 650, exam: 450 };
/** Time between dealt cards: a busy casino dealer is quicker than the practice table. */
const DEAL_STEP = { practice: DEAL_STEP_MS, exam: Math.round(DEAL_STEP_MS * 0.65) };
/** How often a computer player says something instead of just signaling their play (test only). */
const CHATTER_CHANCE = 0.4;
const KEY_ACTIONS: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };

const T = localized({
  en: {
    level: (n: number, title: string) => `Level ${n}: ${title}`,
    unlocked: (name: string) => `New table unlocked: ${name}`,
    countPlay: ' · count play',
    book: (a: string) => ` ✗ book: ${a}`,
    correct: 'Correct!',
    inARow: (n: number) => `Correct! ${n} in a row 🔥`,
    best: (a: string, reason: string) => `Best play: ${a}. ${reason}`,
    takeIns: (tc: string) =>
      `Take insurance: the true count is ${tc} (+3 or more), so over a third of the remaining cards are 10s.`,
    declineIns: 'Decline insurance. It loses money in the long run unless the true count is +3 or higher.',
    takesIns: 'Takes insurance',
    noIns: 'No insurance',
    chips: (n: string) => `Chips $${n}`,
    examChips: (n: string) => `Test chips $${n}`,
    count: (rc: string, decks: number, tc: string) => `RC ${rc} · Decks ${decks} · TC ${tc}`,
    countRc: (rc: string) => `RC ${rc}`,
    tapCount: 'Tap to check count',
    shuffled: 'New shoe shuffled · count resets to 0',
    shuffledKo: (start: string) => `New shoe shuffled · KO count starts at ${start}`,
    goTo: (name: string, min: string, max: string) => `Go to ${name} ($${min}–$${max})`,
    playing: (name: string) => `${name} is playing…`,
    hintTake: 'Take it (TC +3 or higher)',
    hintDecline: 'Decline',
    won: (n: number) => `You won $${n}`,
    lost: (n: number) => `You lost $${n}`,
    push: 'Push',
    nextHand: 'Next hand',
    bonus: (n: string) => `+$${n} BONUS`,
    hand: (n: number) => `Round ${n}`,
  },
  es: {
    level: (n: number, title: string) => `Nivel ${n}: ${title}`,
    unlocked: (name: string) => `Nueva mesa desbloqueada: ${name}`,
    countPlay: ' · jugada por conteo',
    book: (a: string) => ` ✗ manual: ${a}`,
    correct: '¡Correcto!',
    inARow: (n: number) => `¡Correcto! ${n} seguidas 🔥`,
    best: (a: string, reason: string) => `Mejor jugada: ${a}. ${reason}`,
    takeIns: (tc: string) =>
      `Toma el seguro: el conteo real es ${tc} (+3 o más), así que más de un tercio de las cartas restantes son 10.`,
    declineIns: 'Rechaza el seguro. A la larga pierde dinero, salvo que el conteo real sea +3 o más.',
    takesIns: 'Toma seguro',
    noIns: 'Sin seguro',
    chips: (n: string) => `Fichas $${n}`,
    examChips: (n: string) => `Fichas de prueba $${n}`,
    count: (rc: string, decks: number, tc: string) => `CC ${rc} · Barajas ${decks} · CR ${tc}`,
    countRc: (rc: string) => `CC ${rc}`,
    tapCount: 'Toca para ver el conteo',
    shuffled: 'Zapato nuevo barajado · el conteo vuelve a 0',
    shuffledKo: (start: string) => `Zapato nuevo barajado · el conteo KO empieza en ${start}`,
    goTo: (name: string, min: string, max: string) => `Ir a ${name} ($${min}–$${max})`,
    playing: (name: string) => `${name} está jugando…`,
    hintTake: 'Tómalo (CR +3 o más)',
    hintDecline: 'Recházalo',
    won: (n: number) => `Ganaste $${n}`,
    lost: (n: number) => `Perdiste $${n}`,
    push: 'Empate',
    nextHand: 'Siguiente mano',
    bonus: (n: string) => `+$${n} EXTRA`,
    hand: (n: number) => `Ronda ${n}`,
  },
});

export type TableMode = 'practice' | 'exam';

/** What the Casino Conditions test hears from the table. */
export interface ExamHooks {
  /** A round was dealt: your bet per hand in units and what the count called for (betUnitsForCount). */
  onBet: (units: number, ideal: number) => void;
  /** One of your decisions (plays and insurance), graded silently. */
  onDecision: (ok: boolean) => void;
  /** A round finished with this many hands of yours (split hands included). */
  onRoundEnd: (yourHands: number) => void;
  /** The cut card came out (or the test chips ran out): `final` is the last finished round. */
  onShoeEnd: (final: GameState) => void;
  /** Between rounds, shown instead of the betting panel when it returns something (the decks-left question). */
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
  // Beginners see just the cards, the coach and the buttons; the count bar, bet
  // suggestion, level bar and count quizzes appear with the counting lessons.
  const counting = useUnlocks().has('tableCount');
  const showCount = !testing && counting && settings.showCount;
  const countQuizzes = !testing && counting && settings.countQuizzes;
  // The count plays (DEVIATIONS) are Hi-Lo indices, so they only apply with Hi-Lo.
  // The test always grades them for Hi-Lo counters.
  const countPlays = countingSystem === 'hiLo' && (testing || settings.useDeviations);
  const otherPlayers = testing || settings.otherPlayers;
  const { good, bad } = useOutcomeColors();
  // The casino table you're sitting at sets the bet limits.
  const casino = getTable(settings.tableId);
  const unit = casino.minBet;
  const [game, setGame] = useState<GameState>(() => newGame(rules, testing ? EXAM_STACK_UNITS * unit : settings.bankroll));
  // The last state whose cards have all landed: the count and chips on screen follow this.
  const [countSource, setCountSource] = useState<GameState>(game);
  const [table, setTable] = useState<Table>(() => createTable(settings.yourHands, unit, otherPlayers));
  const [events, setEvents] = useState<TableEvent[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [bet, setBet] = useState(unit);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [streak, setStreak] = useState(0);
  const [rounds, setRounds] = useState(0);
  // Level-ups and newly unlocked tables to announce after a round.
  const [milestones, setMilestones] = useState<{ text: string; table?: CasinoTable }[]>([]);
  // Correct decisions this round, for XP.
  const [roundCorrect, setRoundCorrect] = useState(0);
  const roundBreak = useInterstitial();
  const anim = useDealAnimation(DEAL_STEP[mode]);
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
  // Chips can change off the table (a bonus, a refill), so between rounds the saved balance is the truth.
  // The test plays from its own stack.
  const bankroll = betting && !testing ? settings.bankroll : game.bankroll;

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
    // Bets come out of your saved chips as soon as they're placed, so leaving mid-round forfeits
    // them like walking away from a real table (instead of undoing the hand).
    if (!testing && next.bankroll !== prev.bankroll && next.phase !== 'roundOver') updateSettings({ bankroll: next.bankroll });
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
    updateSettings({ bankroll: g.bankroll });
    // XP for each of your seats played and each correct call; new peaks unlock tables.
    const seatsPlayed = new Set(g.hands.filter(isYours).map((h) => h.seat)).size;
    const xp = stats.xp + roundXp(seatsPlayed, correct);
    const before = levelInfo(stats.xp);
    const after = levelInfo(xp);
    const found: { text: string; table?: CasinoTable }[] = [];
    if (after.level > before.level) found.push({ text: T.level(after.level, after.title) });
    for (const t of newlyUnlocked(stats.peakChips, g.bankroll)) found.push({ text: T.unlocked(t.name), table: t });
    if (found.length) setMilestones(found);
    updateStats((s) => ({
      ...s,
      handsPlayed: s.handsPlayed + 1,
      xp,
      peakChips: Math.max(s.peakChips, g.bankroll),
      biggestWin: Math.max(s.biggestWin, g.lastNet),
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
    }, NPC_THINK_MS[mode]);
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

  // You play as many of your seats as your chips cover.
  const yourSeatCount = seated.seats.filter((o) => o === YOU).length;
  const affordableSeats = bet >= unit ? Math.min(yourSeatCount, Math.floor(bankroll / bet)) : 0;
  // The most you can put on each hand: the table max, or what your chips cover.
  // With chips for fewer hands than seats, size bets for the hands you can actually play.
  const coverableSeats = Math.max(1, Math.min(yourSeatCount, Math.floor(bankroll / unit)));
  const maxPerHand = Math.min(casino.maxBet, Math.floor(bankroll / coverableSeats));
  // When your chips no longer cover this table's minimum, suggest one that fits.
  const moveTo =
    !testing && bankroll < unit && !needsRefill(bankroll) ? bestAffordableTable(bankroll, stats.peakChips) : undefined;

  const deal = () => {
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    setMilestones([]);
    setRoundCorrect(0);
    setRounds((n) => n + 1);
    const base = { ...game, bankroll };
    setTable(seated);
    let skip = yourSeatCount - affordableSeats;
    const bets = roundBets(seated, bet, hiLoTrueCount(game), unit, casino.maxBet).filter((b) => b.owner !== YOU || skip-- <= 0);
    // The test scores your bet against the count's (KO: its estimated true count).
    if (testing) exam?.onBet(bet / unit, betUnitsForCount(game.runningCount, game.shoe.length, rules.decks));
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
    const { table: t, events: e } = betweenRounds(table, unit, otherPlayers);
    const handsNext = t.seats.filter((o) => o !== null).length;
    const cleared: GameState = { ...game, phase: 'betting', hands: [], dealer: [] };
    // The test is one shoe: it ends when the cut card comes out (or the test chips run out).
    if (testing && (needsShuffle(cleared, handsNext) || game.bankroll < unit)) {
      exam?.onShoeEnd(game);
      return;
    }
    if (!testing) roundBreak();
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    anim.clear();
    setTable(t);
    if (e.length) setEvents((prev) => [...e, ...prev].slice(0, 3));
    // Shuffle now (not at the deal) when the cut card is out, so bet advice uses the new shoe.
    const fresh = shuffleIfNeeded(cleared, handsNext);
    setGame(fresh);
    setCountSource(fresh);
  };

  /** Free refill back to the starting stack once you can't cover the smallest table. */
  const refill = () => {
    updateSettings({ bankroll: STARTING_CHIPS, tableId: 'floor' });
    updateStats((s) => ({ ...s, refills: s.refills + 1 }));
    setBet(getTable('floor').minBet);
  };

  // Winnings count up into your chips with rising ticks.
  const shownBankroll = useCountUp(
    betting && !testing ? settings.bankroll : countSource.bankroll,
    (step) => settings.soundEffects && playSound('tick', 1 + step * 0.06),
    !anim.reduceMotion,
  );

  // Between rounds the test may ask a question (decks left) before the next bet.
  const gate = betting && testing ? exam?.gate?.(game) : null;
  const canDeal = betting && !gate && !needsRefill(bankroll) && !moveTo && bet >= unit && affordableSeats >= 1;
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

  return (
    <Screen>
      {!testing && <Stack.Screen options={{ title: casino.name }} />}
      {/* Status bar: chips, level and count (the test shows the discard tray instead of the count) */}
      <View style={styles.topBar}>
        <View style={{ gap: 2 }}>
          <Text style={styles.bankroll}>{testing ? T.examChips(formatChips(shownBankroll)) : T.chips(formatChips(shownBankroll))}</Text>
          {testing && <Text style={styles.count}>{T.hand(Math.max(1, rounds))}</Text>}
        </View>
        {testing ? (
          <DiscardTray cards={discardedCards(countSource)} decks={rules.decks} deckPx={9} caption={false} />
        ) : counting ? (
          <Text style={styles.count} onPress={() => setCountVisible(!countVisible)} accessibilityRole="button">
            {countVisible ? countText : T.tapCount}
          </Text>
        ) : null}
      </View>
      {!testing && counting && <LevelBar xp={stats.xp} compact />}
      {!testing && counting && game.justShuffled && (
        <Text style={styles.shuffle}>
          {isBalanced(countingSystem) ? T.shuffled : T.shuffledKo(signed(initialRunningCount(rules.decks)))}
        </Text>
      )}

      {!testing && <StreakBadge streak={streak} />}

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
                  title={T.goTo(m.table.name, formatChips(m.table.minBet), formatChips(m.table.maxBet))}
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

      {settled && yourTurn && (
        <ActionBar
          seat={activeHand!.seat}
          legal={legal}
          advice={advice}
          showHints={showHints}
          surrenderAllowed={rules.lateSurrender}
          handSignals={settings.handSignals}
          onAction={onAction}
        />
      )}

      {settled && game.phase === 'insurance' && (
        <InsurancePanel
          hint={showHints ? (countPlays && shouldTakeInsurance(tc) ? T.hintTake : T.hintDecline) : null}
          onChoose={onInsurance}
        />
      )}

      {settled && game.phase === 'roundOver' && (
        <Panel>
          <Text style={[styles.prompt, { color: game.lastNet > 0 ? good : game.lastNet < 0 ? bad : colors.text }]}>
            {game.lastNet > 0 ? T.won(game.lastNet) : game.lastNet < 0 ? T.lost(-game.lastNet) : T.push}
          </Text>
          {quiz && <CountQuiz quiz={quiz} setQuiz={setQuiz} actual={game.runningCount} />}
          <Button title={T.nextHand} onPress={nextHand} />
        </Panel>
      )}

      {gate}

      {betting && !gate && (
        <BettingPanel
          casino={casino}
          bet={bet}
          setBet={setBet}
          yourSeatCount={yourSeatCount}
          affordableSeats={affordableSeats}
          maxPerHand={maxPerHand}
          suggestedUnits={countVisible ? betUnitsForCount(game.runningCount, game.shoe.length, rules.decks) : null}
          outOfChips={!testing && needsRefill(bankroll)}
          moveTo={moveTo}
          extras={!testing}
          onDeal={deal}
          onRefill={refill}
          onBonus={(amount) => {
            // Bonus chips land in your stack with the usual count-up and a chip burst.
            anim.setFanfare({ tier: 'bigWin', label: T.bonus(formatChips(amount)), net: amount, shake: 0, particles: 28, key: Date.now() });
            if (settings.soundEffects) playSound('chips');
            if (settings.haptics) haptic('bigWin');
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  milestone: { borderWidth: 2, borderColor: colors.gold },
  milestoneText: { color: colors.gold, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  bankroll: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  count: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  shuffle: { color: colors.warn, textAlign: 'center', fontSize: 13 },
  events: { gap: 2 },
  event: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  waiting: { color: colors.muted, textAlign: 'center', fontStyle: 'italic' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
