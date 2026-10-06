import { setLang } from '../../i18n/lang';
import { getLesson, getLessons, LESSONS, UNIT_LABEL } from '../lessons';
import { LESSONS_ES } from '../lessons.es';

afterEach(() => setLang('en'));

describe('Spanish lessons', () => {
  it('match the English lessons structurally', () => {
    expect(LESSONS_ES.map((l) => l.id)).toEqual(LESSONS.map((l) => l.id));
    LESSONS.forEach((en, i) => {
      const es = LESSONS_ES[i];
      expect(es.unit).toBe(en.unit);
      expect(es.practice?.href).toBe(en.practice?.href);
      expect(Boolean(es.practice?.label)).toBe(Boolean(en.practice?.label));
      expect(es.sections).toHaveLength(en.sections.length);
      en.sections.forEach((sec, j) => {
        expect(es.sections[j].cards).toEqual(sec.cards);
        expect(es.sections[j].showTags).toBe(sec.showTags);
        expect(Boolean(es.sections[j].heading)).toBe(Boolean(sec.heading));
        expect(es.sections[j].body.length).toBeGreaterThan(0);
      });
      expect(es.quiz).toHaveLength(en.quiz.length);
      en.quiz.forEach((q, j) => {
        expect(es.quiz[j].answer).toBe(q.answer);
        expect(es.quiz[j].options).toHaveLength(q.options.length);
      });
    });
  });

  it('are actually translated', () => {
    LESSONS.forEach((en, i) => {
      expect(LESSONS_ES[i].title).not.toBe(en.title);
      expect(LESSONS_ES[i].summary).not.toBe(en.summary);
    });
  });

  it('getLesson and getLessons follow setLang', () => {
    expect(getLessons()).toBe(LESSONS);
    expect(getLesson('rules')?.title).toBe('How Blackjack Works');
    expect(UNIT_LABEL.Strategy).toBe('Strategy');
    setLang('es');
    expect(getLessons()).toBe(LESSONS_ES);
    expect(getLesson('rules')?.title).toBe('Cómo se juega al blackjack');
    expect(UNIT_LABEL.Strategy).toBe('Estrategia');
    expect(getLesson('missing')).toBeUndefined();
  });
});
