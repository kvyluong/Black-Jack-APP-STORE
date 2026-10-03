import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useInterstitial } from '../ads/useInterstitial';
import { playSound, preloadSounds } from '../audio/sounds';
import { HandView } from '../components/HandView';
import { FanfareOverlay, StreakBadge, useCountUp, useShake } from '../components/juice';
import { SeatView } from '../components/SeatView';
import { Button, Panel, Screen, Segmented } from '../components/ui';
import { useReduceMotion } from '../components/useReduceMotion';
import { decksRemaining, flooredTrueCount, shouldTakeInsurance, suggestedBetUnits } from '../engine/counting';
import { DEAL_STEP_MS, DealSchedule, cardDelay, dealSchedule } from '../engine/dealSchedule';
import {
  GameState,
  Outcome,
  YOU,
  act,
  currentTrueCount,
  decisionContext,
  isYours,
  legalActions,
  newGame,
  resolveInsurance,
  startRound,
} from '../engine/game';
import { Fanfare, roundFanfare, streakPitch } from '../engine/juice';
import { ACTION_LABEL, Action, formatTrueCount, recommend } from '../engine/strategy';
import {
  SEAT_COUNT,
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
import { STARTING_BANKROLL, useSettings } from '../state/settings';
import { colors, spacing } from '../theme';

const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];
const OUTCOME_LABEL: Record<Outcome, string> = {
  win: 'Win',
  lose: 'Lose',
  push: 'Push',
  blackjack: 'Blackjack!',
  surrender: 'Surrendered',
};
const QUIZ_CHANCE = 0.25;
/** How long a computer player "thinks" before acting. */
const NPC_THINK_MS = 650;
/** Seats from the player's point of view: seat 1 (first base) is on the right. */
const SEAT_ORDER = Array.from({ length: SEAT_COUNT }, (_, i) => SEAT_COUNT - 1 - i);
/** Seats sit on an arc around the dealer. */
const ARC = [0, 10, 16, 18, 16, 10, 0];

type Feedback = { ok: boolean; text: string } | null;

export default function Play() {
  const { ready, settings, updateSettings, updateStats } = useSettings();
  const { rules, showHints, correctMistakes, showCount, countQuizzes, useDeviations } = settings;
  const unit = settings.baseBet;
  const [game, setGame] = useState<GameState>(() => newGame(rules, settings.bankroll));
  const [table, setTable] = useState<Table>(() => createTable(settings.yourHands, unit, settings.otherPlayers));
  const [events, setEvents] = useState<TableEvent[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [bet, setBet] = useState(unit);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [countVisible, setCountVisible] = useState(showCount);
  const [quiz, setQuiz] = useState<{ guess: number; revealed: boolean } | null>(null);
  const roundBreak = useInterstitial();
  const [streak, setStreak] = useState(0);
  const [fanfare, setFanfare] = useState<(Fanfare & { key: number }) | null>(null);
  const shake = useShake();
  const reduceMotion = useReduceMotion();
  // What changed in the last move, so cards deal in one by one; controls wait until it's done.
  const [schedule, setSchedule] = useState<DealSchedule | null>(null);
  const [settled, setSettled] = useState(true);
  const [countSource, setCountSource] = useState<GameState>(game);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    preloadSounds();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  /** Moves the game to `next`, playing its deal animation and sounds. */
  const commit = (next: GameState) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFanfare(null);
    const s = dealSchedule(game, next, reduceMotion ? 0 : DEAL_STEP_MS);
    if (settings.soundEffects) {
      for (const sound of s.sounds) timers.current.push(setTimeout(() => playSound(sound.name), sound.at));
    }
    setSchedule(s);
    setGame(next);
    const land = () => {
      setSettled(true);
      setCountSource(next);
      const f = roundFanfare(next);
      if (f) {
        setFanfare({ ...f, key: Date.now() });
        if (settings.bigEffects && !reduceMotion) shake.shake(f.shake);
      }
    };
    if (s.doneAt > 0) {
      setSettled(false);
      timers.current.push(setTimeout(land, s.doneAt));
    } else {
      land();
    }
  };

  // Start a fresh shoe once saved settings load or the table rules change.
  useEffect(() => {
    if (!ready) return;
    const fresh = newGame(rules, settings.bankroll);
    setGame(fresh);
    setCountSource(fresh);
    setTable(createTable(settings.yourHands, unit, settings.otherPlayers));
    setEvents([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rules]);

  // Switching between 1 and 2 hands, or turning other players off, applies at the next deal.
  useEffect(() => {
    if (game.phase !== 'betting') return;
    setTable((t) => {
      const seated = setYourHands(t, settings.yourHands);
      return settings.otherPlayers ? seated : { ...seated, seats: seated.seats.map((o) => (isNpc(o) ? null : o)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.yourHands, settings.otherPlayers]);

  useEffect(() => setCountVisible(showCount), [showCount]);

  const activeHand = game.phase === 'playing' ? game.hands[game.active] : undefined;
  const yourTurn = isYours(activeHand);
  const legal = legalActions(game);
  const tc = currentTrueCount(game);
  // The count on screen only includes cards that have landed.
  const shownTc = currentTrueCount(countSource);
  const advice = useMemo(() => {
    const ctx = yourTurn ? decisionContext(game, useDeviations) : null;
    return ctx ? recommend(ctx) : null;
  }, [game, useDeviations, yourTurn]);

  const recordRoundEnd = (g: GameState) => {
    if (g.phase !== 'roundOver') return;
    updateSettings({ bankroll: g.bankroll });
    updateStats((s) => ({ ...s, handsPlayed: s.handsPlayed + 1 }));
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
          action === choice.book ? '' : npc.style === 'counter' ? ' · count play' : ` ✗ book: ${ACTION_LABEL[choice.book]}`;
        setBubbles((b) => ({ ...b, [npc.id]: `${ACTION_LABEL[action]}${note}` }));
      }
      const next = act(game, action);
      commit(next);
      recordRoundEnd(next);
    }, NPC_THINK_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, game]);

  const grade = (ok: boolean, text: string) => {
    const nextStreak = ok ? streak + 1 : 0;
    setStreak(nextStreak);
    // The chime climbs a semitone with every correct play in a row.
    if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong', ok ? streakPitch(nextStreak) : 1);
    updateStats((s) => ({ ...s, decisions: s.decisions + 1, correctDecisions: s.correctDecisions + (ok ? 1 : 0) }));
    if (!ok && correctMistakes) setFeedback({ ok, text });
    else if (ok) setFeedback({ ok, text: nextStreak >= 5 ? `Correct! ${nextStreak} in a row 🔥` : 'Correct!' });
  };

  const onAction = (action: Action) => {
    if (advice) {
      const ok = action === advice.action;
      grade(ok, `Best play: ${ACTION_LABEL[advice.action]}. ${advice.reason}`);
    }
    const next = act(game, action);
    commit(next);
    recordRoundEnd(next);
  };

  const onInsurance = (take: boolean) => {
    const best = useDeviations && shouldTakeInsurance(tc);
    grade(
      take === best,
      best
        ? `Take insurance: the true count is ${formatTrueCount(tc)} (+3 or more), so over a third of the remaining cards are 10s.`
        : 'Decline insurance. It loses money in the long run unless the true count is +3 or higher.',
    );
    const next = resolveInsurance(game, take);
    commit(next);
    recordRoundEnd(next);
  };

  // You play as many of your seats as your bankroll covers.
  const yourSeatCount = table.seats.filter((o) => o === YOU).length;
  const affordableSeats = Math.min(yourSeatCount, Math.floor(game.bankroll / bet));

  const deal = () => {
    setFeedback(null);
    setQuiz(null);
    setBubbles({});
    let skip = yourSeatCount - affordableSeats;
    const bets = roundBets(table, bet, currentTrueCount(game), unit).filter((b) => b.owner !== YOU || skip-- <= 0);
    const next = startRound(game, bets);
    if (next.phase === 'insurance') {
      // Card counters at the table take insurance when the count is high.
      const counters = table.seats.filter((o) => isNpc(o) && o.style === 'counter');
      const take = shouldTakeInsurance(currentTrueCount(next));
      setBubbles(Object.fromEntries(counters.map((o) => [isNpc(o) ? o.id : '', take ? 'Takes insurance' : 'No insurance'])));
    }
    commit(next);
    recordRoundEnd(next);
  };

  const nextHand = () => {
    roundBreak();
    setFeedback(null);
    setQuiz(null);
    setSchedule(null);
    setFanfare(null);
    setBubbles({});
    const { table: t, events: e } = betweenRounds(table, unit, settings.otherPlayers);
    setTable(t);
    if (e.length) setEvents((prev) => [...e, ...prev].slice(0, 3));
    setGame((g) => ({ ...g, phase: 'betting', hands: [], dealer: [] }));
  };

  const resetBankroll = () => {
    setGame((g) => ({ ...g, bankroll: STARTING_BANKROLL }));
    setCountSource((g) => ({ ...g, bankroll: STARTING_BANKROLL }));
    updateSettings({ bankroll: STARTING_BANKROLL });
  };

  // Winnings count up into the bankroll with rising ticks.
  const shownBankroll = useCountUp(
    countSource.bankroll,
    (step) => settings.soundEffects && playSound('tick', 1 + step * 0.06),
    !reduceMotion,
  );

  const suggestedUnits = suggestedBetUnits(flooredTrueCount(game.runningCount, game.shoe.length));
  const hideHole = !game.holeRevealed && game.dealer.length > 0;
  // Your hands, shown large, in the same left-to-right order as the seats.
  const yourHands = game.hands.map((h, i) => ({ h, i })).filter(({ h }) => isYours(h)).reverse();
  const waitingOn = activeHand && !isYours(activeHand) ? findNpc(table, activeHand.owner) : undefined;

  return (
    <Screen>
      {/* Status bar: bankroll and count */}
      <View style={styles.topBar}>
        <Text style={styles.bankroll}>Bankroll ${shownBankroll.toFixed(shownBankroll % 1 ? 2 : 0)}</Text>
        {countVisible ? (
          <Text style={styles.count} onPress={() => setCountVisible(false)} accessibilityRole="button">
            RC {countSource.runningCount >= 0 ? '+' : ''}
            {countSource.runningCount} · Decks {decksRemaining(countSource.shoe.length)} · TC {formatTrueCount(shownTc)}
          </Text>
        ) : (
          <Text style={styles.count} onPress={() => setCountVisible(true)} accessibilityRole="button">
            Tap to check count
          </Text>
        )}
      </View>
      {game.justShuffled && game.phase !== 'betting' && <Text style={styles.shuffle}>New shoe shuffled · count resets to 0</Text>}

      <StreakBadge streak={streak} />

      <Animated.View style={shake.style}>
        {/* Dealer */}
        <View style={styles.dealer}>
          {game.dealer.length > 0 ? (
            <HandView
              cards={game.dealer}
              hideHole={hideHole}
              label="Dealer"
              size="sm"
              dealDelay={(i) => cardDelay(schedule, 'dealer', i)}
              flipDelay={schedule?.holeFlipAt ?? 0}
              settling={!settled && game.holeRevealed}
              instant={reduceMotion}
            />
          ) : (
            <Text style={styles.placeholder}>
              ${unit} minimum · {rules.decks} deck{rules.decks > 1 ? 's' : ''} · Dealer{' '}
              {rules.dealerHitsSoft17 ? 'hits soft 17' : 'stands on all 17s'} · Blackjack pays{' '}
              {rules.blackjackPayout === 1.5 ? '3:2' : '6:5'}
            </Text>
          )}
        </View>

        {/* The seats, on an arc; seat 1 is on the right and is dealt first. */}
        <View style={styles.seats}>
          {SEAT_ORDER.map((seat, pos) => (
            <View key={seat} style={{ flex: 1, marginTop: ARC[pos] }}>
              <SeatView
                seat={seat}
                occupant={table.seats[seat]}
                game={game}
                schedule={schedule}
                settled={settled}
                instant={reduceMotion}
                bubble={isNpc(table.seats[seat]) ? bubbles[(table.seats[seat] as { id: string }).id] : undefined}
              />
            </View>
          ))}
        </View>

        {/* Your hands */}
        <View style={[styles.area, styles.playerRow]}>
          {yourHands.map(({ h, i }) => (
            <HandView
              key={i}
              cards={h.cards}
              size={yourHands.length > 2 || (yourHands.length > 1 && yourHands.some(({ h: x }) => x.cards.length >= 4)) ? 'sm' : 'md'}
              active={game.phase === 'playing' && i === game.active}
              label={`Seat ${h.seat + 1}`}
              result={h.outcome ? `${OUTCOME_LABEL[h.outcome]}` : `$${h.bet}`}
              dealDelay={(c) => cardDelay(schedule, i, c)}
              settling={!settled}
              instant={reduceMotion}
            />
          ))}
        </View>
        <FanfareOverlay fanfare={fanfare} effects={settings.bigEffects && !reduceMotion} />
      </Animated.View>

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

      {feedback && (
        <Panel style={{ borderLeftWidth: 4, borderLeftColor: feedback.ok ? colors.good : colors.bad }}>
          <Text style={{ color: feedback.ok ? colors.good : colors.bad, fontWeight: '700' }}>
            {feedback.ok ? '✓ ' : '✗ '}
            {feedback.text}
          </Text>
        </Panel>
      )}

      {/* Controls */}
      {settled && waitingOn && <Text style={styles.waiting}>{waitingOn.name} is playing…</Text>}

      {settled && yourTurn && (
        <>
          {showHints && advice && (
            <Text style={styles.hint}>
              Seat {activeHand!.seat + 1} · Coach: {ACTION_LABEL[advice.action]}
              {advice.deviation ? ' (count play)' : ''}
            </Text>
          )}
          <View style={styles.actions}>
            {ACTIONS.filter((a) => a !== 'surrender' || rules.lateSurrender).map((a) => (
              <Button
                key={a}
                title={ACTION_LABEL[a]}
                variant="secondary"
                disabled={!legal[a]}
                highlighted={showHints && advice?.action === a}
                onPress={() => onAction(a)}
                style={styles.actionButton}
              />
            ))}
          </View>
        </>
      )}

      {settled && game.phase === 'insurance' && (
        <Panel>
          <Text style={styles.prompt}>Dealer shows an Ace. Insurance?</Text>
          {showHints && (
            <Text style={styles.hint}>
              Coach: {useDeviations && shouldTakeInsurance(tc) ? 'Take it (TC +3 or higher)' : 'Decline'}
            </Text>
          )}
          <View style={styles.actions}>
            <Button title="Take insurance" variant="secondary" onPress={() => onInsurance(true)} style={styles.actionButton} />
            <Button title="No insurance" variant="secondary" onPress={() => onInsurance(false)} style={styles.actionButton} />
          </View>
        </Panel>
      )}

      {settled && game.phase === 'roundOver' && (
        <Panel>
          <Text style={[styles.prompt, { color: game.lastNet > 0 ? colors.good : game.lastNet < 0 ? colors.bad : colors.text }]}>
            {game.lastNet > 0 ? `You won $${game.lastNet}` : game.lastNet < 0 ? `You lost $${-game.lastNet}` : 'Push'}
          </Text>
          {quiz && <CountQuiz quiz={quiz} setQuiz={setQuiz} actual={game.runningCount} />}
          <Button title="Next hand" onPress={nextHand} />
        </Panel>
      )}

      {game.phase === 'betting' && (
        <Panel>
          {/* Like spreading to a second betting spot at a real table: choose before each deal. */}
          <Segmented
            options={[
              { label: 'Play 1 hand', value: 1 },
              { label: 'Play 2 hands', value: 2 },
            ]}
            value={settings.yourHands}
            onChange={(v) => updateSettings({ yourHands: v })}
          />
          <Text style={styles.prompt}>
            Bet ${bet} {yourSeatCount > 1 ? `on each of your ${yourSeatCount} hands` : ''}
          </Text>
          {countVisible && (
            <Text style={styles.hint}>
              Count suggests {suggestedUnits} unit{suggestedUnits > 1 ? 's' : ''} (${suggestedUnits * unit}) per hand
            </Text>
          )}
          <View style={styles.actions}>
            {[-unit, unit, unit * 5].map((d) => (
              <Button
                key={d}
                title={d < 0 ? `−$${-d}` : `+$${d}`}
                variant="ghost"
                disabled={bet + d < unit || (bet + d) * yourSeatCount > game.bankroll}
                onPress={() => setBet(bet + d)}
                style={styles.actionButton}
              />
            ))}
          </View>
          {affordableSeats >= 1 ? (
            <Button title={affordableSeats < yourSeatCount ? 'Deal (1 hand: low on chips)' : 'Deal'} onPress={deal} />
          ) : game.bankroll >= unit ? (
            <Button title={`Lower bet to $${unit}`} onPress={() => setBet(unit)} />
          ) : (
            <Button title={`Out of chips: reset to $${STARTING_BANKROLL}`} onPress={resetBankroll} />
          )}
        </Panel>
      )}
    </Screen>
  );
}

function CountQuiz({
  quiz,
  setQuiz,
  actual,
}: {
  quiz: { guess: number; revealed: boolean };
  setQuiz: (q: { guess: number; revealed: boolean }) => void;
  actual: number;
}) {
  const { updateStats } = useSettings();
  const { guess, revealed } = quiz;
  const ok = guess === actual;
  return (
    <View style={{ gap: spacing(1) }}>
      <Text style={styles.prompt}>Pop quiz: what's the running count?</Text>
      <View style={[styles.actions, { alignItems: 'center' }]}>
        <Button title="−" variant="ghost" disabled={revealed} onPress={() => setQuiz({ guess: guess - 1, revealed })} />
        <Text style={styles.guess}>
          {guess > 0 ? '+' : ''}
          {guess}
        </Text>
        <Button title="+" variant="ghost" disabled={revealed} onPress={() => setQuiz({ guess: guess + 1, revealed })} />
        {!revealed && (
          <Button
            title="Check"
            variant="secondary"
            onPress={() => {
              setQuiz({ guess, revealed: true });
              if (ok) updateStats((s) => ({ ...s, countDrillsPassed: s.countDrillsPassed + 1 }));
            }}
          />
        )}
      </View>
      {revealed && (
        <Text style={{ color: ok ? colors.good : colors.bad, fontWeight: '700' }}>
          {ok ? '✓ Spot on!' : `✗ It was ${actual > 0 ? '+' : ''}${actual}.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  bankroll: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  count: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  shuffle: { color: colors.warn, textAlign: 'center', fontSize: 13 },
  dealer: { minHeight: 100, alignItems: 'center', justifyContent: 'center' },
  seats: { flexDirection: 'row', gap: 2, minHeight: 150 },
  area: { minHeight: 130, alignItems: 'center', justifyContent: 'center' },
  playerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  placeholder: { color: colors.muted, textAlign: 'center' },
  events: { gap: 2 },
  event: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  waiting: { color: colors.muted, textAlign: 'center', fontStyle: 'italic' },
  hint: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  actionButton: { minWidth: 96, flexGrow: 1 },
  guess: { color: colors.text, fontSize: 24, fontWeight: '800', minWidth: 48, textAlign: 'center' },
});
