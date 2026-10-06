import { GameState, YOU } from './game';
import { FanfareTier, roundFanfare } from './juice';

/** Milliseconds between cards being dealt. */
export const DEAL_STEP_MS = 280;
/** How long one card takes to slide into place (or flip over). */
export const CARD_ANIM_MS = 260;
const SHUFFLE_MS = 700;

export type SoundName =
  | 'card'
  | 'flip'
  | 'chips'
  | 'win'
  | 'blackjack'
  | 'lose'
  | 'push'
  | 'shuffle'
  | 'bust'
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'tag_plus'
  | 'tag_zero'
  | 'tag_minus';

const RESULT_SOUND: Record<FanfareTier, SoundName> = {
  blackjack: 'blackjack',
  bigWin: 'win',
  win: 'win',
  push: 'push',
  surrender: 'lose',
  bust: 'bust',
  lose: 'lose',
};

/** Where a card sits: the dealer's hand, or a player hand by its index in `GameState.hands`. */
export type Seat = 'dealer' | number;

export interface CardTiming {
  seat: Seat;
  index: number;
  /** Delay before this card starts animating, in ms after the state change. */
  at: number;
}

export interface DealSchedule {
  /** Newly dealt cards and when each one lands. */
  cards: CardTiming[];
  /** When the dealer's hole card flips, if it does in this change. */
  holeFlipAt: number | null;
  sounds: { name: SoundName; at: number }[];
  /** When every animation has finished; results and controls appear then. */
  doneAt: number;
}

export const cardKey = (seat: Seat, index: number) => `${seat}:${index}`;

/**
 * Works out the order and timing of what changed between two game states, so
 * the UI can deal cards one at a time like a real dealer instead of all at once.
 * Pass `step = 0` (e.g. for reduced motion) to make everything instant.
 */
export function dealSchedule(prev: GameState, next: GameState, step = DEAL_STEP_MS): DealSchedule {
  const cards: CardTiming[] = [];
  const sounds: DealSchedule['sounds'] = [];
  const anim = step === 0 ? 0 : CARD_ANIM_MS;
  let t = 0;
  let holeFlipAt: number | null = null;

  const betweenRounds = prev.phase === 'betting' || prev.phase === 'roundOver';
  const newRound = betweenRounds && next.dealer.length > 0 && next.dealer[0] !== prev.dealer[0];

  if (newRound) {
    if (next.justShuffled && step > 0) {
      sounds.push({ name: 'shuffle', at: 0 });
      t += SHUFFLE_MS;
    }
    sounds.push({ name: 'chips', at: t });
    // Real dealing order: a card to each seat, dealer upcard, a second card to each seat, hole card.
    const seats = next.hands.map((_, i) => i);
    const order: [Seat, number][] = [
      ...seats.map((i): [Seat, number] => [i, 0]),
      ['dealer', 0],
      ...seats.map((i): [Seat, number] => [i, 1]),
      ['dealer', 1],
    ];
    for (const [seat, index] of order) {
      cards.push({ seat, index, at: t });
      sounds.push({ name: 'card', at: t });
      t += step;
    }
  } else {
    if (next.hands.length > prev.hands.length || next.hands.some((h, i) => h.bet > (prev.hands[i]?.bet ?? h.bet))) {
      sounds.push({ name: 'chips', at: 0 }); // split or double puts out another bet
    }
    next.hands.forEach((hand, seat) => {
      const before = prev.hands[seat]?.cards ?? [];
      hand.cards.forEach((card, index) => {
        if (before[index] !== card) {
          cards.push({ seat, index, at: t });
          sounds.push({ name: 'card', at: t });
          t += step;
        }
      });
    });
  }

  if (!prev.holeRevealed && next.holeRevealed) {
    holeFlipAt = t;
    sounds.push({ name: 'flip', at: t });
    t += step;
    for (let index = 2; index < next.dealer.length; index++) {
      cards.push({ seat: 'dealer', index, at: t });
      sounds.push({ name: 'card', at: t });
      t += step;
    }
  }

  const doneAt = cards.length || holeFlipAt !== null ? Math.max(0, t - step) + anim : 0;

  const fanfare = next.phase === 'roundOver' && prev.phase !== 'roundOver' ? roundFanfare(next) : null;
  if (fanfare) sounds.push({ name: RESULT_SOUND[fanfare.tier], at: doneAt });

  return { cards, holeFlipAt, sounds, doneAt };
}

/** Looks up when a given card should animate in; cards not in the schedule appear immediately. */
export function cardDelay(schedule: DealSchedule | null, seat: Seat, index: number): number {
  return schedule?.cards.find((c) => c.seat === seat && c.index === index)?.at ?? 0;
}

export type HapticKind = 'cardLand' | 'flip' | 'chip' | 'win' | 'bigWin' | 'blackjack' | 'bust';

const RESULT_HAPTIC: Partial<Record<FanfareTier, HapticKind>> = {
  blackjack: 'blackjack',
  bigWin: 'bigWin',
  win: 'win',
  bust: 'bust',
};

/**
 * When to buzz the phone for a move: a light tap as each of your cards lands
 * (other players' cards stay quiet so a full table doesn't buzz constantly),
 * a soft tap when the hole card flips, and a pattern for wins and busts.
 */
export function hapticSchedule(next: GameState, s: DealSchedule, step = DEAL_STEP_MS): { kind: HapticKind; at: number }[] {
  const land = step === 0 ? 0 : CARD_ANIM_MS;
  const out: { kind: HapticKind; at: number }[] = [];
  for (const c of s.cards) {
    if (c.seat !== 'dealer' && next.hands[c.seat]?.owner === YOU) out.push({ kind: 'cardLand', at: c.at + land });
  }
  if (s.holeFlipAt !== null) out.push({ kind: 'flip', at: s.holeFlipAt + land / 2 });
  const result = s.sounds.find((x) => x.at === s.doneAt && ['win', 'blackjack', 'bust'].includes(x.name));
  const fanfare = result && next.phase === 'roundOver' ? roundFanfare(next) : null;
  const kind = fanfare ? RESULT_HAPTIC[fanfare.tier] : undefined;
  if (kind) out.push({ kind, at: s.doneAt });
  return out.sort((a, b) => a.at - b.at);
}
