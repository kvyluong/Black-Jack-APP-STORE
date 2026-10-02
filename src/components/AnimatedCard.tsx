import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { Card } from '../engine/cards';
import { CARD_ANIM_MS } from '../engine/dealSchedule';
import { PlayingCard } from './PlayingCard';

interface Props {
  card: Card;
  faceDown: boolean;
  size: 'sm' | 'md';
  /** Delay before the card slides in from the shoe, in ms. */
  dealDelay: number;
  /** Delay before a face-down card turns over once `faceDown` becomes false. */
  flipDelay: number;
  instant: boolean;
}

/** A card that slides in from the shoe (top right) when it mounts and flips when revealed. */
export function AnimatedCard({ card, faceDown, size, dealDelay, flipDelay, instant }: Props) {
  const deal = useRef(new Animated.Value(instant ? 1 : 0)).current;
  const flip = useRef(new Animated.Value(1)).current;
  const [showBack, setShowBack] = useState(faceDown);

  useEffect(() => {
    if (instant) return;
    const anim = Animated.timing(deal, {
      toValue: 1,
      duration: CARD_ANIM_MS,
      delay: dealDelay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Runs once per card: later prop changes must not re-deal it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (faceDown || !showBack) {
      setShowBack(faceDown);
      return;
    }
    if (instant) {
      setShowBack(false);
      return;
    }
    // Squash to an edge, swap to the face, then open back up.
    const half = CARD_ANIM_MS / 2;
    const anim = Animated.sequence([
      Animated.delay(flipDelay),
      Animated.timing(flip, { toValue: 0, duration: half, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (!finished) return;
      setShowBack(false);
      Animated.timing(flip, { toValue: 1, duration: half, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceDown]);

  const style = {
    opacity: deal.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateX: deal.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) },
      { translateY: deal.interpolate({ inputRange: [0, 1], outputRange: [-220, 0] }) },
      { rotate: deal.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
      { scaleX: flip },
    ],
  };

  return (
    <Animated.View style={style}>
      <PlayingCard card={card} faceDown={showBack} size={size} />
    </Animated.View>
  );
}
