// The guided first hand: two scripted hands that teach standing and hitting,
// with the cards arranged so each lesson ends in a win.
import { localized } from '../i18n/lang';
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

interface HandText {
  title: string;
  intro: string;
  /** One coach line per step. */
  say: string[];
  outro: string;
}

/** A scripted hand whose text fields always read the current language. */
function scripted(draws: Rank[], actions: Action[], text: { en: HandText; es: HandText }): TutorialHand {
  const t = localized(text);
  return {
    draws,
    get title() {
      return t.title;
    },
    get intro() {
      return t.intro;
    },
    get outro() {
      return t.outro;
    },
    steps: actions.map((action, i) => ({
      action,
      get say() {
        return t.say[i];
      },
    })),
  };
}

export const TUTORIAL: TutorialHand[] = [
  scripted(['9', '6', '8', '6', '10'], ['stand'], {
    en: {
      title: 'Hand 1: Knowing when to stand',
      intro: 'Get closer to 21 than the dealer without going over. Face cards count 10, Aces count 1 or 11. Tap Deal to start.',
      say: [
        'You have 17. The dealer shows a 6, a weak card: they will probably have to hit and may bust. Tap Stand to keep your 17.',
      ],
      outro: 'The dealer had 12 and had to take a card. Dealers must hit until they reach 17. They drew a 10 and busted, so you win!',
    },
    es: {
      title: 'Mano 1: Saber cuándo plantarse',
      intro: 'Acércate más a 21 que el crupier sin pasarte. Las figuras valen 10 y los ases valen 1 u 11. Toca Repartir para empezar.',
      say: [
        'Tienes 17. El crupier muestra un 6, una carta débil: probablemente tendrá que pedir y puede pasarse. Toca Plantarse para quedarte con tu 17.',
      ],
      outro: 'El crupier tenía 12 y tuvo que tomar carta. El crupier debe pedir hasta llegar a 17. Sacó un 10 y se pasó, ¡así que ganas!',
    },
  }),
  scripted(['5', '9', '3', '8', '10'], ['hit', 'stand'], {
    en: {
      title: 'Hand 2: Knowing when to hit',
      intro: 'Sometimes you need another card. Tap Deal for the next hand.',
      say: [
        'You have 8 against a strong 9. No single card can bust you, so take another one. Tap Hit.',
        'You drew a 10: now you have 18. Hard 18 always stands. Tap Stand.',
      ],
      outro: 'The dealer finished on 17. Your 18 wins!',
    },
    es: {
      title: 'Mano 2: Saber cuándo pedir',
      intro: 'A veces necesitas otra carta. Toca Repartir para la siguiente mano.',
      say: [
        'Tienes 8 contra un 9 fuerte. Ninguna carta puede hacer que te pases, así que pide otra. Toca Pedir.',
        'Sacaste un 10: ahora tienes 18. Con 18 duro siempre te plantas. Toca Plantarse.',
      ],
      outro: 'El crupier terminó con 17. ¡Tu 18 gana!',
    },
  }),
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
