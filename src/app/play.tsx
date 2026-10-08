import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useInterstitial } from '../ads/useInterstitial';
import { haptic } from '../audio/haptics';
import { playSound } from '../audio/sounds';
import { LevelBar } from '../components/chips';
import { StreakBadge, useCountUp } from '../components/juice';
import { BettingPanel } from '../components/table/BettingPanel';
import { CountQuiz, Quiz } from '../components/table/CountQuiz';
import { TableFelt } from '../components/table/TableFelt';
import { ActionBar, InsurancePanel } from '../components/table/TurnControls';
import { Button, Panel, Screen } from '../components/ui';
import { useOutcomeColors } from '../components/useColors';
import { useDealAnimation } from '../components/useDealAnimation';
import { useKeyboardShortcuts } from '../components/useKeyboardShortcuts';
import { decksRemaining, flooredTrueCount, shouldTakeInsurance, suggestedBetUnits } from '../engine/counting';
import {
  GameState,
  YOU,
  act,
  currentTrueCount,
  decisionContext,
  isYours,
  legalActions,
  newGame,
  resolveInsurance,
  shuffleIfNeeded,
  startRound,
} from '../engine/game';
import { streakPitch } from '../engine/juice';
import { recordDecision, recordInsurance } from '../engine/leaks';
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
} from '../engine/progression';
import { ACTION_LABEL, Action, formatTrueCount, recommend } from '../engine/strategy';
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
} from '../engine/table';
import { localized } from '../i18n/lang';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

const QUIZ_CHANCE = 0.25;
/** How long a computer player "thinks" before acting. */
const NPC_THINK_MS = 650;
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
    count: (rc: string, decks: number, tc: string) => `RC ${rc} · Decks ${decks} · TC ${tc}`,
    tapCount: 'Tap to check count',
    shuffled: 'New shoe shuffled · count resets to 0',
    goTo: (name: string, min: string, max: string) => `Go to ${name} ($${min}–$${max})`,
    playing: (name: string) => `${name} is playing…`,
    hintTake: 'Take it (TC +3 or higher)',
    hintDecline: 'Decline',
    won: (n: number) => `You won $${n}`,
    lost: (n: number) => `You lost $${n}`,
    push: 'Push',
    nextHand: 'Next hand',
    bonus: (n: string) => `+$${n} BONUS`,
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
    count: (rc: string, decks: number, tc: string) => `CC ${rc} · Barajas ${decks} · CR ${tc}`,
    tapCount: 'Toca para ver el conteo',
    shuffled: 'Zapato nuevo barajado · el conteo vuelve a 0',
    goTo: (name: string, min: string, max: string) => `Ir a ${name} ($${min}–$${max})`,
    playing: (name: string) => `${name} está jugando…`,
    hintTake: 'Tómalo (CR +3 o más)',
    hintDecline: 'Recházalo',
    won: (n: number) => `Ganaste $${n}`,
    lost: (n: number) => `Perdiste $${n}`,
    push: 'Empate',
    nextHand: 'Siguiente mano',
    bonus: (n: string) => `+$${n} EXTRA`,
  },
});

type Feedback = { ok: boolean; text: string } | null;

export default function Play() {
  const { ready, settings } = useSettings();
  if (!ready) return <Screen>{null}</Screen>;
  // A fresh shoe whenever you change tables or table rules.
  return <TableScreen key={`${settings.tableId}:${settings.countingSystem}:${JSON.stringify(settings.rules)}`} />;
}

function TableScreen() {
  const { lang, settings, stats, updateSettings, updateStats } = useSettings();
  const { rules, showHints, correctMistakes, showCount, countQuizzes, useDeviations } = settings;
  const { good, bad } = useOutcomeColors();
  // The casino table you're sitting at sets the bet limits.
  const casino = getTable(settings.tableId);
  const unit = casino.minBet;
  const [game, setGame] = useState<GameState>(() => newGame(rules, settings.bankroll));
  // The last state whose cards have all landed: the count and chips on screen follow this.
  const [countSource, setCountSource] = useState<GameState>(game);
  const [table, setTable] = useState<Table>(() => createTable(settings.yourHands, unit, settings.otherPlayers));
  const [events, setEvents] = useState<TableEvent[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [bet, setBet] = useState(unit);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [streak, setStreak] = useState(0);
  // Level-ups and newly unlocked tables to announce after a round.
  const [milestones, setMilestones] = useState<{ text: string; table?: CasinoTable }[]>([]);
  // Correct decisions this round, for XP.
  const [roundCorrect, setRoundCorrect] = useState(0);
  const roundBreak = useInterstitial();
  const anim = useDealAnimation();
  const { settled } = anim;

  // You can hide or peek at the count; turning "Show the count" on or off in Settings resets that.
  const [peek, setPeek] = useState({ base: showCount, visible: showCount });
  const countVisible = peek.base === showCount ? peek.visible : showCount;
  const setCountVisible = (visible: boolean) => setPeek({ base: showCount, visible });

  const betting = game.phase === 'betting';
  // Between rounds, 1-or-2 hands and other players follow your settings; the next deal locks them in.
  const seated = useMemo(() => {
    if (!betting) return table;
    const t = setYourHands(table, settings.yourHands);
    return settings.otherPlayers ? t : { ...t, seats: t.seats.map((o) => (isNpc(o) ? null : o)) };
  }, [betting, table, settings.yourHands, settings.otherPlayers]);
  // Chips can change off the table (a bonus, a refill), so between rounds the saved balance is the truth.
  const bankroll = betting ? settings.bankroll : game.bankroll;

  const activeHand = game.phase === 'playing' ? game.hands[game.active] : undefined;
  const yourTurn = isYours(activeHand);
  const legal = legalActions(game);
  const tc = currentTrueCount(game);
  const shownTc = currentTrueCount(countSource);
  const advice = useMemo(() => {
    const ctx = yourTurn ? decisionContext(game, useDeviations) : null;
    return ctx ? recommend(ctx) : null;
    // `lang`: the coach's reason text follows the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, useDeviations, yourTurn, lang]);

  /** `correct`: right calls so far this round, passed in when this move just changed it. */
  const commit = (prev: GameState, next: GameState, correct = roundCorrect) => {
    setGame(next);
    // Bets come out of your saved chips as soon as they're placed, so leaving mid-round forfeits
    // them like walking away from a real table (instead of undoing the hand).
    if (next.bankroll !== prev.bankroll && next.phase !== 'roundOver') updateSettings({ bankroll: next.bankroll });
    anim.play(prev, next, () => setCountSource(next));
    recordRoundEnd(next, correct);
  };

  const recordRoundEnd = (g: GameState, correct: number) => {
    if (g.phase !== 'roundOver') return;
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
    setTable((t) => settleNpcs(t, g));
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
        const note =
          action === choice.book ? '' : npc.style === 'counter' ? T.countPlay : T.book(ACTION_LABEL[choice.book]);
        setBubbles((b) => ({ ...b, [npc.id]: `${ACTION_LABEL[action]}${note}` }));
      }
      commit(game, act(game, action));
    }, NPC_THINK_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, game]);

  /** Scores a decision; returns 1 if it was right, for this round's XP. */
  const grade = (ok: boolean, text: string) => {
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
      // Track which kinds of decisions you miss (see the Your Leaks screen).
      updateStats((s) => ({
        ...s,
        leaks: recordDecision(s.leaks, { cards: ctx.cards, dealerUp: ctx.dealerUp, canSplit: ctx.canSplit, chosen: action, best: advice.action }),
      }));
    }
    commit(game, act(game, action), roundCorrect + graded);
  };

  const onInsurance = (take: boolean) => {
    const best = useDeviations && shouldTakeInsurance(tc);
    updateStats((s) => ({ ...s, leaks: recordInsurance(s.leaks, take === best) }));
    const graded = grade(
      take === best,
      best
        ? T.takeIns(formatTrueCount(tc))
        : T.declineIns,
    );
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
  const moveTo = bankroll < unit && !needsRefill(bankroll) ? bestAffordableTable(bankroll, stats.peakChips) : undefined;

  const deal = () => {
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    setMilestones([]);
    setRoundCorrect(0);
    const base = { ...game, bankroll };
    setTable(seated);
    let skip = yourSeatCount - affordableSeats;
    const bets = roundBets(seated, bet, currentTrueCount(game), unit, casino.maxBet).filter((b) => b.owner !== YOU || skip-- <= 0);
    const next = startRound(base, bets);
    if (next.phase === 'insurance') {
      // Card counters at the table take insurance when the count is high.
      const take = shouldTakeInsurance(currentTrueCount(next));
      const counters = seated.seats.filter((o) => isNpc(o) && o.style === 'counter');
      setBubbles(Object.fromEntries(counters.map((o) => [isNpc(o) ? o.id : '', take ? T.takesIns : T.noIns])));
    }
    setCountSource(base);
    commit(base, next, 0);
  };

  const nextHand = () => {
    roundBreak();
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    anim.clear();
    const { table: t, events: e } = betweenRounds(table, unit, settings.otherPlayers);
    setTable(t);
    if (e.length) setEvents((prev) => [...e, ...prev].slice(0, 3));
    // Shuffle now (not at the deal) when the cut card is out, so bet advice uses the new shoe.
    const handsNext = t.seats.filter((o) => o !== null).length;
    const fresh = shuffleIfNeeded({ ...game, phase: 'betting', hands: [], dealer: [] }, handsNext);
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
    betting ? settings.bankroll : countSource.bankroll,
    (step) => settings.soundEffects && playSound('tick', 1 + step * 0.06),
    !anim.reduceMotion,
  );

  const canDeal = betting && !needsRefill(bankroll) && !moveTo && bet >= unit && affordableSeats >= 1;
  useKeyboardShortcuts({
    ...Object.fromEntries(
      Object.entries(KEY_ACTIONS).map(([k, a]) => [k, settled && yourTurn && legal[a] ? () => onAction(a) : undefined]),
    ),
    enter: canDeal ? () => deal() : settled && game.phase === 'roundOver' ? () => nextHand() : undefined,
  });

  const waitingOn = activeHand && !isYours(activeHand) ? findNpc(table, activeHand.owner) : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: casino.name }} />
      {/* Status bar: chips, level and count */}
      <View style={styles.topBar}>
        <Text style={styles.bankroll}>{T.chips(formatChips(shownBankroll))}</Text>
        <Text style={styles.count} onPress={() => setCountVisible(!countVisible)} accessibilityRole="button">
          {countVisible
            ? T.count(
                `${countSource.runningCount >= 0 ? '+' : ''}${countSource.runningCount}`,
                decksRemaining(countSource.shoe.length),
                formatTrueCount(shownTc),
              )
            : T.tapCount}
        </Text>
      </View>
      <LevelBar xp={stats.xp} compact />
      {game.justShuffled && <Text style={styles.shuffle}>{T.shuffled}</Text>}

      <StreakBadge streak={streak} />

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
          onAction={onAction}
        />
      )}

      {settled && game.phase === 'insurance' && (
        <InsurancePanel
          hint={showHints ? (useDeviations && shouldTakeInsurance(tc) ? T.hintTake : T.hintDecline) : null}
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

      {betting && (
        <BettingPanel
          casino={casino}
          bet={bet}
          setBet={setBet}
          yourSeatCount={yourSeatCount}
          affordableSeats={affordableSeats}
          maxPerHand={maxPerHand}
          suggestedUnits={countVisible ? suggestedBetUnits(flooredTrueCount(game.runningCount, game.shoe.length)) : null}
          outOfChips={needsRefill(bankroll)}
          moveTo={moveTo}
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
