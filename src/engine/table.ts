// A casino table: seven seats, computer players who sit down, play in their
// own style, win or lose, and leave, plus one or two seats for you.
import { Rng } from './cards';
import { suggestedBetUnits } from './counting';
import { GameState, SeatBet, YOU, currentTrueCount, decisionContext, legalActions } from './game';
import { handValue } from './hand';
import { Action, basicAction, recommend } from './strategy';

export const SEAT_COUNT = 7;

export type NpcStyle = 'book' | 'counter' | 'hunch' | 'neverBust' | 'mimic' | 'highRoller';

/** Short description shown under a player's name. */
export const STYLE_LABEL: Record<NpcStyle, string> = {
  book: 'Plays by the book',
  counter: 'Counts cards',
  hunch: 'Plays hunches',
  neverBust: 'Never busts',
  mimic: 'Copies the dealer',
  highRoller: 'High roller',
};

export interface Npc {
  id: string;
  name: string;
  style: NpcStyle;
  bankroll: number;
  /** What they sat down with, to tell winners from losers when they leave. */
  buyIn: number;
  /** Usual bet, in dollars. */
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
  const units = style === 'highRoller' ? pick([5, 10, 10, 20], rng) : pick([1, 1, 1, 2, 2, 3], rng);
  const baseBet = minBet * units;
  const bankroll = baseBet * (15 + Math.floor(rng() * 40));
  return {
    id: `npc${table.nextId++}`,
    name,
    style,
    bankroll,
    buyIn: bankroll,
    baseBet,
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
 * What happens at the table between rounds: players who are broke, bored or
 * done get up, and new players sit down in open seats. At most one of each per
 * round, so the table changes at a natural pace.
 */
export function betweenRounds(prev: Table, minBet: number, otherPlayers: boolean, rng: Rng = Math.random): { table: Table; events: TableEvent[] } {
  const table: Table = { ...prev, seats: prev.seats.slice() };
  const events: TableEvent[] = [];

  const leaving = table.seats
    .map((o, seat) => ({ o, seat }))
    .filter((x): x is { o: Npc; seat: number } => isNpc(x.o))
    .find(({ o }) => !otherPlayers || o.bankroll < minBet || o.roundsPlayed >= o.patience || rng() < 0.03);
  if (leaving) {
    const { o, seat } = leaving;
    table.seats[seat] = null;
    const why =
      o.bankroll < minBet
        ? 'is out of chips'
        : o.bankroll > o.buyIn
          ? `colors up $${o.bankroll - o.buyIn} ahead`
          : pick(['calls it a night', 'heads to the buffet', 'goes to try the slots', 'takes a break'], rng);
    events.push({ kind: 'leave', seat, text: `${o.name} ${why} and leaves.` });
  }

  const open = table.seats.map((o, s) => (o === null ? s : -1)).filter((s) => s >= 0);
  const players = table.seats.filter(isNpc).length;
  const joinChance = players <= 1 ? 0.6 : players >= 4 ? 0.12 : 0.3;
  if (otherPlayers && open.length && !leaving && rng() < joinChance) {
    const seat = pick(open, rng);
    const npc = makeNpc(table, minBet, rng);
    table.seats[seat] = npc;
    events.push({ kind: 'join', seat, text: `${npc.name} sits down at seat ${seat + 1} with $${npc.baseBet} bets.` });
  }
  return { table, events };
}

/** How much a player bets this round. Card counters raise their bets when the count is high. */
export function npcBet(npc: Npc, trueCount: number, minBet: number): number {
  let bet = npc.baseBet;
  if (npc.style === 'counter') bet = npc.baseBet * suggestedBetUnits(Math.floor(trueCount));
  return Math.max(minBet, Math.min(bet, Math.floor(npc.bankroll / minBet) * minBet));
}

/** Every bet on the table for the next round, in seat order. */
export function roundBets(table: Table, yourBet: number, trueCount: number, minBet: number): SeatBet[] {
  const bets: SeatBet[] = [];
  table.seats.forEach((o, seat) => {
    if (o === YOU) bets.push({ seat, owner: YOU, bet: yourBet });
    else if (isNpc(o) && o.bankroll >= minBet) bets.push({ seat, owner: o.id, bet: npcBet(o, trueCount, minBet) });
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
      action = recommend({ ...ctx, trueCount: currentTrueCount(s) }).action;
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

/** Pays computer players for the finished round. */
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
