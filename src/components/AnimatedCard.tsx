import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Card } from '../engine/cards';
import { CARD_ANIM_MS } from '../engine/dealSchedule';
import { PlayingCard } from './PlayingCard';

interface Props {
  card: Card;
  faceDown: boolean;
  size: 'xs' | 'sm' | 'md' | 'lg';
  /** Delay before the card slides in from the shoe, in ms. */
  dealDelay: number;
  /** Delay before a face-down card turns over once `faceDown` becomes false. */
  flipDelay: number;
  instant: boolean;
}

/**
 * A card that slides in from the shoe (top right) when it mounts and flips when revealed.
 *
 * The motion runs in Reanimated on the UI thread: each frame is computed from the clock,
 * delays included, so a busy JavaScript thread or a re-render mid-deal can't hold a card
 * in the air, and ProMotion screens get a new position every frame at 120 Hz.
 *
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

// A smooth throw that slows into place. It starts at about 2x average speed: an overshooting
// curve (or a much steeper start) moves the card some 60 px per frame at first, which reads as
// a stutter, and the card would be most of the way there before it could fade in.
const DEAL_EASING = Easing.bezier(0.3, 0.7, 0.3, 1);
const FLIP_EASING = Easing.inOut(Easing.quad);

function AnimatedCardView({ card, faceDown, size, dealDelay, flipDelay, instant }: Props) {
  const deal = useSharedValue(instant ? 1 : 0);
  // 0 = showing the back, 1 = showing the face.
  const reveal = useSharedValue(faceDown ? 0 : 1);
  // A card dealt face down (the dealer's hole card) keeps its back on top, hidden at the
  // halfway point of the flip, so turning it over needs no re-render.
  const [hasBack] = useState(faceDown);

  useEffect(() => {
    if (instant) return;
    deal.value = withDelay(dealDelay, withTiming(1, { duration: CARD_ANIM_MS + 80, easing: DEAL_EASING }));
    return () => cancelAnimation(deal);
    // Runs once per card: later prop changes must not re-deal it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (faceDown || instant) {
      cancelAnimation(reveal);
      reveal.value = faceDown ? 0 : 1;
      return;
    }
    // Squash to an edge, swap to the face at the halfway point, then open back up.
    reveal.value = withDelay(flipDelay, withTiming(1, { duration: CARD_ANIM_MS, easing: FLIP_EASING }));
    return () => cancelAnimation(reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceDown]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(deal.value, [0, 0.12, 1], [0, 1, 1]),
    transform: [
      { translateX: interpolate(deal.value, [0, 1], [140, 0]) },
      { translateY: interpolate(deal.value, [0, 1], [-220, 0]) },
      { rotate: `${interpolate(deal.value, [0, 1], [-25, 0])}deg` },
      { scaleX: interpolate(reveal.value, [0, 0.5, 1], [1, 0, 1]) },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({ opacity: reveal.value < 0.5 ? 1 : 0 }));

  // A card that starts face up and is later turned face down (not used at the table) just shows its back.
  if (faceDown && !hasBack) {
    return (
      <Animated.View style={cardStyle}>
        <PlayingCard faceDown size={size} />
      </Animated.View>
    );
  }
  return (
    <Animated.View style={cardStyle}>
      {/* Screen readers don't get the face while it's still hidden. */}
      <View aria-hidden={faceDown} importantForAccessibility={faceDown ? 'no-hide-descendants' : 'auto'}>
        <PlayingCard card={card} size={size} />
      </View>
      {hasBack && (
        <Animated.View style={[styles.back, backStyle]}>
          <PlayingCard faceDown size={size} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
});
