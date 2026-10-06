import { getLang, localized, resolveLang, setLang, tr } from '../lang';

describe('lang', () => {
  afterEach(() => setLang('en'));

  it('follows the phone when set to system', () => {
    expect(resolveLang('system', 'es')).toBe('es');
    expect(resolveLang('system', 'es-MX')).toBe('es');
    expect(resolveLang('system', 'fr')).toBe('en');
    expect(resolveLang('system', null)).toBe('en');
    expect(resolveLang('en', 'es')).toBe('en');
  });

  it('localized objects read the current language, including keys and spreads', () => {
    const T = localized({ en: { deal: 'Deal', bet: (n: number) => `Bet $${n}` }, es: { deal: 'Repartir', bet: (n: number) => `Apuesta $${n}` } });
    expect(T.deal).toBe('Deal');
    setLang('es');
    expect(getLang()).toBe('es');
    expect(T.deal).toBe('Repartir');
    expect(T.bet(5)).toBe('Apuesta $5');
    expect(Object.keys(T)).toEqual(['deal', 'bet']);
    expect({ ...T }.deal).toBe('Repartir');
    expect(tr('Hit', 'Pedir')).toBe('Pedir');
  });
});
