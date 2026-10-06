import { Card, RANKS, Rank } from '../cards';
import { DEFAULT_RULES } from '../rules';
import { ACTION_LABEL, DEVIATIONS, DecisionContext, recommend } from '../strategy';
import { setLang } from '../../i18n/lang';

const hand = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: '♠' }));

const ctx = (cards: Card[], dealerUp: Rank, extra: Partial<DecisionContext> = {}): DecisionContext => ({
  cards,
  dealerUp,
  rules: DEFAULT_RULES,
  canDouble: true,
  canSplit: true,
  canSurrender: true,
  ...extra,
});

afterEach(() => setLang('en'));

describe('strategy in Spanish', () => {
  it('translates action labels', () => {
    setLang('es');
    expect(ACTION_LABEL.hit).toBe('Pedir');
    expect(ACTION_LABEL.stand).toBe('Plantarse');
    expect(ACTION_LABEL.double).toBe('Doblar');
    expect(ACTION_LABEL.split).toBe('Dividir');
    expect(ACTION_LABEL.surrender).toBe('Rendirse');
    setLang('en');
    expect(ACTION_LABEL.hit).toBe('Hit');
  });

  it('explains a decision in Spanish', () => {
    setLang('es');
    expect(recommend(ctx(hand('8', '8'), '10')).reason).toMatch(/^Divide siempre los 8/);
    expect(recommend(ctx(hand('10', '6'), '7', { canSurrender: false })).reason).toContain('el crupier muestra un 7');
  });

  it('explains count plays and deviation labels in Spanish', () => {
    setLang('es');
    const r = recommend(ctx(hand('10', '6'), '10', { canSurrender: false, trueCount: 1 }));
    expect(r.deviation?.label).toBe('16 contra 10');
    expect(r.reason).toContain('Jugada por conteo');
    expect(r.reason).toContain('toca plantarse en lugar de pedir');
    expect(DEVIATIONS.find((d) => d.id === '16v10')?.label).toBe('16 contra 10');
    setLang('en');
    expect(DEVIATIONS.find((d) => d.id === '16v10')?.label).toBe('16 vs 10');
  });

  it('never falls back to English across a sweep of hands', () => {
    setLang('es');
    const english = /\b(the|dealer|hit|stand|double|split|surrender|soft|bust|count|an|you)\b/i;
    for (const a of RANKS) {
      for (const b of RANKS) {
        for (const up of RANKS) {
          for (const trueCount of [undefined, -3, 0, 5]) {
            for (const canSurrender of [true, false]) {
              for (const dealerHitsSoft17 of [true, false]) {
                const rules = { ...DEFAULT_RULES, dealerHitsSoft17 };
                const { reason } = recommend(ctx(hand(a, b), up, { canSurrender, trueCount, rules }));
                expect(reason).not.toMatch(english);
              }
            }
          }
        }
      }
    }
  });
});
