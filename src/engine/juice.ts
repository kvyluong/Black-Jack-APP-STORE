import { localized } from '../i18n/lang';
import { GameState, isYours } from './game';
import { isBust } from './hand';

/** How loudly to celebrate (or commiserate) a finished round. */
export type FanfareTier = 'blackjack' | 'bigWin' | 'win' | 'push' | 'surrender' | 'bust' | 'lose';

export interface Fanfare {
  tier: FanfareTier;
  /** Big pop-up text over the table. */
  label: string;
  /** Bankroll change for the round. */
  net: number;
  /** Screen shake strength, 0 (none) to 1 (huge). */
  shake: number;
  /** Number of chip particles to burst. */
  particles: number;
}

const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;

const T = localized({
  en: {
    blackjack: 'BLACKJACK!',
    bigWin: (m: string) => `BIG WIN +${m}`,
    push: 'PUSH',
    surrender: (m: string) => `SURRENDER −${m}`,
    bust: 'BUST',
  },
  es: {
    blackjack: '¡BLACKJACK!',
    bigWin: (m: string) => `¡GRAN PREMIO! +${m}`,
    push: 'EMPATE',
    surrender: (m: string) => `RENDIDO −${m}`,
    bust: '¡TE PASASTE!',
  },
});

/** Decides the celebration for a finished round. Returns null mid-round. */
export function roundFanfare(g: GameState): Fanfare | null {
  const yours = g.hands.filter(isYours);
  if (g.phase !== 'roundOver' || yours.length === 0) return null;
  const net = g.lastNet;
  // What you put out before doubling or splitting: the first hand at each of your seats.
  const originalBet = yours
    .filter((h, i) => yours.findIndex((x) => x.seat === h.seat) === i)
    .reduce((sum, h) => sum + (h.doubled ? h.bet / 2 : h.bet), 0);

  if (yours.some((h) => h.outcome === 'blackjack')) {
    return { tier: 'blackjack', label: T.blackjack, net, shake: 0.8, particles: 42 };
  }
  if (net > originalBet) {
    return { tier: 'bigWin', label: T.bigWin(money(net)), net, shake: 0.5, particles: 28 };
  }
  if (net > 0) return { tier: 'win', label: `+${money(net)}`, net, shake: 0, particles: 14 };
  if (net === 0) return { tier: 'push', label: T.push, net, shake: 0, particles: 0 };
  if (yours.every((h) => h.surrendered)) {
    return { tier: 'surrender', label: T.surrender(money(-net)), net, shake: 0, particles: 0 };
  }
  if (yours.every((h) => isBust(h.cards))) {
    return { tier: 'bust', label: T.bust, net, shake: 0.35, particles: 0 };
  }
  return { tier: 'lose', label: `−${money(-net)}`, net, shake: 0.1, particles: 0 };
}

/**
 * Playback rate for the "correct" chime: each decision in a streak plays one
 * semitone higher, capped at an octave, so a hot streak audibly climbs.
 */
export function streakPitch(streak: number): number {
  return Math.pow(2, Math.min(Math.max(streak - 1, 0), 12) / 12);
}

/** Bankroll count-up: how many ticks to play for a win (fewer for small wins). */
export function countUpTicks(net: number): number {
  if (net <= 0) return 0;
  return Math.min(10, Math.max(3, Math.round(Math.log2(net + 1) * 1.5)));
}
