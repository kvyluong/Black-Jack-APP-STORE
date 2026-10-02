import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { SoundName } from '../engine/dealSchedule';

const SOURCES: Record<SoundName, number> = {
  card: require('../../assets/sounds/card.wav'),
  flip: require('../../assets/sounds/flip.wav'),
  chips: require('../../assets/sounds/chips.wav'),
  win: require('../../assets/sounds/win.wav'),
  blackjack: require('../../assets/sounds/blackjack.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  push: require('../../assets/sounds/push.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
};

/** Card sounds can overlap when dealt quickly, so they get a few players each. */
const POOL_SIZE: Partial<Record<SoundName, number>> = { card: 3 };
const VOLUME: Partial<Record<SoundName, number>> = { card: 0.8, flip: 0.8, shuffle: 0.7 };

type Pool = { players: AudioPlayer[]; next: number };
let pools: Partial<Record<SoundName, Pool>> | null = null;

function load(): Partial<Record<SoundName, Pool>> {
  if (pools) return pools;
  // Respect the iOS silent switch and let the player's own music keep playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  const loaded: Partial<Record<SoundName, Pool>> = {};
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    const players = Array.from({ length: POOL_SIZE[name] ?? 1 }, () => {
      const p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name] ?? 1;
      return p;
    });
    loaded[name] = { players, next: 0 };
  }
  pools = loaded;
  return loaded;
}

/** Loads the sounds ahead of time so the first deal isn't silent. */
export function preloadSounds() {
  try {
    load();
  } catch {
    // Audio unavailable on this device; the game works without it.
  }
}

export function playSound(name: SoundName) {
  try {
    const pool = load()[name];
    if (!pool) return;
    const player = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Ignore audio errors; sound is never required to play.
  }
}
