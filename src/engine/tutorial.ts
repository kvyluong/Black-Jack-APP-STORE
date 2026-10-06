// The guided first hand: two scripted hands that teach standing and hitting,
// with the cards arranged so each lesson ends in a win.
import { Card, Rank, createShoe, seededRng } from './cards';
import { GameState, newGame } from './game';
import { DEFAULT_RULES } from './rules';
import { Action } from './strategy';

export interface TutorialStep {
  /** The only button enabled at this point. */
  action: Action;
  /** What the coach says before you tap it. */
  say: string;
}

export interface TutorialHand {
  title: string;
  /** Shown before dealing. */
  intro: string;
  /** Exact deal order: your card, dealer up, your card, dealer hole, then any hits and dealer draws. */
  draws: Rank[];
  steps: TutorialStep[];
  /** Shown after the hand. */
  outro: string;
}

export const TUTORIAL_BET = 10;

export const TUTORIAL: TutorialHand[] = [
  {
    title: 'Hand 1: Knowing when to stand',
    intro: 'Get closer to 21 than the dealer without going over. Face cards count 10, Aces count 1 or 11. Tap Deal to start.',
    draws: ['9', '6', '8', '6', '10'],
    steps: [
      {
        action: 'stand',
        say: 'You have 17. The dealer shows a 6, a weak card: they will probably have to hit and may bust. Tap Stand to keep your 17.',
      },
    ],
    outro: 'The dealer had 12 and had to take a card. Dealers must hit until they reach 17. They drew a 10 and busted, so you win!',
  },
  {
    title: 'Hand 2: Knowing when to hit',
    intro: 'Sometimes you need another card. Tap Deal for the next hand.',
    draws: ['5', '9', '3', '8', '10'],
    steps: [
      { action: 'hit', say: 'You have 8 against a strong 9. No single card can bust you, so take another one. Tap Hit.' },
      { action: 'stand', say: 'You drew a 10: now you have 18. Hard 18 always stands. Tap Stand.' },
    ],
    outro: 'The dealer finished on 17. Your 18 wins!',
  },
];

/** A single-player game whose next cards are exactly `hand.draws`. */
export function tutorialGame(hand: TutorialHand, bankroll: number): GameState {
  const g = newGame({ ...DEFAULT_RULES, lateSurrender: false }, bankroll, seededRng(1));
  // Real cards underneath, so nothing runs out; the scripted cards are drawn first.
  const filler = createShoe(6, seededRng(2)).slice(0, 100);
  const scripted: Card[] = hand.draws.map((rank, i) => ({ rank, suit: (['♠', '♥', '♣', '♦'] as const)[i % 4] }));
  g.shoe = [...filler, ...scripted.reverse()];
  g.shoeSize = 312;
  g.justShuffled = false;
  return g;
}
