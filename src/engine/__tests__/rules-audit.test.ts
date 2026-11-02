// Rule-by-rule checks of the game engine and coach, plus regressions for bugs
// found in the November 2026 audit.
import { Card, Rank, createShoe, seededRng } from '../cards';
import { decksRemaining, initialRunningCount, trueCount } from '../counting';
import { deckCard, indexFor as trainerIndex } from '../deviations';
import { GameState, act, dealerShouldHit, legalActions, newGame, resolveInsurance, startRound } from '../game';
import { roundFanfare } from '../juice';
import { DEFAULT_RULES, Rules } from '../rules';
import { DecisionContext, basicAction, recommend } from '../strategy';

const c = (rank: Rank): Card => ({ rank, suit: '♣' });
const H17: Rules = { ...DEFAULT_RULES, dealerHitsSoft17: true };

/** A game whose next cards come out in this order: your 1st card, dealer up, your 2nd, hole, then hits. */
function rigged(draws: Rank[], rules: Rules = DEFAULT_RULES): GameState {
  const g = newGame(rules, 1000, seededRng(1));
  g.shoe = [...createShoe(rules.decks, seededRng(2)).slice(0, 200), ...draws.map(c).reverse()];
  g.shoeSize = rules.decks * 52;
  return g;
}

describe('dealer rules', () => {
  it('stands on soft 17 under S17 and hits it under H17', () => {
    expect(dealerShouldHit([c('A'), c('6')], DEFAULT_RULES)).toBe(false);
    expect(dealerShouldHit([c('A'), c('6')], H17)).toBe(true);
    expect(dealerShouldHit([c('A'), c('A'), c('5')], H17)).toBe(true);
    // Hard 17 and soft 18 always stand.
    expect(dealerShouldHit([c('10'), c('7')], H17)).toBe(false);
    expect(dealerShouldHit([c('A'), c('7')], H17)).toBe(false);
    expect(dealerShouldHit([c('10'), c('6')], DEFAULT_RULES)).toBe(true);
  });

  it('draws to soft 17 at the table only under H17', () => {
    // You 10,9; dealer A up, 6 in the hole; next card 2.
    const s17 = act(resolveInsurance(startRound(rigged(['10', 'A', '9', '6', '2']), 1), false), 'stand');
    expect(s17.dealer).toHaveLength(2);
    expect(s17.hands[0].outcome).toBe('win');
    const h17 = act(resolveInsurance(startRound(rigged(['10', 'A', '9', '6', '2'], H17), 1), false), 'stand');
    expect(h17.dealer).toHaveLength(3);
    expect(h17.hands[0].outcome).toBe('push');
  });

  it('only offers insurance with an Ace up, and peeks under a 10', () => {
    expect(startRound(rigged(['10', 'K', '8', '5']), 1).phase).toBe('playing');
    const peeked = startRound(rigged(['10', 'K', '8', 'A']), 1);
    expect(peeked.phase).toBe('roundOver');
    expect(peeked.hands[0].outcome).toBe('lose');
  });
});

describe('your options', () => {
  it('splits aces once, one card each, and 21 there is not a blackjack', () => {
    const g = act(startRound(rigged(['A', '6', 'A', '10', 'K', '9']), 1), 'split');
    expect(g.phase).toBe('roundOver');
    expect(g.hands.map((h) => h.cards.length)).toEqual([2, 2]);
    expect(g.hands[0].outcome).toBe('win');
    expect(g.hands[0].payout).toBe(2); // even money, not 3:2
  });

  it('re-splits up to four hands at a seat', () => {
    let g = startRound(rigged(['8', '6', '8', '10', '8', '8', '8', '2', '3', '4', '5']), 1);
    g = act(g, 'split');
    expect(legalActions(g).split).toBe(true);
    g = act(g, 'split');
    g = act(g, 'split');
    expect(g.hands).toHaveLength(4);
    expect(legalActions(g).split).toBe(false);
  });

  it('doubles after a split only with DAS', () => {
    const draws: Rank[] = ['8', '6', '8', '10', '3', '2'];
    expect(legalActions(act(startRound(rigged(draws), 1), 'split')).double).toBe(true);
    const noDas = act(startRound(rigged(draws, { ...DEFAULT_RULES, doubleAfterSplit: false }), 1), 'split');
    expect(legalActions(noDas).double).toBe(false);
  });

  it('surrenders only on the first two cards, never after a split or without late surrender', () => {
    const start = startRound(rigged(['10', '9', '6', '8', '2', '3', '4']), 1);
    expect(legalActions(start).surrender).toBe(true);
    expect(legalActions(act(start, 'hit')).surrender).toBe(false);
    const noLs = startRound(rigged(['10', '9', '6', '8'], { ...DEFAULT_RULES, lateSurrender: false }), 1);
    expect(legalActions(noLs).surrender).toBe(false);
    const split = act(startRound(rigged(['8', '9', '8', '7', '6', '2']), 1), 'split');
    expect(legalActions(split).surrender).toBe(false);
  });
});

describe('counting math', () => {
  it('rounds decks left to the nearest half deck, never below half', () => {
    expect(decksRemaining(312)).toBe(6);
    expect(decksRemaining(130)).toBe(2.5);
    expect(decksRemaining(10)).toBe(0.5);
    expect(decksRemaining(0)).toBe(0.5);
    expect(trueCount(6, 156)).toBe(2);
  });

  it('KO starts at 4 − 4 × decks and reads 0 as its estimated true count there', () => {
    expect(initialRunningCount(8, 'ko')).toBe(-28);
    expect(trueCount(-28, 416, 'ko')).toBe(0);
  });
});

describe('Fab 4 surrender under H17 (audit fix)', () => {
  const ctx = (tc: number, rules: Rules): DecisionContext => ({
    cards: [c('9'), c('6')],
    dealerUp: 'A',
    rules,
    canDouble: true,
    canSplit: false,
    canSurrender: true,
    trueCount: tc,
  });

  it('agrees with basic strategy at a neutral count: H17 surrenders 15 vs A', () => {
    expect(basicAction(ctx(0, H17))).toBe('surrender');
    expect(recommend(ctx(0, H17)).action).toBe('surrender');
  });

  it('uses the published indices: 15 vs A surrenders at −1 (H17) and +1 (S17)', () => {
    expect(recommend(ctx(-1, H17)).action).toBe('surrender');
    expect(recommend(ctx(-2, H17)).action).toBe('hit');
    expect(recommend(ctx(0, DEFAULT_RULES)).action).toBe('hit');
    expect(recommend(ctx(1, DEFAULT_RULES)).action).toBe('surrender');
    expect(trainerIndex(deckCard('s15vA'), H17)).toBe(-1);
    expect(trainerIndex(deckCard('s15vA'), DEFAULT_RULES)).toBe(1);
  });
});

describe('round banner ignores the insurance side stake (audit fix)', () => {
  it('a hand lost to a dealer blackjack is a loss, even with insurance taken', () => {
    const g = resolveInsurance(startRound(rigged(['10', 'A', '8', 'K']), 1), true);
    expect(g.hands[0].outcome).toBe('lose');
    expect(roundFanfare(g)!.tier).toBe('lose');
  });

  it('a pushed hand is a push, even after insurance lost', () => {
    // You 10,8; dealer A,7 (soft 18 stands under S17).
    const g = act(resolveInsurance(startRound(rigged(['10', 'A', '8', '7']), 1), true), 'stand');
    expect(g.hands[0].outcome).toBe('push');
    expect(roundFanfare(g)!.tier).toBe('push');
  });

  it('a won hand is a win, even after insurance lost', () => {
    const g = act(resolveInsurance(startRound(rigged(['10', 'A', '9', '7']), 1), true), 'stand');
    expect(g.hands[0].outcome).toBe('win');
    expect(roundFanfare(g)!.tier).toBe('win');
  });
});
