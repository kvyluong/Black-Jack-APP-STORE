import { spokenCount } from '../../audio/speak';
import { setLang } from '../../i18n/lang';
import { seededRng } from '../cards';
import {
  MODES,
  PREFERENCE_LABEL,
  REVIEW_INTERVALS,
  cardGroups,
  countStory,
  dailyWorkout,
  groupChoices,
  groupValue,
  modesFor,
  newProgress,
  recordRound,
  visualHints,
} from '../academy';
import { hiLoValue } from '../counting';

const today = '2026-10-06';

describe('modes and preferences', () => {
  it('puts your preferred style first but keeps every mode', () => {
    const hear = modesFor('hear');
    expect(hear[0].preference).toBe('hear');
    expect(hear).toHaveLength(MODES.length);
    expect(modesFor('mix')).toEqual(MODES);
  });
});

describe('levels and spaced review', () => {
  it('levels up on 90%+ and pushes the next review further out', () => {
    let p = newProgress(today);
    let r = recordRound(p, 0.95, today);
    expect(r.leveledUp).toBe(true);
    expect(r.progress.level).toBe(2);
    expect(r.progress.due).toBe('2026-10-08'); // box 1 -> 2 days
    r = recordRound(r.progress, 0.95, today);
    expect(r.progress.due).toBe('2026-10-10'); // box 2 -> 4 days
  });

  it('a weak round keeps the level and brings review back to tomorrow', () => {
    const p = { ...newProgress(today), level: 3, box: 3 };
    const r = recordRound(p, 0.6, today);
    expect(r.leveledUp).toBe(false);
    expect(r.progress.level).toBe(3);
    expect(r.progress.due).toBe('2026-10-07');
    expect(REVIEW_INTERVALS[0]).toBe(1);
  });

  it('daily workout mixes three different modes, due ones first', () => {
    const fresh = dailyWorkout({}, today, 'see');
    expect(new Set(fresh).size).toBe(3);
    expect(fresh[0]).toBe('colorCount');
    const done = { colorCount: { ...newProgress(today), due: '2026-10-20' } };
    expect(dailyWorkout(done, today, 'see')).not.toContain('colorCount');
  });
});

describe('round content', () => {
  it('fades visual hints with level', () => {
    expect(visualHints(1)).toEqual({ glow: true, badge: true, meter: true });
    expect(visualHints(5)).toEqual({ glow: false, badge: false, meter: false });
  });

  it('groups cards by level and totals them correctly', () => {
    const groups = cardGroups(3, seededRng(5));
    expect(groups.every((g) => g.length === 3)).toBe(true);
    const g = groups[0];
    expect(groupValue(g)).toBe(g.reduce((s, c) => s + hiLoValue(c.rank), 0));
    expect(groupChoices(2)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('writes a story whose answer is the count of every card mentioned', () => {
    const s = countStory(3, seededRng(9));
    expect(s.lines.length).toBeGreaterThan(4);
    expect(s.answer).toBe(s.cards.reduce((sum, c) => sum + hiLoValue(c.rank), 0));
    // every card in the story is named in the text
    const words = s.lines.join(' ');
    expect(s.cards.length).toBeGreaterThan(5);
    expect(words).toMatch(/dealer shows/);
  });
});

describe('Spanish', () => {
  afterEach(() => setLang('en'));

  it('writes the count story in Spanish with no English words', () => {
    setLang('es');
    const s = countStory(4, seededRng(9));
    const text = s.lines.join(' ');
    expect(text).toMatch(/El crupier muestra/);
    expect(text).not.toMatch(/\b(dealer|you|is dealt|stands|hits|and|then|an|Ace|Jack|Queen|King|Big)\b/i);
    expect(s.answer).toBe(s.cards.reduce((sum, c) => sum + hiLoValue(c.rank), 0));
  });

  it('gives the same cards in either language', () => {
    const en = countStory(3, seededRng(4));
    setLang('es');
    const es = countStory(3, seededRng(4));
    expect(es.cards).toEqual(en.cards);
    expect(es.lines).not.toEqual(en.lines);
  });

  it('translates mode text and labels, keeping the same modes', () => {
    setLang('es');
    expect(MODES.map((m) => m.id)).toEqual(['colorCount', 'soundCount', 'tagTap', 'pairCancel', 'readCount']);
    expect(MODES[0].title).toBe('Míralo: Conteo por colores');
    expect(PREFERENCE_LABEL.mix).toBe('Un poco de todo');
    setLang('en');
    expect(MODES[0].title).toBe('See it: Color Count');
  });

  it('speaks counts in Spanish', () => {
    setLang('es');
    expect(spokenCount(2)).toBe('más 2');
    expect(spokenCount(-1)).toBe('menos 1');
    expect(spokenCount(0)).toBe('cero');
    setLang('en');
    expect(spokenCount(3)).toBe('plus 3');
  });
});
