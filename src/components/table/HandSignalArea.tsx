// Casino hand signals on the felt: tap = Hit (like tapping the table), a sideways
// swipe = Stand (like waving a hand over your cards). Vertical drags still scroll.
import { ReactNode, useEffect, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { colors } from '../../theme';

/** Movement under this many px still counts as a tap. */
const TAP_SLOP = 10;
/** A swipe needs this much sideways travel, mostly horizontal. */
const SWIPE_MIN = 40;
const HORIZONTAL = 1.5;

export type Signal = 'hit' | 'stand';

/** Works out what a finished touch meant, from how far it moved. */
export function readSignal(dx: number, dy: number): Signal | null {
  if (Math.abs(dx) <= TAP_SLOP && Math.abs(dy) <= TAP_SLOP) return 'hit';
  if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) >= HORIZONTAL * Math.abs(dy)) return 'stand';
  return null;
}

/**
 * Wraps the felt. While `enabled`, a tap or a sideways swipe calls `onSignal`.
 * Horizontal drags are claimed so the page doesn't scroll; vertical drags are
 * handed back to the ScrollView.
 */
export function HandSignalArea({
  enabled,
  onSignal,
  children,
}: {
  enabled: boolean;
  onSignal: (s: Signal) => void;
  children: ReactNode;
}) {
  // One responder for the component's life (it tracks the gesture in progress); it reads
  // the latest props, handed over after each render.
  const [{ responder, update }] = useState(makeResponder);
  useEffect(() => update({ enabled, onSignal }));

  return (
    <View {...responder.panHandlers} style={[styles.area, enabled && styles.active]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: colors.gold, borderStyle: 'dashed' },
});

type Latest = { enabled: boolean; onSignal: (s: Signal) => void };

/** The gesture handlers, and `update` to give them the props they read when a touch happens. */
function makeResponder() {
  let latest: Latest = { enabled: false, onSignal: () => {} };
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => latest.enabled,
    // A sideways drag wins over the ScrollView; a vertical one doesn't.
    onMoveShouldSetPanResponderCapture: (_, g) =>
      latest.enabled && Math.abs(g.dx) > TAP_SLOP && Math.abs(g.dx) > HORIZONTAL * Math.abs(g.dy),
    onPanResponderTerminationRequest: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => {
      if (!latest.enabled) return;
      const s = readSignal(g.dx, g.dy);
      if (s) latest.onSignal(s);
    },
  });
  return { responder, update: (next: Latest) => void (latest = next) };
}
