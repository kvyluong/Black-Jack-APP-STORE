import { Card, Rank, pointValue } from './cards';
import { handValue, isPair } from './hand';
import { Rules } from './rules';

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export const ACTION_LABEL: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
};

/** Dealer upcard as 2–11 (ace = 11). */
export function upValue(rank: Rank): number {
  return rank === 'A' ? 11 : pointValue(rank);
}

/**
 * Chart cell codes:
 * H hit, S stand, D double (else hit), Ds double (else stand), P split,
 * Rh surrender (else hit), Rs surrender (else stand), Rp surrender (else split).
 */
export type Cell = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'Rh' | 'Rs' | 'Rp';

export function hardCell(total: number, up: number, rules: Rules): Cell {
  const h17 = rules.dealerHitsSoft17;
  if (total <= 8) return 'H';
  if (total === 9) return up >= 3 && up <= 6 ? 'D' : 'H';
  if (total === 10) return up <= 9 ? 'D' : 'H';
  if (total === 11) return up <= 10 || h17 ? 'D' : 'H';
  if (total === 12) return up >= 4 && up <= 6 ? 'S' : 'H';
  if (total <= 14) return up <= 6 ? 'S' : 'H';
  if (total === 15) {
    if (up === 10 || (h17 && up === 11)) return 'Rh';
    return up <= 6 ? 'S' : 'H';
  }
  if (total === 16) {
    if (up >= 9) return 'Rh';
    return up <= 6 ? 'S' : 'H';
  }
  if (total === 17 && h17 && up === 11) return 'Rs';
  return 'S';
}

export function softCell(total: number, up: number, rules: Rules): Cell {
  const h17 = rules.dealerHitsSoft17;
  if (total <= 12) return 'H';
  if (total <= 14) return up === 5 || up === 6 ? 'D' : 'H';
  if (total <= 16) return up >= 4 && up <= 6 ? 'D' : 'H';
  if (total === 17) return up >= 3 && up <= 6 ? 'D' : 'H';
  if (total === 18) {
    if (up >= 3 && up <= 6) return 'Ds';
    if (up === 2) return h17 ? 'Ds' : 'S';
    if (up === 7 || up === 8) return 'S';
    return 'H';
  }
  if (total === 19) return h17 && up === 6 ? 'Ds' : 'S';
  return 'S';
}

/** Returns the pair-splitting cell, or null when the pair should be played as a total. */
export function pairCell(pairValue: number, up: number, rules: Rules): Cell | null {
  const das = rules.doubleAfterSplit;
  switch (pairValue) {
    case 1:
      return 'P';
    case 10:
      return null;
    case 9:
      return up === 7 || up >= 10 ? null : 'P';
    case 8:
      return rules.dealerHitsSoft17 && up === 11 ? 'Rp' : 'P';
    case 7:
      return up <= 7 ? 'P' : null;
    case 6:
      return up <= 6 && (das || up >= 3) ? 'P' : null;
    case 5:
      return null;
    case 4:
      return das && (up === 5 || up === 6) ? 'P' : null;
    default: // 2s and 3s
      return up <= 7 && (das || up >= 4) ? 'P' : null;
  }
}

export interface Deviation {
  id: string;
  /** Human readable, e.g. "16 vs 10". */
  label: string;
  /** True count index at which the play changes. */
  index: number;
  /** Play to make when true count >= index. */
  atOrAbove: Action;
  /** Play to make when true count < index. */
  below: Action;
  match: (cards: Card[], up: number) => boolean;
}

const hardTotal = (cards: Card[]) => {
  const v = handValue(cards);
  return v.soft ? -1 : v.total;
};
const isTenPair = (cards: Card[]) => isPair(cards) && pointValue(cards[0].rank) === 10;

/**
 * The most valuable Hi-Lo index plays for multi-deck S17 games (a subset of the
 * "Illustrious 18"). Insurance is handled separately in counting.ts.
 */
export const DEVIATIONS: Deviation[] = [
  { id: '16v10', label: '16 vs 10', index: 0, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 10 && hardTotal(c) === 16 && !isPair(c) },
  { id: '15v10', label: '15 vs 10', index: 4, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 10 && hardTotal(c) === 15 },
  { id: 'TTv5', label: '10,10 vs 5', index: 5, atOrAbove: 'split', below: 'stand', match: (c, u) => u === 5 && isTenPair(c) },
  { id: 'TTv6', label: '10,10 vs 6', index: 4, atOrAbove: 'split', below: 'stand', match: (c, u) => u === 6 && isTenPair(c) },
  { id: '10v10', label: '10 vs 10', index: 4, atOrAbove: 'double', below: 'hit', match: (c, u) => u === 10 && hardTotal(c) === 10 },
  { id: '12v3', label: '12 vs 3', index: 2, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 3 && hardTotal(c) === 12 && !isPair(c) },
  { id: '12v2', label: '12 vs 2', index: 3, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 2 && hardTotal(c) === 12 && !isPair(c) },
  { id: '11vA', label: '11 vs A', index: 1, atOrAbove: 'double', below: 'hit', match: (c, u) => u === 11 && hardTotal(c) === 11 },
  { id: '9v2', label: '9 vs 2', index: 1, atOrAbove: 'double', below: 'hit', match: (c, u) => u === 2 && hardTotal(c) === 9 },
  { id: '10vA', label: '10 vs A', index: 4, atOrAbove: 'double', below: 'hit', match: (c, u) => u === 11 && hardTotal(c) === 10 },
  { id: '9v7', label: '9 vs 7', index: 3, atOrAbove: 'double', below: 'hit', match: (c, u) => u === 7 && hardTotal(c) === 9 },
  { id: '16v9', label: '16 vs 9', index: 5, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 9 && hardTotal(c) === 16 && !isPair(c) },
  { id: '13v2', label: '13 vs 2', index: -1, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 2 && hardTotal(c) === 13 },
  { id: '12v4', label: '12 vs 4', index: 0, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 4 && hardTotal(c) === 12 && !isPair(c) },
  { id: '12v5', label: '12 vs 5', index: -2, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 5 && hardTotal(c) === 12 && !isPair(c) },
  { id: '12v6', label: '12 vs 6', index: -1, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 6 && hardTotal(c) === 12 && !isPair(c) },
  { id: '13v3', label: '13 vs 3', index: -2, atOrAbove: 'stand', below: 'hit', match: (c, u) => u === 3 && hardTotal(c) === 13 },
];

export interface DecisionContext {
  cards: Card[];
  dealerUp: Rank;
  rules: Rules;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  /** When provided, Hi-Lo index plays are applied. */
  trueCount?: number;
}

export interface Recommendation {
  action: Action;
  reason: string;
  /** Set when a count-based deviation overrode basic strategy. */
  deviation?: Deviation;
}

function resolveCell(cell: Cell, ctx: DecisionContext): Action {
  switch (cell) {
    case 'H':
      return 'hit';
    case 'S':
      return 'stand';
    case 'D':
      return ctx.canDouble ? 'double' : 'hit';
    case 'Ds':
      return ctx.canDouble ? 'double' : 'stand';
    case 'P':
      return 'split';
    case 'Rh':
      return ctx.canSurrender ? 'surrender' : 'hit';
    case 'Rs':
      return ctx.canSurrender ? 'surrender' : 'stand';
    case 'Rp':
      return ctx.canSurrender ? 'surrender' : 'split';
  }
}

/** Basic strategy, without count adjustments. */
export function basicAction(ctx: DecisionContext): Action {
  const up = upValue(ctx.dealerUp);
  const { cards, rules } = ctx;
  if (ctx.canSplit && isPair(cards)) {
    const cell = pairCell(pointValue(cards[0].rank), up, rules);
    if (cell) return resolveCell(cell, ctx);
  }
  const { total, soft } = handValue(cards);
  return resolveCell(soft ? softCell(total, up, rules) : hardCell(total, up, rules), ctx);
}

function isAllowed(action: Action, ctx: DecisionContext): boolean {
  if (action === 'double') return ctx.canDouble;
  if (action === 'split') return ctx.canSplit;
  if (action === 'surrender') return ctx.canSurrender;
  return true;
}

export function recommend(ctx: DecisionContext): Recommendation {
  const basic = basicAction(ctx);
  const up = upValue(ctx.dealerUp);

  if (ctx.trueCount !== undefined && basic !== 'surrender') {
    const dev = DEVIATIONS.find((d) => d.match(ctx.cards, up));
    if (dev) {
      const action = ctx.trueCount >= dev.index ? dev.atOrAbove : dev.below;
      if (action !== basic && isAllowed(action, ctx)) {
        const tc = formatTrueCount(ctx.trueCount);
        return {
          action,
          deviation: dev,
          reason: `Count play: ${dev.label} changes at a true count of ${dev.index >= 0 ? '+' : ''}${dev.index}. The true count is ${tc}, so ${action} instead of the usual ${basic}.`,
        };
      }
    }
  }
  return { action: basic, reason: explain(basic, ctx) };
}

export function formatTrueCount(tc: number): string {
  const rounded = Math.round(tc * 2) / 2;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function upName(rank: Rank): string {
  return rank === 'A' ? 'an Ace' : rank === '8' ? 'an 8' : `a ${pointValue(rank)}`;
}

/** Plain-English coaching explanation for a basic-strategy decision. */
export function explain(action: Action, ctx: DecisionContext): string {
  const up = upValue(ctx.dealerUp);
  const dealer = upName(ctx.dealerUp);
  const { total, soft } = handValue(ctx.cards);
  const weakDealer = up >= 2 && up <= 6;
  const pair = isPair(ctx.cards) ? pointValue(ctx.cards[0].rank) : 0;

  switch (action) {
    case 'split':
      if (pair === 1) return 'Always split Aces. Two hands starting at 11 beat one soft 12.';
      if (pair === 8) return 'Always split 8s. 16 is the worst total in blackjack; two hands starting at 8 do much better.';
      return `Split: the dealer shows ${dealer}, so two hands starting with a ${pair} are worth more than one hand of ${total}.`;
    case 'surrender':
      return `Surrender: ${total} against ${dealer} loses so often that giving up half your bet costs less over time.`;
    case 'double':
      if (soft)
        return `Double: soft ${total} can't bust with one card, and the dealer's ${dealer} is weak. Get more money out while you have the edge.`;
      return `Double: ${total} is a strong starting total and the dealer shows ${dealer}. You're the favorite, so double your bet.`;
    case 'stand':
      if (total >= 17 && !soft) return `Stand: ${total} is strong enough. Hitting would bust you too often.`;
      if (soft) return `Stand: soft ${total} is a good hand against ${dealer}.`;
      if (weakDealer)
        return `Stand: the dealer shows ${dealer}, a "bust card". Don't risk busting; make the dealer draw and possibly bust.`;
      return `Stand on ${total}.`;
    case 'hit':
      if (soft) return `Hit: soft ${total} can't bust with one card, so take a free shot at improving.`;
      if (total <= 11) return `Hit: you can't bust with ${total}, so always take a card.`;
      if (!weakDealer)
        return `Hit: the dealer shows ${dealer}, a strong card. Assume a 10 underneath, so ${total} probably loses if you stand.`;
      return `Hit: ${total} is too weak to stand here, even against ${dealer}.`;
  }
}
