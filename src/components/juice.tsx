// "Game feel" effects for the table: score pop-ups, chip bursts, screen shake,
// counting-up numbers and a streak badge.
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { seededRng } from '../engine/cards';
import { Fanfare, FanfareTier, countUpTicks } from '../engine/juice';
import { tr } from '../i18n/lang';
import { usePrefs } from '../state/settings';
import { colorblindColors, colors } from '../theme';

const TIER_COLOR: Record<FanfareTier, string> = {
  blackjack: colors.gold,
  bigWin: colors.gold,
  win: colors.good,
  push: colors.text,
  surrender: colors.muted,
  bust: colors.bad,
  lose: colors.bad,
};
const CHIP_COLORS = [colors.gold, '#E5484D', '#F4F1E8', '#3E9BFF', '#4ADE80'];

/**
 * Shakes whatever it wraps (a Reanimated `Animated.View`) when `shake(strength)` is called.
 * The whole sequence runs on the UI thread, so it stays smooth while the hand settles in JavaScript.
 */
export function useShake() {
  const x = useSharedValue(0);
  const shake = (strength: number) => {
    if (strength <= 0) return;
    const px = 4 + strength * 14;
    const step = (f: number) => withTiming(f * px, { duration: 45, easing: Easing.linear });
    x.value = withSequence(step(1), step(-0.8), step(0.6), step(-0.4), step(0.25), step(-0.1), step(0));
  };
  // A stable style, so memoized views that take it don't re-render.
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return { style, shake };
}

interface Particle {
  dx: number;
  dy: number;
  spin: number;
  color: string;
  size: number;
}

/** Big pop-up text plus a burst of chips, played once per new `fanfare.key`. */
export function FanfareOverlay({ fanfare, effects }: { fanfare: (Fanfare & { key: number }) | null; effects: boolean }) {
  const colorblind = usePrefs().settings.colorblind;
  const pop = useSharedValue(0);
  const burst = useSharedValue(0);

  const particles = useMemo<Particle[]>(() => {
    if (!fanfare || !effects) return [];
    // Seeded by the fanfare's key, so each burst is random but rendering stays pure.
    const random = seededRng(fanfare.key);
    return Array.from({ length: fanfare.particles }, () => {
      const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.3;
      const speed = 90 + random() * 150;
      return {
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        spin: (random() - 0.5) * 720,
        color: CHIP_COLORS[Math.floor(random() * CHIP_COLORS.length)],
        size: 8 + random() * 8,
      };
    });
  }, [fanfare, effects]);

  useEffect(() => {
    if (!fanfare) return;
    pop.value = 0;
    burst.value = 0;
    pop.value = withSequence(
      withSpring(1, { mass: 1, stiffness: 665, damping: 13 }),
      withDelay(700, withTiming(2, { duration: 350, easing: Easing.in(Easing.quad) })),
    );
    burst.value = withTiming(1, { duration: 1100, easing: Easing.linear });
  }, [fanfare, pop, burst]);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.2, 1, 2], [0, 1, 1, 0]),
    transform: [
      { scale: interpolate(pop.value, [0, 1, 2], [0.3, 1, 1.1]) },
      { translateY: interpolate(pop.value, [0, 1, 2], [10, 0, -40]) },
      { rotate: `${interpolate(pop.value, [0, 1, 2], [-8, -3, -3])}deg` },
    ],
  }));

  if (!fanfare) return null;
  const big = fanfare.tier === 'blackjack' || fanfare.tier === 'bigWin';
  const tierColor =
    colorblind && (fanfare.tier === 'win' || fanfare.tier === 'bust' || fanfare.tier === 'lose')
      ? fanfare.tier === 'win'
        ? colorblindColors.good
        : colorblindColors.bad
      : TIER_COLOR[fanfare.tier];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.center}>
        {particles.map((p, i) => (
          <Chip key={`${fanfare.key}-${i}`} p={p} burst={burst} />
        ))}
        <Animated.Text style={[styles.label, big && styles.big, { color: tierColor }, labelStyle]}>
          {fanfare.label}
        </Animated.Text>
      </View>
    </View>
  );
}

/** One chip of the burst: flies out and falls under gravity, y(t) = dy·t + g·t². */
function Chip({ p, burst }: { p: Particle; burst: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = burst.value;
    return {
      opacity: interpolate(t, [0, 0.75, 1], [1, 1, 0]),
      transform: [{ translateX: p.dx * t }, { translateY: p.dy * t + 380 * t * t }, { rotate: `${p.spin * t}deg` }],
    };
  });
  return (
    <Animated.View
      style={[styles.chip, { width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: p.color }, style]}
    />
  );
}

/**
 * Shows `value`, counting up to it (with a tick callback per step) when it
 * rises, and snapping straight down when it falls.
 */
export function useCountUp(value: number, onTick?: (step: number) => void, enabled = true): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  });

  useEffect(() => {
    const start = from.current;
    from.current = value;
    const ticks = enabled ? countUpTicks(value - start) : 0;
    if (ticks === 0) {
      setShown(value);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i >= ticks ? value : Math.round(start + ((value - start) * i) / ticks));
      tickRef.current?.(i);
      if (i >= ticks) clearInterval(id);
    }, 65);
    return () => clearInterval(id);
  }, [value, enabled]);

  return shown;
}

/** A small badge that pops whenever the streak grows. */
export function StreakBadge({ streak }: { streak: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (streak < 2) return;
    scale.value = 1.5;
    scale.value = withSpring(1, { mass: 1, stiffness: 809, damping: 10 });
  }, [streak, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: '-4deg' }] }));
  if (streak < 2) return null;
  const hot = streak >= 10;
  return (
    <Animated.View style={[styles.badge, hot && styles.badgeHot, style]}>
      <Text style={[styles.badgeText, hot && { color: colors.black }]}>{tr('STREAK', 'RACHA')} ×{streak}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Solid edges: dashed borders are slow to draw on Android, and two dozen of these fly at once.
  chip: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)' },
  label: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  big: { fontSize: 44 },
  badge: {
    alignSelf: 'center',
    backgroundColor: colors.feltDark,
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  badgeHot: { backgroundColor: colors.gold },
  badgeText: { color: colors.gold, fontWeight: '900', letterSpacing: 1 },
});
