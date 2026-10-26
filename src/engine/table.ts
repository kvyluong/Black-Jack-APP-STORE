// A casino table: seven seats, computer players who sit down, play in their
// own style and leave after a while, plus one or two seats for you. Nobody
// bets: the stake behind every hand is a fixed, hidden practice unit.
import { localized } from '../i18n/lang';
import { Rng } from './cards';
import { GameState, SeatBet, YOU, decisionContext, hiLoTrueCount, legalActions } from './game';
import { PRACTICE_BUDGET } from './progression';
import { handValue } from './hand';
import { Action, basicAction, recommend } from './strategy';

export const SEAT_COUNT = 7;

export type NpcStyle = 'book' | 'counter' | 'hunch' | 'neverBust' | 'mimic' | 'highRoller';

/** Short description shown under a player's name. */
export const STYLE_LABEL: Record<NpcStyle, string> = localized<Record<NpcStyle, string>>({
  en: {
    book: 'Plays by the book',
    counter: 'Counts cards',
    hunch: 'Plays hunches',
    neverBust: 'Never busts',
    mimic: 'Copies the dealer',
    highRoller: 'Plays it bold',
  },
  es: {
    book: 'Juega según el manual',
    counter: 'Cuenta cartas',
    hunch: 'Juega por corazonadas',
    neverBust: 'Nunca se pasa',
    mimic: 'Imita al crupier',
    highRoller: 'Juega con audacia',
  },
});

const T = localized({
  en: {
    reasons: ['calls it a night', 'heads to the buffet', 'goes for a walk on deck', 'takes a break'],
    leaves: (name: string, why: string) => `${name} ${why} and leaves.`,
    joins: (name: string, seat: number) => `${name} sits down at seat ${seat}.`,
  },
  es: {
    reasons: ['da por terminada la noche', 'va al bufé', 'sale a dar un paseo', 'se toma un descanso'],
    leaves: (name: string, why: string) => `${name} ${why} y se va.`,
    joins: (name: string, seat: number) => `${name} se sienta en el asiento ${seat}.`,
  },
});

export interface Npc {
  id: string;
  name: string;
  style: NpcStyle;
  /** Hidden practice budget; never runs out, so nobody leaves broke. */
  bankroll: number;
  /** Hidden stake per hand, in practice units. */
  baseBet: number;
  roundsPlayed: number;
  /** Roughly how many rounds they'll play before getting up. */
  patience: number;
  /** Hue for their avatar. */
  hue: number;
}

export type Occupant = Npc | typeof YOU | null;

export interface Table {
  seats: Occupant[];
  /** Counter for unique player ids. */
  nextId: number;
}

export interface TableEvent {
  kind: 'join' | 'leave';
  seat: number;
  text: string;
}

const NAMES = [
  'Maria', 'Big Tony', 'Dev', 'Grandma Lou', 'Jules', 'Priya', 'Sam', 'Hank', 'Mei',
  'Oscar', 'Rosa', 'Ike', 'Nadia', 'Theo', 'Vic', 'Lena', 'Marcus', 'June', 'Rocco', 'Ada',
];
const STYLES: NpcStyle[] = ['book', 'book', 'counter', 'hunch', 'hunch', 'neverBust', 'mimic', 'highRoller'];

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

export const isNpc = (o: Occupant): o is Npc => o !== null && o !== YOU;

/** Your seats: the middle of the table, so players sit on both sides of you. */
export function yourSeats(hands: number): number[] {
  return hands >= 2 ? [3, 4] : [3];
}

function makeNpc(table: Table, minBet: number, rng: Rng): Npc {
  const style = pick(STYLES, rng);
  const taken = new Set(table.seats.filter(isNpc).map((n) => n.name));
  const name = pick(NAMES.filter((n) => !taken.has(n)), rng);
  return {
    id: `npc${table.nextId++}`,
    name,
    style,
    bankroll: PRACTICE_BUDGET,
    baseBet: minBet,
    roundsPlayed: 0,
    patience: 6 + Math.floor(rng() * 30),
    hue: Math.floor(rng() * 360),
  };
}

/** A fresh table with you seated and a few players already playing. */
export function createTable(hands: number, minBet: number, otherPlayers: boolean, rng: Rng = Math.random): Table {
  const table: Table = { seats: Array(SEAT_COUNT).fill(null), nextId: 1 };
  for (const s of yourSeats(hands)) table.seats[s] = YOU;
  if (otherPlayers) {
    const count = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) {
      const open = table.seats.map((o, s) => (o === null ? s : -1)).filter((s) => s >= 0);
      if (open.length) table.seats[pick(open, rng)] = makeNpc(table, minBet, rng);
    }
  }
  return table;
}

/** Re-seats you for a new hand count, keeping the other players where they are. */
export function setYourHands(prev: Table, hands: number): Table {
  const seats: Occupant[] = prev.seats.map((o) => (o === YOU ? null : o));
  for (const s of yourSeats(hands)) {
    const displaced = seats[s];
    seats[s] = YOU;
    // Anyone sitting where you now play moves to an open seat (or leaves if the table is full).
    const open = seats.indexOf(null);
    if (isNpc(displaced) && open >= 0) seats[open] = displaced;
  }
  return { ...prev, seats };
}

/**
 * What happens at the table between rounds: players who are bored or done
 * get up, and new players sit down in open seats. At most one of each per
 * round, so the table changes at a natural pace.
 */
export function betweenRounds(prev: Table, minBet: number, otherPlayers: boolean, rng: Rng = Math.random): { table: Table; events: TableEvent[] } {
  const table: Table = { ...prev, seats: prev.seats.slice() };
  const events: TableEvent[] = [];

  const leaving = table.seats
    .map((o, seat) => ({ o, seat }))
    .filter((x): x is { o: Npc; seat: number } => isNpc(x.o))
    .find(({ o }) => !otherPlayers || o.roundsPlayed >= o.patience || rng() < 0.03);
  if (leaving) {
    const { o, seat } = leaving;
    table.seats[seat] = null;
    const why = pick(T.reasons, rng);
    events.push({ kind: 'leave', seat, text: T.leaves(o.name, why) });
  }

  const open = table.seats.map((o, s) => (o === null ? s : -1)).filter((s) => s >= 0);
  const players = table.seats.filter(isNpc).length;
  const joinChance = players <= 1 ? 0.6 : players >= 4 ? 0.12 : 0.3;
  if (otherPlayers && open.length && !leaving && rng() < joinChance) {
    const seat = pick(open, rng);
    const npc = makeNpc(table, minBet, rng);
    table.seats[seat] = npc;
    events.push({ kind: 'join', seat, text: T.joins(npc.name, seat + 1) });
  }
  return { table, events };
}

/** A player's hidden stake for this round: always the fixed practice unit. */
export function npcBet(npc: Npc, minBet: number): number {
  return Math.max(minBet, npc.baseBet);
}

/** Every hand dealt in the next round, in seat order, each with the hidden practice stake. */
export function roundBets(table: Table, yourBet: number, minBet: number): SeatBet[] {
  const bets: SeatBet[] = [];
  table.seats.forEach((o, seat) => {
    if (o === YOU) bets.push({ seat, owner: YOU, bet: yourBet });
    else if (isNpc(o) && o.bankroll >= minBet) {
      const bet = npcBet(o, minBet);
      // What's left limits their doubles and splits, so they can't go below zero.
      bets.push({ seat, owner: o.id, bet, chipsLeft: o.bankroll - bet });
    }
  });
  return bets;
}

export function findNpc(table: Table, id: string): Npc | undefined {
  return table.seats.find((o): o is Npc => isNpc(o) && o.id === id);
}

/**
 * How a computer player plays the active hand, in their own style. Also says
 * what the book says, so the UI can point out their mistakes.
 */
export function npcAction(s: GameState, npc: Npc, rng: Rng = Math.random): { action: Action; book: Action } {
  const ctx = decisionContext(s, false)!;
  const legal = legalActions(s);
  const book = basicAction(ctx);
  const { total, soft } = handValue(ctx.cards);
  let action: Action = book;

  switch (npc.style) {
    case 'counter':
      action = recommend({ ...ctx, trueCount: hiLoTrueCount(s) }).action;
      break;
    case 'hunch':
      // Usually right, but a third of the time goes with their gut.
      if (rng() < 0.33) {
        action = total <= 11 ? 'hit' : total >= 17 ? 'stand' : rng() < 0.5 ? 'hit' : 'stand';
      }
      break;
    case 'neverBust':
      action = !soft && total >= 12 ? 'stand' : total >= 18 ? 'stand' : book === 'double' ? 'double' : 'hit';
      break;
    case 'mimic':
      action = total < 17 || (soft && total === 17) ? 'hit' : 'stand';
      break;
    case 'highRoller':
      if (legal.split) action = 'split';
      else if (legal.double && !soft && total >= 9 && total <= 11) action = 'double';
      break;
  }
  if (!legal[action]) action = total >= 17 ? 'stand' : 'hit';
  return { action, book };
}

/** Records a finished round for the computer players. */
export function settleNpcs(prev: Table, s: GameState): Table {
  const seats = prev.seats.map((o) => {
    if (!isNpc(o)) return o;
    const hands = s.hands.filter((h) => h.owner === o.id);
    if (!hands.length) return o;
    const net = hands.reduce((sum, h) => sum + (h.payout ?? 0) - h.bet, 0);
    return { ...o, bankroll: o.bankroll + net, roundsPlayed: o.roundsPlayed + 1 };
  });
  return { ...prev, seats };
}
