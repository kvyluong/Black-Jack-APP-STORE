import { seededRng } from '../cards';
import { DEFAULT_RULES, Rules } from '../rules';
import { DEVIATIONS, SURRENDER_DEVIATIONS, upValue } from '../strategy';
import {
  BOX_INTERVALS,
  DECK,
  DECK_ORDER,
  INSURANCE_ID,
  MAX_NEW_PER_SESSION,
  Question,
  SESSION_SIZE,
  addDays,
  answerFor,
  buildSession,
  cardLabel,
  choiceLabel,
  choicesFor,
  dayText,
  dealSpot,
  deckCard,
  indexFor,
  indexPrompt,
  indexQuestion,
  isCorrect,
  learnedCount,
  nextReviewDay,
  pickSessionCards,
  playAtIndex,
  playBelowIndex,
  playQuestion,
  review,
  ruleText,
} from '../deviations';
import type { CardMemory, DeviationProgress } from '../records';
import { setLang } from '../../i18n/lang';

afterEach(() => setLang('en'));

const RULE_SETS: [string, Rules][] = [
  ['S17 DAS LS', DEFAULT_RULES],
  ['H17', { ...DEFAULT_RULES, dealerHitsSoft17: true }],
  ['no surrender, no DAS', { ...DEFAULT_RULES, lateSurrender: false, doubleAfterSplit: false }],
  ['H17 no surrender', { ...DEFAULT_RULES, dealerHitsSoft17: true, lateSurrender: false }],
];

const TODAY = '2026-10-08';
const mem = (box: number, due: string, right = 1, total = 1): CardMemory => ({ box, due, right, total });

describe('deck', () => {
  it('has every index play plus insurance, in I18 value order then Fab 4', () => {
    const ids = [INSURANCE_ID, ...DEVIATIONS.map((d) => d.id), ...SURRENDER_DEVIATIONS.map((d) => d.id)];
    expect([...DECK_ORDER].sort()).toEqual([...ids].sort());
    expect(DECK.map((c) => c.id)).toEqual([...DECK_ORDER]);
    expect(DECK_ORDER.slice(0, 5)).toEqual(['insurance', '16v10', '15v10', 'TTv5', 'TTv6']);
    expect(DECK_ORDER.slice(-4)).toEqual(['s14v10', 's15v10', 's15v9', 's15vA']);
  });

  it('indexes match the strategy tables (S17) and the H17 tweak for 10 vs A', () => {
    for (const c of DECK) expect(indexFor(c, DEFAULT_RULES)).toBe(c.dev ? c.dev.index : 3);
    expect(indexFor(deckCard('10vA'), { ...DEFAULT_RULES, dealerHitsSoft17: true })).toBe(3);
    expect(indexFor(deckCard('16v10'), DEFAULT_RULES)).toBe(0);
    expect(indexFor(deckCard('TTv5'), DEFAULT_RULES)).toBe(5);
  });
});

describe('play-it hands', () => {
  it('match their deviation and are two-card hands', () => {
    const rng = seededRng(7);
    for (const c of DECK) {
      for (let i = 0; i < 40; i++) {
        const { cards, dealerUp } = dealSpot(c, rng);
        expect(cards).toHaveLength(2);
        if (c.dev) expect(c.dev.match(cards, upValue(dealerUp.rank))).toBe(true);
        else expect(dealerUp.rank).toBe('A');
      }
    }
  });

  it.each(RULE_SETS)('answer flips exactly at the index (%s)', (_, rules) => {
    const rng = seededRng(11);
    for (const c of DECK) {
      const index = indexFor(c, rules);
      for (let i = 0; i < 10; i++) {
        const { cards, dealerUp } = dealSpot(c, rng);
        for (const tc of [index - 3, index - 1]) expect(answerFor(c, cards, dealerUp.rank, tc, rules).answer).toBe(playBelowIndex(c));
        for (const tc of [index, index + 2]) expect(answerFor(c, cards, dealerUp.rank, tc, rules).answer).toBe(playAtIndex(c));
      }
    }
  });

  it('offers the legal buttons, and the answer is always one of them', () => {
    const rng = seededRng(3);
    for (const c of DECK) {
      const q = playQuestion(c, DEFAULT_RULES, rng);
      if (q.kind !== 'play') throw new Error('expected play');
      const choices = choicesFor(c, q.cards);
      expect(choices).toContain(answerFor(c, q.cards, q.dealerUp.rank, q.trueCount, DEFAULT_RULES).answer);
      expect(choices.includes('split')).toBe(c.id.startsWith('TT'));
      expect(choices.includes('surrender')).toBe(c.surrender);
    }
    expect(choicesFor(deckCard(INSURANCE_ID), [])).toEqual(['insure', 'noInsure']);
  });

  it('asks true counts on both sides of the index, often right at it', () => {
    const rng = seededRng(5);
    const c = deckCard('12v2');
    const offsets = new Set<number>();
    let below = 0;
    for (let i = 0; i < 400; i++) {
      const q = playQuestion(c, DEFAULT_RULES, rng);
      if (q.kind !== 'play') continue;
      offsets.add(q.trueCount - 3);
      if (q.trueCount < 3) below++;
    }
    expect(offsets.has(0)).toBe(true);
    expect(offsets.has(-1)).toBe(true);
    expect(below).toBeGreaterThan(120);
    expect(below).toBeLessThan(280);
  });

  it('grades with recommend() and gives a count-play reason on the deviation side', () => {
    const c = deckCard('16v10');
    const q: Question = { kind: 'play', id: c.id, cards: [{ rank: '10', suit: '♠' }, { rank: '6', suit: '♥' }], dealerUp: { rank: 'K', suit: '♣' }, trueCount: 1 };
    expect(isCorrect(q, 'stand', DEFAULT_RULES)).toBe(true);
    expect(isCorrect(q, 'hit', DEFAULT_RULES)).toBe(false);
    expect(answerFor(c, q.cards, 'K', 1, DEFAULT_RULES).reason).toMatch(/Count play/);
    expect(answerFor(deckCard(INSURANCE_ID), q.cards, 'A', 3, DEFAULT_RULES)).toMatchObject({ answer: 'insure' });
    expect(answerFor(deckCard(INSURANCE_ID), q.cards, 'A', 2, DEFAULT_RULES)).toMatchObject({ answer: 'noInsure' });
  });
});

describe('name-the-index questions', () => {
  it('have 4 distinct choices including the index', () => {
    const rng = seededRng(9);
    for (const c of DECK) {
      for (let i = 0; i < 20; i++) {
        const q = indexQuestion(c, DEFAULT_RULES, rng);
        if (q.kind !== 'index') throw new Error('expected index');
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(indexFor(c, DEFAULT_RULES));
        expect(isCorrect(q, indexFor(c, DEFAULT_RULES), DEFAULT_RULES)).toBe(true);
        expect(isCorrect(q, q.choices.find((n) => n !== indexFor(c, DEFAULT_RULES))!, DEFAULT_RULES)).toBe(false);
      }
    }
  });

  it('reads naturally', () => {
    expect(indexPrompt(deckCard('16v10'))).toBe('16 vs 10: at what true count do you stand?');
    expect(indexPrompt(deckCard('s15v9'))).toBe('15 vs 9: at what true count do you surrender?');
    expect(indexPrompt(deckCard(INSURANCE_ID))).toBe('Insurance: at what true count do you take insurance?');
    expect(ruleText(deckCard('16v10'), DEFAULT_RULES)).toBe('16 vs 10: Stand at +0 or higher; hit below.');
  });
});

describe('Spanish', () => {
  it('translates prompts, rules, labels and reasons', () => {
    setLang('es');
    expect(cardLabel(deckCard('TTv5'))).toBe('10,10 contra 5');
    expect(cardLabel(deckCard('s14v10'))).toBe('14 contra 10');
    expect(indexPrompt(deckCard('16v10'))).toBe('16 contra 10: ¿con qué conteo real te plantas?');
    expect(indexPrompt(deckCard(INSURANCE_ID))).toBe('Seguro: ¿con qué conteo real tomas el seguro?');
    expect(ruleText(deckCard('12v2'), DEFAULT_RULES)).toBe('12 contra 2: Plantarse con +3 o más; pedir por debajo.');
    expect(choiceLabel('insure')).toBe('Tomar seguro');
    expect(choiceLabel('surrender')).toBe('Rendirse');
    const c = deckCard('16v10');
    expect(answerFor(c, [{ rank: '9', suit: '♠' }, { rank: '7', suit: '♥' }], '10', 2, DEFAULT_RULES).reason).toMatch(/^Jugada por conteo/);
    expect(answerFor(deckCard(INSURANCE_ID), [], 'A', 4, DEFAULT_RULES).reason).toMatch(/^Tómalo/);
    expect(dayText(addDays(TODAY, 1), TODAY)).toBe('mañana');
    expect(dayText(addDays(TODAY, 4), TODAY)).toBe('en 4 días');
  });
});

describe('spaced review', () => {
  it('moves up a box on a right answer and back to 0 on a miss', () => {
    const a = review(undefined, true, TODAY);
    expect(a).toEqual({ box: 1, due: addDays(TODAY, BOX_INTERVALS[1]), right: 1, total: 1 });
    const b = review(mem(4, TODAY), true, TODAY);
    expect(b.box).toBe(5);
    expect(b.due).toBe(addDays(TODAY, 14));
    expect(review(mem(5, TODAY), true, TODAY).box).toBe(5);
    const miss = review(mem(4, TODAY), false, TODAY);
    expect(miss).toMatchObject({ box: 0, due: TODAY, right: 1, total: 2 });
  });

  it('promotes a card only once per session', () => {
    const first = review(undefined, true, TODAY);
    const again = review(first, true, TODAY, false);
    expect(again).toMatchObject({ box: 1, due: first.due, right: 2, total: 2 });
    expect(review(first, false, TODAY, false).box).toBe(0);
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-30', 4)).toBe('2026-11-03');
  });

  it('starts a new player with the first 4 cards in value order', () => {
    expect(pickSessionCards({ cards: {} }, TODAY)).toEqual(['insurance', '16v10', '15v10', 'TTv5']);
    const qs = buildSession({ cards: {} }, TODAY, DEFAULT_RULES, seededRng(1));
    expect(qs).toHaveLength(SESSION_SIZE);
    for (let i = 1; i < qs.length; i++) expect(qs[i].id).not.toBe(qs[i - 1].id);
    // Each new card is first asked as "play it", then as "name the index".
    const first = new Map<string, Question['kind']>();
    for (const q of qs) if (!first.has(q.id)) first.set(q.id, q.kind);
    expect([...first.values()].every((k) => k === 'play')).toBe(true);
    expect(qs.some((q) => q.kind === 'index')).toBe(true);
  });

  it('puts due cards first, then weak ones, then new ones (at most 4)', () => {
    const p: DeviationProgress = {
      cards: {
        insurance: mem(4, addDays(TODAY, 3)),
        '16v10': mem(2, TODAY),
        '15v10': mem(0, addDays(TODAY, -2), 0, 2),
        TTv5: mem(1, addDays(TODAY, 1)),
        TTv6: mem(3, addDays(TODAY, 5)),
      },
    };
    const ids = pickSessionCards(p, TODAY);
    expect(ids.slice(0, 2)).toEqual(['15v10', '16v10']);
    expect(ids[2]).toBe('TTv5');
    expect(ids).not.toContain('insurance');
    expect(ids).not.toContain('TTv6');
    expect(ids.slice(3)).toEqual(['10v10', '12v3', '12v2', '11vA']);
    expect(ids.length).toBe(3 + MAX_NEW_PER_SESSION);
  });

  it('caps a session at 10 cards when lots are due', () => {
    const cards: Record<string, CardMemory> = {};
    for (const id of DECK_ORDER) cards[id] = mem(2, TODAY);
    expect(pickSessionCards({ cards }, TODAY)).toHaveLength(SESSION_SIZE);
  });

  it('gives extra practice when nothing is due and everything is learned', () => {
    const cards: Record<string, CardMemory> = {};
    for (const id of DECK_ORDER) cards[id] = mem(4, addDays(TODAY, 5));
    cards['9v7'] = mem(3, addDays(TODAY, 2));
    const p = { cards };
    expect(pickSessionCards(p, TODAY)[0]).toBe('9v7');
    expect(buildSession(p, TODAY, DEFAULT_RULES, seededRng(2))).toHaveLength(SESSION_SIZE);
    expect(learnedCount(p)).toBe(DECK.length);
    expect(nextReviewDay(p, TODAY)).toBe(addDays(TODAY, 2));
  });

  it('reports today as the next review while new cards remain or cards are overdue', () => {
    expect(nextReviewDay({ cards: {} }, TODAY)).toBe(TODAY);
    const cards: Record<string, CardMemory> = {};
    for (const id of DECK_ORDER) cards[id] = mem(1, addDays(TODAY, 1));
    cards['12v4'] = mem(0, addDays(TODAY, -3));
    expect(nextReviewDay({ cards }, TODAY)).toBe(TODAY);
    expect(dayText(TODAY, TODAY)).toBe('today');
  });
});
