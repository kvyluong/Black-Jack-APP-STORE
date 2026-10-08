import { setLang } from '../../i18n/lang';
import { seededRng } from '../cards';
import {
  CARDS_PER_DECK,
  averageError,
  deckAnswerText,
  deckChoices,
  deckQuestion,
  deckTip,
  discardedCards,
  formatDecks,
  questionFor,
  recordDeckEstimate,
  scoreDeckGuess,
} from '../decks';
import { act, newGame, startRound } from '../game';
import { emptyDeckEstimates } from '../records';
import { DEFAULT_RULES } from '../rules';

describe('deck questions', () => {
  it('stay in a realistic range and include the answer among half-deck choices', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 500; i++) {
      const q = deckQuestion(rng);
      expect([6, 8]).toContain(q.decks);
      expect(q.played).toBeGreaterThanOrEqual(26);
      expect(q.played).toBeLessThanOrEqual(Math.floor(q.decks * CARDS_PER_DECK * 0.8));
      expect(q.remaining + q.played).toBe(q.decks * CARDS_PER_DECK);
      expect(q.choices).toContain(q.answer);
      expect(q.choices).toHaveLength(5);
      q.choices.forEach((c, j) => {
        expect(c * 2).toBe(Math.round(c * 2));
        expect(c).toBeGreaterThanOrEqual(0.5);
        expect(c).toBeLessThanOrEqual(q.decks);
        if (j > 0) expect(c - q.choices[j - 1]).toBe(0.5);
      });
      expect(Math.abs(q.answer - q.exact)).toBeLessThanOrEqual(0.25);
    }
  });

  it('works out the exact answer', () => {
    const q = questionFor(6, 156); // 156 played of 312 → 156 left = 3 decks
    expect(q.remaining).toBe(156);
    expect(q.exact).toBe(3);
    expect(q.answer).toBe(3);
    expect(questionFor(8, 100).answer).toBe(6); // 316 left = 6.08 decks
    expect(questionFor(6, 260).answer).toBe(1); // 52 left
  });

  it('clips the choices at the edges of the shoe', () => {
    expect(deckChoices(0.5, 6, () => 0)).toEqual([0.5, 1, 1.5, 2, 2.5]);
    expect(deckChoices(6, 6, () => 0.99)).toEqual([4, 4.5, 5, 5.5, 6]);
  });
});

describe('scoring and records', () => {
  it('counts within half a deck as right', () => {
    expect(scoreDeckGuess(3, 3)).toEqual({ error: 0, right: true });
    expect(scoreDeckGuess(3.5, 3)).toEqual({ error: 0.5, right: true });
    expect(scoreDeckGuess(4, 3)).toEqual({ error: 1, right: false });
    expect(scoreDeckGuess(2.5, 3.04).right).toBe(false);
  });

  it('keeps the last 20 errors', () => {
    let rec = emptyDeckEstimates();
    for (let i = 0; i < 25; i++) rec = recordDeckEstimate(rec, i, i % 2 === 0);
    expect(rec.total).toBe(25);
    expect(rec.right).toBe(13);
    expect(rec.recentErrors).toHaveLength(20);
    expect(rec.recentErrors[0]).toBe(5);
    expect(averageError([0.5, 0, 1])).toBe(0.5);
    expect(averageError([])).toBeNull();
  });

  it('counts the discard tray without the cards still on the table', () => {
    const g = newGame(DEFAULT_RULES, 1000, seededRng(3));
    expect(discardedCards(g)).toBe(0);
    let s = startRound(g, 10, seededRng(4));
    if (s.phase === 'playing') s = act(s, 'stand', seededRng(5));
    const dealt = s.shoeSize - s.shoe.length;
    expect(dealt).toBeGreaterThan(0);
    expect(discardedCards(s)).toBe(0); // all still on the table
    expect(discardedCards({ ...s, hands: [], dealer: [], phase: 'betting' })).toBe(dealt);
  });
});

describe('deck text in Spanish', () => {
  beforeEach(() => setLang('es'));
  afterEach(() => setLang('en'));

  it('explains the answer with decimal commas', () => {
    expect(formatDecks(2.5)).toBe('2,5');
    expect(deckAnswerText(questionFor(6, 130))).toBe(
      'Quedan 182 cartas en el zapato = 3,5 barajas. A la media baraja más cercana: 3,5.',
    );
    expect(deckTip(() => 0)).toContain('1,5 cm');
  });

  it('reads in English too', () => {
    setLang('en');
    expect(deckAnswerText(questionFor(6, 156))).toBe('156 cards left in the shoe = 3 decks. To the nearest half deck: 3.');
  });
});
