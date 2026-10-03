// Plays the same synthesized sounds as the mobile app (assets/sounds), embedded in the page.
import blackjack from '../assets/sounds/blackjack.wav';
import bust from '../assets/sounds/bust.wav';
import card from '../assets/sounds/card.wav';
import chips from '../assets/sounds/chips.wav';
import correct from '../assets/sounds/correct.wav';
import flip from '../assets/sounds/flip.wav';
import lose from '../assets/sounds/lose.wav';
import push from '../assets/sounds/push.wav';
import shuffle from '../assets/sounds/shuffle.wav';
import tick from '../assets/sounds/tick.wav';
import win from '../assets/sounds/win.wav';
import wrong from '../assets/sounds/wrong.wav';
import type { SoundName } from '../src/engine/dealSchedule';

const BYTES: Record<SoundName, Uint8Array> = {
  card,
  flip,
  chips,
  win,
  blackjack,
  lose,
  push,
  shuffle,
  bust,
  correct,
  wrong,
  tick,
};
const VOLUME: Partial<Record<SoundName, number>> = { card: 0.8, flip: 0.8, shuffle: 0.7, tick: 0.6 };

let ctx: AudioContext | null = null;
const buffers: Partial<Record<SoundName, AudioBuffer>> = {};

/** Browsers only allow audio after a click or key press; call this from one. */
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    ctx = new AudioContext();
  } catch {
    return; // No Web Audio: play silently.
  }
  for (const name of Object.keys(BYTES) as SoundName[]) {
    const copy = BYTES[name].slice().buffer;
    ctx.decodeAudioData(copy).then((b) => (buffers[name] = b)).catch(() => {});
  }
}

/** Plays a sound; `rate` above 1 plays it faster and higher (used for streaks). */
export function playSound(name: SoundName, rate = 1) {
  const buffer = buffers[name];
  if (!ctx || !buffer) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = VOLUME[name] ?? 1;
  src.buffer = buffer;
  src.playbackRate.value = rate;
  src.connect(gain).connect(ctx.destination);
  src.start();
}
