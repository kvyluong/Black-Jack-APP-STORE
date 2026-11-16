import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LegalActions } from '../../engine/game';
import { ACTION_LABEL, Action, Recommendation } from '../../engine/strategy';
import { localized } from '../../i18n/lang';
import { colors, spacing } from '../../theme';
import { Icon, IconName } from '../Icon';
import { Button, Panel } from '../ui';

const T = localized({
  en: {
    coachSeat: (seat: number, action: string) => `Seat ${seat} · Coach: ${action}`,
    countPlay: ' (count play)',
    prompt: 'Dealer shows an Ace. Insurance?',
    coach: (hint: string) => `Coach: ${hint}`,
    take: 'Take insurance',
    decline: 'No insurance',
    signals: 'Tap the felt to hit · Swipe sideways to stand',
    askCoach: 'Ask the coach',
  },
  es: {
    coachSeat: (seat: number, action: string) => `Asiento ${seat} · Coach: ${action}`,
    countPlay: ' (jugada por conteo)',
    prompt: 'El crupier muestra un As. ¿Seguro?',
    coach: (hint: string) => `Coach: ${hint}`,
    take: 'Tomar seguro',
    decline: 'Sin seguro',
    signals: 'Toca el paño para pedir · Desliza de lado para plantarte',
    askCoach: 'Pregúntale al coach',
  },
});

const MAIN: Action[] = ['hit', 'stand'];
const MORE: Action[] = ['double', 'split', 'surrender'];

/**
 * Each play's icon and color, so the buttons read at a glance: green to take a card, red to
 * stop, gold to double. Text colors keep at least 4.5:1 contrast on their fill.
 */
const PLAY_STYLE: Record<Action, { icon: IconName; bg: string; edge: string; fg: string }> = {
  hit: { icon: 'hit', bg: '#1F8A50', edge: '#14653A', fg: '#FFFFFF' },
  stand: { icon: 'stand', bg: '#B8352F', edge: '#86231F', fg: '#FFFFFF' },
  double: { icon: 'double', bg: colors.gold, edge: '#B8962B', fg: colors.black },
  split: { icon: 'split', bg: '#2C64A8', edge: '#1F4A7E', fg: '#FFFFFF' },
  surrender: { icon: 'surrender', bg: 'rgba(255,255,255,0.14)', edge: 'rgba(0,0,0,0.3)', fg: colors.text },
};

/** One play: a solid tile with a darker bottom edge that presses down when tapped. */
function PlayButton({
  action,
  big,
  disabled,
  highlighted,
  dimmed,
  onPress,
}: {
  action: Action;
  big: boolean;
  disabled: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const p = PLAY_STYLE[action];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ACTION_LABEL[action]}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.play,
        big && styles.playBig,
        { backgroundColor: p.bg, borderBottomColor: p.edge },
        pressed && styles.pressed,
        highlighted && styles.highlighted,
        disabled && styles.disabled,
        dimmed && styles.dimmed,
      ]}
    >
      <Icon name={p.icon} size={big ? 20 : 16} color={p.fg} />
      <Text style={[styles.playText, big && styles.playTextBig, { color: p.fg }]}>{ACTION_LABEL[action]}</Text>
    </Pressable>
  );
}

/** Hit and Stand have casino hand signals; the other plays still use the buttons. */
const SIGNALED: Action[] = ['hit', 'stand'];

/**
 * Your turn: Hit / Stand / Double / Split / Surrender. With hints on, the coach waits to be
 * asked: "Ask the coach" shows and highlights the best play for this decision only (the bar
 * remounts for each decision, so it starts hidden again).
 * With `handSignals`, a hint explains the felt gestures and Hit/Stand are dimmed (still tappable).
 */
export function ActionBar({
  seat,
  legal,
  advice,
  showHints,
  surrenderAllowed,
  handSignals = false,
  onAction,
}: {
  seat: number;
  legal: LegalActions;
  advice: Recommendation | null;
  showHints: boolean;
  surrenderAllowed: boolean;
  handSignals?: boolean;
  onAction: (a: Action) => void;
}) {
  const [asked, setAsked] = useState(false);
  const coach = showHints && asked;
  return (
    <>
      {showHints && advice && !asked && <CoachButton onPress={() => setAsked(true)} />}
      {coach && advice && (
        <Text style={styles.hint}>
          {T.coachSeat(seat + 1, ACTION_LABEL[advice.action])}
          {advice.deviation ? T.countPlay : ''}
        </Text>
      )}
      {handSignals && <Text style={styles.signals}>{T.signals}</Text>}
      {/* Hit and Stand, the plays you make most, get the big buttons; the rest sit below. */}
      {[MAIN, MORE].map((row, r) => (
        <View key={r} style={styles.actions}>
          {row
            .filter((a) => a !== 'surrender' || surrenderAllowed)
            .map((a) => (
              <PlayButton
                key={a}
                action={a}
                big={r === 0}
                disabled={!legal[a]}
                highlighted={coach && advice?.action === a}
                dimmed={handSignals && SIGNALED.includes(a)}
                onPress={() => onAction(a)}
              />
            ))}
        </View>
      ))}
    </>
  );
}

/** The dealer shows an Ace: take insurance or not. */
export function InsurancePanel({ hint, onChoose }: { hint: string | null; onChoose: (take: boolean) => void }) {
  const [asked, setAsked] = useState(false);
  return (
    <Panel>
      <Text style={styles.prompt}>{T.prompt}</Text>
      {hint && (asked ? <Text style={styles.hint}>{T.coach(hint)}</Text> : <CoachButton onPress={() => setAsked(true)} />)}
      <View style={styles.actions}>
        <Button title={T.take} variant="secondary" onPress={() => onChoose(true)} style={styles.actionButton} />
        <Button title={T.decline} variant="secondary" onPress={() => onChoose(false)} style={styles.actionButton} />
      </View>
    </Panel>
  );
}

/** A small link-style button that reveals the coach's advice. */
function CoachButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={T.askCoach} hitSlop={8} style={styles.askRow}>
      <Icon name="coach" size={16} />
      <Text style={styles.ask}>{T.askCoach}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  askRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center' },
  ask: { color: colors.gold, fontWeight: '700', textAlign: 'center', paddingVertical: 4, textDecorationLine: 'underline' },
  hint: { color: colors.gold, fontWeight: '700', textAlign: 'center' },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), justifyContent: 'center' },
  actionButton: { minWidth: 96, flexGrow: 1 },
  play: {
    flex: 1,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playBig: { paddingVertical: 15, borderRadius: 16 },
  playText: { fontWeight: '800', fontSize: 15 },
  playTextBig: { fontSize: 19 },
  // Pressed: the tile sinks onto its edge.
  pressed: { borderBottomWidth: 1, marginTop: 3, opacity: 0.92 },
  highlighted: { borderColor: '#FFF3B8', shadowColor: colors.gold, shadowOpacity: 0.95, shadowRadius: 10, elevation: 8 },
  disabled: { opacity: 0.3 },
  dimmed: { opacity: 0.55 },
  signals: { color: colors.text, textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
