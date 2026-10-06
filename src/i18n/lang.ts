// App language. Pure TypeScript (no React), so the engine can use it too.
//
// Text lives next to the code that shows it, as `localized({ en: {...}, es: {...} })`.
// The Spanish object must have exactly the same keys and types as the English one,
// so a missing translation is a type error.

export type Lang = 'en' | 'es';
export type LanguageSetting = 'system' | Lang;

export const LANGUAGE_NAME: Record<Lang, string> = { en: 'English', es: 'Español' };

let current: Lang = 'en';

export const getLang = (): Lang => current;

/** Called by the settings store whenever the language setting or device language changes. */
export function setLang(lang: Lang) {
  current = lang;
}

/** The language to use for a setting, given the device's language code (e.g. "es"). */
export function resolveLang(setting: LanguageSetting, deviceLanguage: string | null | undefined): Lang {
  if (setting !== 'system') return setting;
  return deviceLanguage?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/**
 * An object whose properties always read from the current language.
 *
 *   const T = localized({ en: { deal: 'Deal' }, es: { deal: 'Repartir' } });
 *   T.deal  // "Deal" or "Repartir"
 *
 * Works with Object.keys/entries and spreads, so it can replace a plain constant.
 */
export function localized<T extends object>(text: { en: T; es: NoInfer<T> }): T {
  const pick = () => text[current] as Record<PropertyKey, unknown>;
  return new Proxy({} as T, {
    get: (_, key) => pick()[key],
    has: (_, key) => key in pick(),
    ownKeys: () => Reflect.ownKeys(pick()),
    getOwnPropertyDescriptor: (_, key) => {
      const d = Reflect.getOwnPropertyDescriptor(pick(), key);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

/** Picks one of two strings for the current language: `tr('Deal', 'Repartir')`. */
export const tr = <T>(en: T, es: T): T => (current === 'es' ? es : en);
