// The table's deal animation: the same as useDealAnimation (cards deal in one by
// one with sounds and haptics, then the result pops up) with an adjustable deal
// speed, so the casino-conditions test can deal faster. If useDealAnimation
// gains a `stepMs` option, this file can go.
import { useEffect, useRef, useState } from 'react';

import { haptic } from '../../audio/haptics';
import { playSound, preloadSounds } from '../../audio/sounds';
import { DEAL_STEP_MS, DealSchedule, dealSchedule, hapticSchedule } from '../../engine/dealSchedule';
import { GameState } from '../../engine/game';
import { roundFanfare } from '../../engine/juice';
import { useSettings } from '../../state/settings';
import { useShake } from '../juice';
import type { ShownFanfare } from '../useDealAnimation';
import { useReduceMotion } from '../useReduceMotion';


/** `stepMs`: time between cards (the normal table uses DEAL_STEP_MS). */
export function useTableDealAnimation(stepMs = DEAL_STEP_MS) {
  const { settings } = useSettings();
  const reduceMotion = useReduceMotion();
  const shake = useShake();
  const [schedule, setSchedule] = useState<DealSchedule | null>(null);
  const [settled, setSettled] = useState(true);
  const [fanfare, setFanfare] = useState<ShownFanfare | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    preloadSounds();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  /** Animates the move from `prev` to `next`; `onLand` runs once the last card is down. */
  const play = (prev: GameState, next: GameState, onLand?: () => void) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFanfare(null);
    const step = reduceMotion ? 0 : stepMs;
    const s = dealSchedule(prev, next, step);
    if (settings.soundEffects) {
      for (const sound of s.sounds) timers.current.push(setTimeout(() => playSound(sound.name), sound.at));
    }
    if (settings.haptics) {
      for (const h of hapticSchedule(next, s, step)) timers.current.push(setTimeout(() => haptic(h.kind), h.at));
    }
    setSchedule(s);
    const land = () => {
      setSettled(true);
      onLand?.();
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

  /** Forgets the last deal, e.g. when the table is cleared for the next hand. */
  const clear = () => {
    setSchedule(null);
    setFanfare(null);
  };

  return {
    play,
    clear,
    schedule,
    settled,
    fanfare,
    setFanfare,
    shakeStyle: shake.style,
    reduceMotion,
    /** Effects (bursts, shakes) are on: the setting is on and Reduce Motion is off. */
    effects: settings.bigEffects && !reduceMotion,
  };
}
