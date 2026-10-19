import { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Card } from '../engine/cards';
import { CARD_ANIM_MS } from '../engine/dealSchedule';
import { PlayingCard } from './PlayingCard';

interface Props {
  card: Card;
  faceDown: boolean;
  size: 'xs' | 'sm' | 'md';
  /** Delay before the card slides in from the shoe, in ms. */
  dealDelay: number;
  /** Delay before a face-down card turns over once `faceDown` becomes false. */
  flipDelay: number;
  instant: boolean;
}

/**
 * An easing that holds at 0 for the first `wait` ms of a `total` ms animation, then runs
 * `ease` over the rest. React Native counts an animation's `delay` out in JavaScript and
 * only then hands the animation to the native side, so a dealt card would wake JavaScript
 * mid-deal and hitch the cards already flying. With the wait inside the curve, every card
 * starts at once when it appears, and the whole deal runs on the native animation thread.
 */
function afterWait(wait: number, total: number, ease: (t: number) => number) {
  if (wait <= 0) return ease;
  const start = wait / total;
  return (t: number) => (t <= start ? 0 : ease((t - start) / (1 - start)));
}

/**
 * A card that slides in from the shoe (top right) when it mounts and flips when revealed.
 * Memoized on what it shows: `dealDelay` is only read when the card mounts, so a new
 * deal schedule doesn't re-render the cards already on the table.
 */
export const AnimatedCard = memo(AnimatedCardView, (a, b) =>
  a.card.rank === b.card.rank &&
  a.card.suit === b.card.suit &&
  a.faceDown === b.faceDown &&
  a.size === b.size &&
  a.instant === b.instant,
);

function AnimatedCardView({ card, faceDown, size, dealDelay, flipDelay, instant }: Props) {
  const deal = useState(() => new Animated.Value(instant ? 1 : 0))[0];
  // 0 = showing the back, 1 = showing the face.
  const reveal = useState(() => new Animated.Value(faceDown ? 0 : 1))[0];
  // A card dealt face down (the dealer's hole card) keeps its back on top, faded out when it
  // turns over, so the flip needs no re-render halfway through.
  const [hasBack] = useState(faceDown);

  useEffect(() => {
    if (instant) return;
    const duration = dealDelay + CARD_ANIM_MS + 80;
    const anim = Animated.timing(deal, {
      toValue: 1,
      duration,
      // Overshoot slightly so the card lands with a little bounce.
      easing: afterWait(dealDelay, duration, Easing.out(Easing.back(1.6))),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Runs once per card: later prop changes must not re-deal it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (faceDown) {
      reveal.setValue(0);
      return;
    }
    if (instant) {
      reveal.setValue(1);
      return;
    }
    // Squash to an edge, swap to the face at the halfway point, then open back up.
    const duration = flipDelay + CARD_ANIM_MS;
    const anim = Animated.timing(reveal, {
      toValue: 1,
      duration,
      easing: afterWait(flipDelay, duration, Easing.inOut(Easing.quad)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceDown]);

  // Built once: the animated values never change, so neither do their interpolations.
  const [styles_] = useState(() => ({
    card: {
      opacity: deal.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
      transform: [
        { translateX: deal.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) },
        { translateY: deal.interpolate({ inputRange: [0, 1], outputRange: [-220, 0] }) },
        { rotate: deal.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
        { scaleX: reveal.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 1] }) },
      ],
    },
    back: { opacity: reveal.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [1, 1, 0, 0] }) },
  }));

  // A card that starts face up and is later turned face down (not used at the table) just shows its back.
  if (faceDown && !hasBack) {
    return (
      <Animated.View style={styles_.card}>
        <PlayingCard faceDown size={size} />
      </Animated.View>
    );
  }
  return (
    <Animated.View style={styles_.card}>
      {/* Screen readers don't get the face while it's still hidden. */}
      <View aria-hidden={faceDown} importantForAccessibility={faceDown ? 'no-hide-descendants' : 'auto'}>
        <PlayingCard card={card} size={size} />
      </View>
      {hasBack && (
        <Animated.View style={[styles.back, styles_.back]}>
          <PlayingCard faceDown size={size} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
});
