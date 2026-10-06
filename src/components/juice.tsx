// "Game feel" effects for the table: score pop-ups, chip bursts, screen shake,
// counting-up numbers and a streak badge.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { seededRng } from '../engine/cards';
import { Fanfare, FanfareTier, countUpTicks } from '../engine/juice';
import { useSettings } from '../state/settings';
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

/** Shakes whatever it wraps when `shake(strength)` is called. */
export function useShake() {
  const x = useState(() => new Animated.Value(0))[0];
  const shake = (strength: number) => {
    if (strength <= 0) return;
    const px = 4 + strength * 14;
    const steps = [1, -0.8, 0.6, -0.4, 0.25, -0.1, 0].map((f) =>
      Animated.timing(x, { toValue: f * px, duration: 45, easing: Easing.linear, useNativeDriver: true }),
    );
    Animated.sequence(steps).start();
  };
  return { style: { transform: [{ translateX: x }] }, shake };
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
  const colorblind = useSettings().settings.colorblind;
  const pop = useState(() => new Animated.Value(0))[0];
  const burst = useState(() => new Animated.Value(0))[0];

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
    pop.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(pop, { toValue: 2, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [fanfare, pop, burst]);

  if (!fanfare) return null;
  const big = fanfare.tier === 'blackjack' || fanfare.tier === 'bigWin';
  const tierColor =
    colorblind && (fanfare.tier === 'win' || fanfare.tier === 'bust' || fanfare.tier === 'lose')
      ? fanfare.tier === 'win'
        ? colorblindColors.good
        : colorblindColors.bad
      : TIER_COLOR[fanfare.tier];
  // Each chip flies out and falls under gravity: y(t) = dy·t + g·t².
  const T = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.center}>
        {particles.map((p, i) => (
          <Animated.View
            key={`${fanfare.key}-${i}`}
            style={[
              styles.chip,
              {
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                opacity: burst.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateX: burst.interpolate({ inputRange: T, outputRange: T.map((t) => p.dx * t) }) },
                  { translateY: burst.interpolate({ inputRange: T, outputRange: T.map((t) => p.dy * t + 380 * t * t) }) },
                  { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
                ],
              },
            ]}
          />
        ))}
        <Animated.Text
          style={[
            styles.label,
            big && styles.big,
            {
              color: tierColor,
              opacity: pop.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
              transform: [
                { scale: pop.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.1] }) },
                { translateY: pop.interpolate({ inputRange: [0, 1, 2], outputRange: [10, 0, -40] }) },
                { rotate: pop.interpolate({ inputRange: [0, 1, 2], outputRange: ['-8deg', '-3deg', '-3deg'] }) },
              ],
            },
          ]}
        >
          {fanfare.label}
        </Animated.Text>
      </View>
    </View>
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
  const scale = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (streak < 2) return;
    scale.setValue(1.5);
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
  }, [streak, scale]);
  if (streak < 2) return null;
  const hot = streak >= 10;
  return (
    <Animated.View style={[styles.badge, hot && styles.badgeHot, { transform: [{ scale }, { rotate: '-4deg' }] }]}>
      <Text style={[styles.badgeText, hot && { color: colors.black }]}>STREAK ×{streak}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)', borderStyle: 'dashed' },
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
