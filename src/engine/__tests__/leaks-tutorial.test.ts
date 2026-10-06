import { setLang } from '../../i18n/lang';
import { Card, Rank, seededRng } from '../cards';
import { hiLoValue } from '../counting';
import { act, decisionContext, startRound } from '../game';
import { handValue } from '../hand';
import {
  CATEGORY_INFO,
  categorize,
  describeBest,
  emptyLeaks,
  focusedQuestion,
  rankedCategories,
  recordDecision,
  recordInsurance,
  spotLabel,
  topMissedSpots,
  weakestDrillable,
} from '../leaks';
import { TABLES, levelInfo, titleFor } from '../progression';
import { recommend } from '../strategy';
import { TUTORIAL, TUTORIAL_BET, tutorialGame } from '../tutorial';

const h = (...r: Rank[]): Card[] => r.map((rank) => ({ rank, suit: '♠' }));

describe('leaks', () => {
  it('sorts decisions into categories and readable spots', () => {
    expect(categorize(h('8', '8'), true)).toBe('pair');
    expect(categorize(h('8', '8'), false)).toBe('stiff');
    expect(categorize(h('A', '7'), true)).toBe('soft');
    expect(categorize(h('6', '5'), true)).toBe('hardLow');
    expect(categorize(h('10', '7'), true)).toBe('hardHigh');
    expect(spotLabel(h('K', 'Q'), '6', true)).toBe('10,10 vs 6');
    expect(spotLabel(h('A', '7'), 'A', true)).toBe('Soft 18 vs A');
    expect(spotLabel(h('10', '6'), '10', true)).toBe('Hard 16 vs 10');
  });

  it('finds the weakest category and the most-missed spots', () => {
    let s = emptyLeaks();
    for (let i = 0; i < 6; i++) s = recordDecision(s, { cards: h('A', '7'), dealerUp: '9', canSplit: true, chosen: 'stand', best: 'hit' });
    for (let i = 0; i < 6; i++) s = recordDecision(s, { cards: h('10', '6'), dealerUp: '6', canSplit: true, chosen: 'stand', best: 'stand' });
    s = recordDecision(s, { cards: h('10', '2'), dealerUp: '3', canSplit: true, chosen: 'stand', best: 'hit' });
    expect(rankedCategories(s)[0].category).toBe('soft');
    expect(weakestDrillable(s)).toBe('soft');
    expect(topMissedSpots(s)[0]).toMatchObject({ label: 'Soft 18 vs 9', best: 'hit', total: 6, right: 0 });
    expect(rankedCategories(s).find((c) => c.category === 'stiff')!.tally).toEqual({ right: 6, total: 7 });
    s = recordInsurance(s, false);
    expect(s.byCategory.insurance).toEqual({ right: 0, total: 1 });
  });

  it('builds drill questions from only the chosen category', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 50; i++) {
      expect(categorize(focusedQuestion('soft', rng).cards, true)).toBe('soft');
      expect(categorize(focusedQuestion('stiff', rng).cards, true)).toBe('stiff');
      expect(categorize(focusedQuestion('pair', rng).cards, true)).toBe('pair');
      expect(categorize(focusedQuestion('hardLow', rng).cards, true)).toBe('hardLow');
    }
  });
});

describe('tutorial', () => {
  it('each scripted hand plays out as taught and ends in a win', () => {
    for (const hand of TUTORIAL) {
      let g = startRound(tutorialGame(hand, 1000), TUTORIAL_BET);
      expect(g.phase).toBe('playing');
      for (const step of hand.steps) g = act(g, step.action);
      expect(g.phase).toBe('roundOver');
      expect(g.hands[0].outcome).toBe('win');
      expect(g.lastNet).toBe(TUTORIAL_BET);
    }
  });

  it('the coach text matches the cards', () => {
    const g = startRound(tutorialGame(TUTORIAL[0], 1000), TUTORIAL_BET);
    expect(handValue(g.hands[0].cards).total).toBe(17);
    expect(g.dealer[0].rank).toBe('6');
    const g2 = act(startRound(tutorialGame(TUTORIAL[1], 1000), TUTORIAL_BET), 'hit');
    expect(handValue(g2.hands[0].cards).total).toBe(18);
  });

  it('every scripted step is the basic strategy play', () => {
    for (const hand of TUTORIAL) {
      let g = startRound(tutorialGame(hand, 1000), TUTORIAL_BET);
      for (const step of hand.steps) {
        expect(recommend(decisionContext(g, false)!).action).toBe(step.action);
        g = act(g, step.action);
      }
    }
  });

  it('the count teaser ends positive', () => {
    const tags = TUTORIAL.flatMap((h) => h.draws).reduce((sum, r) => sum + hiLoValue(r), 0);
    expect(tags).toBeGreaterThan(0);
  });
});

describe('Spanish', () => {
  beforeEach(() => setLang('es'));
  afterEach(() => setLang('en'));

  it('labels spots in Spanish but keys them the same in both languages', () => {
    expect(spotLabel(h('A', '7'), '9', true)).toBe('18 blando vs 9');
    expect(spotLabel(h('10', '6'), '10', true)).toBe('16 duro vs 10');
    expect(spotLabel(h('8', '8'), '10', true)).toBe('8,8 vs 10');

    let s = emptyLeaks();
    setLang('en');
    s = recordDecision(s, { cards: h('A', '7'), dealerUp: '9', canSplit: true, chosen: 'stand', best: 'hit' });
    setLang('es');
    s = recordDecision(s, { cards: h('7', 'A'), dealerUp: '9', canSplit: true, chosen: 'stand', best: 'hit' });
    expect(Object.keys(s.spots)).toEqual(['Soft 18 vs 9']);
    expect(topMissedSpots(s)[0]).toMatchObject({ label: '18 blando vs 9', total: 2, right: 0 });
    expect(describeBest(topMissedSpots(s)[0])).toMatch(/^Mejor jugada: /);
    setLang('en');
    expect(topMissedSpots(s)[0].label).toBe('Soft 18 vs 9');
  });

  it('translates categories, tables, levels and the tutorial', () => {
    expect(CATEGORY_INFO.pair.title).toBe('Parejas');
    expect(TABLES[0].name).toBe('Sala principal');
    expect(titleFor(1)).toBe('Novato');
    expect(levelInfo(0).title).toBe('Novato');
    expect(TUTORIAL[0].title).toBe('Mano 1: Saber cuándo plantarse');
    expect(TUTORIAL[1].steps[0].say).toMatch(/Pedir/);
    setLang('en');
    expect(TABLES[0].name).toBe('Main Floor');
    expect(TUTORIAL[1].steps[0].say).toMatch(/Tap Hit/);
  });
});
