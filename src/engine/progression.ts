// Practice tables and player levels. There is no betting: every hand is played
// for practice, and tables unlock as your level rises from playing well.

import { localized, tr } from '../i18n/lang';

/**
 * The engine still scores hands with a stake internally. Every hand uses this
 * fixed, hidden stake against a budget that never runs out, so nothing in the
 * app is ever wagered or shown as money.
 */
export const PRACTICE_STAKE = 1;
export const PRACTICE_BUDGET = 1_000_000;

export interface CasinoTable {
  id: string;
  name: string;
  /** One-line flavor shown in the lobby. */
  blurb: string;
  /** Reach this player level to unlock the table for good. */
  unlockLevel: number;
  /** Felt color for this room. */
  felt: string;
}

type TableText = Pick<CasinoTable, 'name' | 'blurb'>;

/** A table whose name and blurb are getters that read the current language. */
function table(base: Omit<CasinoTable, keyof TableText>, text: { en: TableText; es: TableText }): CasinoTable {
  const t = localized(text);
  return Object.defineProperties(base as CasinoTable, {
    name: { get: () => t.name, enumerable: true },
    blurb: { get: () => t.blurb, enumerable: true },
  });
}

export const TABLES: CasinoTable[] = [
  table(
    { id: 'floor', unlockLevel: 1, felt: '#0B5D3B' },
    {
      en: { name: 'Main Floor', blurb: 'A calm table to learn on. Everyone starts here.' },
      es: { name: 'Sala principal', blurb: 'Una mesa tranquila para aprender. Todos empiezan aquí.' },
    },
  ),
  table(
    { id: 'downtown', unlockLevel: 3, felt: '#123F6B' },
    {
      en: { name: 'Downtown', blurb: 'A busier table with more players to watch.' },
      es: { name: 'Centro', blurb: 'Una mesa con más gente y más jugadores que observar.' },
    },
  ),
  table(
    { id: 'strip', unlockLevel: 5, felt: '#6B1530' },
    {
      en: { name: 'The Strip', blurb: 'Bright lights and a fast dealer.' },
      es: { name: 'El Strip', blurb: 'Luces brillantes y un crupier rápido.' },
    },
  ),
  table(
    { id: 'highlimit', unlockLevel: 8, felt: '#3D1F5C' },
    {
      en: { name: 'Quiet Room', blurb: 'Roped off and quiet. Focus on every decision.' },
      es: { name: 'Sala tranquila', blurb: 'Acordonada y en silencio. Concéntrate en cada decisión.' },
    },
  ),
  table(
    { id: 'salon', unlockLevel: 12, felt: '#1F1F1F' },
    {
      en: { name: 'Private Salon', blurb: 'For players who have mastered the basics.' },
      es: { name: 'Salón privado', blurb: 'Para quienes ya dominan lo básico.' },
    },
  ),
];

export function getTable(id: string): CasinoTable {
  return TABLES.find((t) => t.id === id) ?? TABLES[0];
}

export const isUnlocked = (t: CasinoTable, level: number) => level >= t.unlockLevel;

/** The next table you haven't unlocked yet, if any. */
export function nextUnlock(level: number): CasinoTable | undefined {
  return TABLES.find((t) => !isUnlocked(t, level));
}

/** Tables unlocked by moving from level `before` to level `after`. */
export function newlyUnlocked(before: number, after: number): CasinoTable[] {
  return TABLES.filter((t) => t.unlockLevel > before && t.unlockLevel <= after);
}

// ---------- Levels ----------

export const XP_PER_HAND = 10;
export const XP_PER_CORRECT = 5;

/** Total XP needed to reach a level: 0, 100, 300, 600, 1000, ... */
export const xpForLevel = (level: number) => 50 * (level - 1) * level;

const TITLES: [number, string, string][] = [
  [1, 'Rookie', 'Novato'],
  [3, 'Regular', 'Habitual'],
  [5, 'Card Sharp', 'Tahúr'],
  [8, 'Counter', 'Contador'],
  [12, 'Advantage Player', 'Jugador con ventaja'],
  [16, 'Legend', 'Leyenda'],
];

export function titleFor(level: number): string {
  const [, en, es] = [...TITLES].reverse().find(([min]) => level >= min)!;
  return tr(en, es);
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP earned within the current level. */
  into: number;
  /** XP the current level spans. */
  span: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  return { level, title: titleFor(level), into: xp - start, span: xpForLevel(level + 1) - start };
}

/** XP for a finished round: per hand you played, plus per correct decision you made. */
export function roundXp(yourHands: number, correctDecisions: number): number {
  return yourHands * XP_PER_HAND + correctDecisions * XP_PER_CORRECT;
}

// ---------- Dates ----------

export function localDay(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
