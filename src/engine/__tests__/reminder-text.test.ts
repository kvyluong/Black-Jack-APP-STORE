import { setLang } from '../../i18n/lang';
import { REMINDERS_AHEAD, reminderHints, reminderTexts } from '../reminders';

describe('smarter reminder text', () => {
  afterEach(() => setLang('en'));

  it('points at the next lesson, then the weakest spot, a different line each day', () => {
    const texts = reminderTexts({ streak: 3, next: 'lessons', nextLesson: 'basic-strategy', leak: { category: 'soft', pct: 82 } });
    expect(texts).toHaveLength(REMINDERS_AHEAD);
    expect(texts[0].title).toBe('Keep your 3-day streak');
    expect(texts[0].body).toBe('Next lesson: “Basic Strategy: The Big Ideas”. A few minutes is all it takes.');
    expect(texts[1].body).toBe('Soft hands: 82% right so far. A short drill tightens it up.');
  });

  it('names the next benchmark after the lessons, and spots due for review', () => {
    const hints = reminderHints({ streak: 0, next: 'countDeck', reviewDue: 4 });
    expect(hints).toEqual([
      'Your next step: Count a full deck. A few minutes today moves it along.',
      '4 hands you missed are due for review.',
    ]);
    expect(reminderHints({ streak: 0, reviewDue: 1 })).toEqual(['1 hand you missed is due for review.']);
  });

  it('falls back to the plain goal text when there is nothing specific', () => {
    const texts = reminderTexts({ streak: 0, leak: { category: 'pair', pct: 100 } });
    expect(texts.map((t) => t.body)).toEqual(['A few minutes of practice starts a streak.', 'A few minutes of practice starts a streak.']);
    expect(texts[0].title).toBe('Your daily goals are ready');
  });

  it('repeats the one hint when there is only one', () => {
    const texts = reminderTexts({ streak: 1, next: 'exam' });
    expect(texts[0].body).toBe(texts[1].body);
  });

  it('writes Spanish too', () => {
    setLang('es');
    const texts = reminderTexts({ streak: 2, next: 'lessons', nextLesson: 'hi-lo', leak: { category: 'stiff', pct: 70 }, reviewDue: 2 });
    expect(texts[0].title).toBe('Mantén tu racha de 2 días');
    expect(texts[0].body).toMatch(/^Siguiente lección: /);
    expect(texts[1].body).toBe('Toca repasar 2 manos que fallaste.');
  });

  it('never mentions money or casino rewards', () => {
    for (const lang of ['en', 'es'] as const) {
      setLang(lang);
      const all = [
        ...reminderHints({ streak: 5, next: 'lessons', nextLesson: 'rules', leak: { category: 'pair', pct: 50 }, reviewDue: 3 }),
        ...(['strategy', 'countDeck', 'trueCount', 'decks', 'deviations', 'exam'] as const).flatMap((next) => reminderHints({ streak: 0, next })),
      ].join(' ');
      expect(all).not.toMatch(/chip|bet|win|money|prize|ficha|apuesta|gana|dinero|premio/i);
    }
  });
});
