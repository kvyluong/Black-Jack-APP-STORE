import { localized } from '../i18n/lang';
import { Card, pointValue } from './cards';

const T = localized({
  en: { blackjack: 'Blackjack', bust: (n: number) => `Bust (${n})`, soft: (n: number) => `Soft ${n}` },
  es: { blackjack: 'Blackjack', bust: (n: number) => `Pasado (${n})`, soft: (n: number) => `${n} blando` },
});

export interface HandValue {
  total: number;
  /** True when an ace is currently counted as 11. */
  soft: boolean;
}

export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += pointValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  if (aces > 0 && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

/** Pairs split by blackjack value, so K+10 or J+Q can be split like most casinos allow. */
export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && pointValue(cards[0].rank) === pointValue(cards[1].rank);
}

export function describeHand(cards: Card[]): string {
  if (isBlackjack(cards)) return T.blackjack;
  const { total, soft } = handValue(cards);
  if (total > 21) return T.bust(total);
  return soft ? T.soft(total) : `${total}`;
}
