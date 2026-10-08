// Counting Academy: several ways to practice the count (in the player's chosen
// system: Hi-Lo, KO, Hi-Opt I or Omega II), one per way people
// like to learn, each built on a technique with good evidence behind it
// (retrieval practice, spacing, dual coding, chunking, interleaving).
import { Card, Rank, Rng, createShoe } from './cards';
import { CountingSystem, SYSTEM_NAME, cardTag, getCountingSystem, maxTag, signedTag, tagValues } from './counting';
import { localDay } from './progression';
import { localized, tr } from '../i18n/lang';

export type LearningPreference = 'see' | 'hear' | 'do' | 'read' | 'mix';

export type AcademyMode = 'tagTap' | 'colorCount' | 'soundCount' | 'pairCancel' | 'readCount';

export interface ModeInfo {
  id: AcademyMode;
  title: string;
  /** Who it suits, in plain words. */
  forWho: string;
  /** What you do (names the current system's tags). */
  how: string;
  /** The learning technique behind it. */
  why: string;
  preference: Exclude<LearningPreference, 'mix'>;
}

/** What the mode descriptions need to know about the system. */
interface SysText {
  name: string;
  /** "−1, 0 or +1" */
  values: string;
  /** Uses ±2 tags (Omega II). */
  level2: boolean;
}

type ModeText = Pick<ModeInfo, 'title' | 'forWho' | 'why'> & { how: (s: SysText) => string };

const MODE_TEXT = localized<Record<AcademyMode, ModeText>>({
  en: {
    colorCount: {
      title: 'See it: Color Count',
      forWho: 'For visual learners',
      how: (s) =>
        `Cards glow green (plus), gray (0) or red (minus)${s.level2 ? ', with a double arrow ▲▲/▼▼ and a brighter glow for ±2' : ''} while a meter tracks the ${s.name} count. The hints fade as you level up.`,
      why: 'Pairs words with pictures (dual coding), then removes the support so you rely on memory.',
    },
    soundCount: {
      title: 'Hear it: Sound Count',
      forWho: 'For people who learn by listening',
      how: (s) =>
        `Each card plays a sound: a high pip for plus, a click for 0, a low pip for minus${s.level2 ? ' (two pips for ±2)' : ''}. Early levels also say the ${s.name} count out loud.`,
      why: 'Links each tag to a sound, and trains you to count without staring at a screen.',
    },
    tagTap: {
      title: 'Do it: Tag Tap',
      forWho: 'For hands-on learners',
      how: (s) => `A card appears. Tap its ${s.name} tag (${s.values}) before time runs out. The clock gets faster each level.`,
      why: 'Every card is a tiny quiz (retrieval practice), so the tags become automatic.',
    },
    pairCancel: {
      title: 'Chunk it: Pair Cancel',
      forWho: 'For everyone who wants speed',
      how: (s) => `Cards come in pairs, then threes and fours. Call each group’s ${s.name} total in one go: a King and a 5 cancel to 0.`,
      why: 'Grouping cards into chunks is how fast counters work: fewer things to keep in your head.',
    },
    readCount: {
      title: 'Read it: Count Story',
      forWho: 'For readers',
      how: (s) => `A short written scene describes a round at the table. Read it and work out the ${s.name} running count.`,
      why: 'Turns the count into words you process slowly and precisely, a good first step before speed.',
    },
  },
  es: {
    colorCount: {
      title: 'Míralo: Conteo por colores',
      forWho: 'Para quienes aprenden viendo',
      how: (s) =>
        `Las cartas brillan en verde (más), gris (0) o rojo (menos)${s.level2 ? ', con doble flecha ▲▲/▼▼ y un brillo más intenso para ±2' : ''} mientras un medidor lleva el conteo ${s.name}. Las pistas desaparecen al subir de nivel.`,
      why: 'Une palabras con imágenes (codificación dual) y luego quita la ayuda para que uses tu memoria.',
    },
    soundCount: {
      title: 'Escúchalo: Conteo por sonido',
      forWho: 'Para quienes aprenden escuchando',
      how: (s) =>
        `Cada carta suena: un tono agudo para más, un clic para 0, un tono grave para menos${s.level2 ? ' (dos tonos para ±2)' : ''}. En los primeros niveles también se dice el conteo ${s.name} en voz alta.`,
      why: 'Asocia cada valor con un sonido y te entrena para contar sin mirar la pantalla.',
    },
    tagTap: {
      title: 'Hazlo: Toca el valor',
      forWho: 'Para quienes aprenden haciendo',
      how: (s) => `Aparece una carta. Toca su valor ${s.name} (${s.values}) antes de que se acabe el tiempo. El reloj va más rápido en cada nivel.`,
      why: 'Cada carta es un mini examen (práctica de recuperación), así los valores se vuelven automáticos.',
    },
    pairCancel: {
      title: 'Agrúpalo: Parejas que se anulan',
      forWho: 'Para todos los que quieren velocidad',
      how: (s) => `Las cartas salen en parejas, luego de tres y de cuatro. Di el total ${s.name} de cada grupo de una vez: un Rey y un 5 se anulan y dan 0.`,
      why: 'Agrupar cartas es lo que hacen los contadores rápidos: menos cosas que recordar.',
    },
    readCount: {
      title: 'Léelo: Historia de conteo',
      forWho: 'Para lectores',
      how: (s) => `Una escena corta describe una ronda en la mesa. Léela y calcula el conteo continuo ${s.name}.`,
      why: 'Convierte el conteo en palabras que procesas con calma y precisión, un buen primer paso antes de la velocidad.',
    },
  },
});

const MODE_ORDER: [AcademyMode, ModeInfo['preference']][] = [
  ['colorCount', 'see'],
  ['soundCount', 'hear'],
  ['tagTap', 'do'],
  ['pairCancel', 'do'],
  ['readCount', 'read'],
];

/** "−1, 0 or +1" / "−1, 0 o +1": a system's tag values, lowest first. */
export function tagChoiceList(system: CountingSystem = getCountingSystem()): string {
  const v = [...tagValues(system)].reverse().map(signedTag);
  return `${v.slice(0, -1).join(', ')} ${tr('or', 'o')} ${v[v.length - 1]}`;
}

const sysText = (system: CountingSystem): SysText => ({ name: SYSTEM_NAME[system], values: tagChoiceList(system), level2: maxTag(system) >= 2 });

/** Every mode. The text fields follow the current language and counting system. */
export const MODES: ModeInfo[] = MODE_ORDER.map(([id, preference]) => ({
  id,
  get title() {
    return MODE_TEXT[id].title;
  },
  get forWho() {
    return MODE_TEXT[id].forWho;
  },
  get how() {
    return MODE_TEXT[id].how(sysText(getCountingSystem()));
  },
  get why() {
    return MODE_TEXT[id].why;
  },
  preference,
}));

export const PREFERENCE_LABEL: Record<LearningPreference, string> = localized({
  en: {
    see: 'Seeing it',
    hear: 'Hearing it',
    do: 'Doing it',
    read: 'Reading it',
    mix: 'A bit of everything',
  },
  es: {
    see: 'Viendo',
    hear: 'Escuchando',
    do: 'Haciendo',
    read: 'Leyendo',
    mix: 'Un poco de todo',
  },
});

/** Modes ordered so the ones matching your preference come first. */
export function modesFor(pref: LearningPreference): ModeInfo[] {
  if (pref === 'mix') return MODES;
  return [...MODES.filter((m) => m.preference === pref), ...MODES.filter((m) => m.preference !== pref)];
}

export const MAX_LEVEL = 5;
/** Accuracy needed to move up a level. */
export const LEVEL_UP_ACCURACY = 0.9;

export interface ModeProgress {
  level: number;
  /** Rounds played in this mode. */
  played: number;
  bestAccuracy: number;
  /** Spaced review: which box (0–4) and the day it's next due. */
  box: number;
  due: string;
}

export const newProgress = (today: string): ModeProgress => ({ level: 1, played: 0, bestAccuracy: 0, box: 0, due: today });

/** Days until the next review for each box: practice well and reviews spread out. */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 14];

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/**
 * Records a finished round: levels up on 90%+ accuracy, and schedules the next
 * review further out after a good round or back to tomorrow after a weak one.
 */
export function recordRound(p: ModeProgress, accuracy: number, today: string): { progress: ModeProgress; leveledUp: boolean } {
  const good = accuracy >= LEVEL_UP_ACCURACY;
  const leveledUp = good && p.level < MAX_LEVEL;
  const box = good ? Math.min(REVIEW_INTERVALS.length - 1, p.box + 1) : 0;
  return {
    leveledUp,
    progress: {
      level: leveledUp ? p.level + 1 : p.level,
      played: p.played + 1,
      bestAccuracy: Math.max(p.bestAccuracy, accuracy),
      box,
      due: addDays(today, REVIEW_INTERVALS[box]),
    },
  };
}

export const isDue = (p: ModeProgress | undefined, today: string) => !p || p.due <= today;

/**
 * Today's workout: three different modes, mixed rather than repeated
 * (interleaving), favoring the ones due for review (spacing).
 */
export function dailyWorkout(progress: Partial<Record<AcademyMode, ModeProgress>>, today: string, pref: LearningPreference): AcademyMode[] {
  const ordered = modesFor(pref).map((m) => m.id);
  const due = ordered.filter((id) => isDue(progress[id], today));
  const rest = ordered
    .filter((id) => !due.includes(id))
    .sort((a, b) => (progress[a]!.due < progress[b]!.due ? -1 : 1));
  return [...due, ...rest].slice(0, 3);
}

// ---------- Round content ----------

/** A card's tag in the given system (default: the player's chosen one). */
export const tagOf = (c: Card, system: CountingSystem = getCountingSystem()) => cardTag(c.rank, system);

/** How many cards a round uses at a level. */
export function roundLength(mode: AcademyMode, level: number): number {
  if (mode === 'pairCancel') return 8 + level * 2; // groups, not cards
  if (mode === 'readCount') return 1; // one story per round
  return 10 + level * 5;
}

/** Tag Tap: seconds allowed per card, shrinking each level. */
export const tapSeconds = (level: number) => Math.max(0.7, 2.2 - level * 0.3);

/** Color/Sound Count: milliseconds each card is shown. */
export const flashMs = (level: number) => Math.max(450, 1500 - level * 200);

/** Color Count hint fading: what support each level still gives. */
export function visualHints(level: number): { glow: boolean; badge: boolean; meter: boolean } {
  return { glow: level <= 3, badge: level <= 1, meter: level <= 2 };
}

/** Sound Count: say the running count every N cards at low levels; never at high ones. */
export function spokenEvery(level: number): number | null {
  return level <= 1 ? 1 : level === 2 ? 5 : null;
}

export function cardRun(n: number, rng: Rng = Math.random): Card[] {
  return createShoe(Math.ceil(n / 52), rng).slice(0, n);
}

/** Pair Cancel: group sizes grow with level (pairs, then threes, then fours). */
export function groupSize(level: number): number {
  return level <= 2 ? 2 : level <= 4 ? 3 : 4;
}

export function cardGroups(level: number, rng: Rng = Math.random): Card[][] {
  const size = groupSize(level);
  const count = roundLength('pairCancel', level);
  const cards = cardRun(size * count, rng);
  return Array.from({ length: count }, (_, i) => cards.slice(i * size, i * size + size));
}

export const groupValue = (group: Card[], system: CountingSystem = getCountingSystem()) =>
  group.reduce((sum, c) => sum + tagOf(c, system), 0);

/**
 * The answer buttons for a group: every total a group of this size can have
 * (Hi-Lo pairs: −2…+2; Omega II pairs, with ±2 tags: −4…+4).
 */
export function groupChoices(size: number, system: CountingSystem = getCountingSystem()): number[] {
  const m = size * maxTag(system);
  return Array.from({ length: m * 2 + 1 }, (_, i) => i - m);
}

// ---------- Count Story ----------

const STORY = localized({
  en: {
    rank: {
      A: 'an Ace',
      '2': 'a 2',
      '3': 'a 3',
      '4': 'a 4',
      '5': 'a 5',
      '6': 'a 6',
      '7': 'a 7',
      '8': 'an 8',
      '9': 'a 9',
      '10': 'a 10',
      J: 'a Jack',
      Q: 'a Queen',
      K: 'a King',
    } as Record<Rank, string>,
    names: ['Maria', 'Big Tony', 'Priya', 'Hank', 'Mei', 'Oscar'],
    dealt: (n: string, a: string, b: string) => `${n} is dealt ${a} and ${b}.`,
    shows: (c: string) => `The dealer shows ${c}.`,
    stands: (n: string) => `${n} stands.`,
    hits: (n: string, cards: string[]) => `${n} hits and gets ${cards.join(', then ')}.`,
    turns: (hole: string, draws: string[]) => `The dealer turns over ${hole}${draws.length ? ` and draws ${draws.join(' and ')}` : ''}.`,
  },
  es: {
    rank: {
      A: 'un As',
      '2': 'un 2',
      '3': 'un 3',
      '4': 'un 4',
      '5': 'un 5',
      '6': 'un 6',
      '7': 'un 7',
      '8': 'un 8',
      '9': 'un 9',
      '10': 'un 10',
      J: 'una Jota',
      Q: 'una Reina',
      K: 'un Rey',
    },
    names: ['María', 'Tony el Grande', 'Priya', 'Hank', 'Mei', 'Óscar'],
    dealt: (n: string, a: string, b: string) => `${n} recibe ${a} y ${b}.`,
    shows: (c: string) => `El crupier muestra ${c}.`,
    stands: (n: string) => `${n} se planta.`,
    hits: (n: string, cards: string[]) => `${n} pide y recibe ${cards.join(', luego ')}.`,
    turns: (hole: string, draws: string[]) => `El crupier voltea ${hole}${draws.length ? ` y saca ${draws.join(' y ')}` : ''}.`,
  },
});

export interface Story {
  lines: string[];
  cards: Card[];
  answer: number;
}

/**
 * A short written round at the table. Longer stories (more players, more hits)
 * at higher levels.
 */
export function countStory(level: number, rng: Rng = Math.random, system: CountingSystem = getCountingSystem()): Story {
  const players = Math.min(4, 1 + Math.ceil(level / 2));
  const deck = cardRun(40, rng);
  let i = 0;
  const next = () => deck[i++];
  const lines: string[] = [];
  const word = (c: Card) => STORY.rank[c.rank];
  const names = STORY.names.slice(0, players);
  const firsts = names.map(() => [next(), next()] as Card[]);
  const up = next();
  names.forEach((n, k) => lines.push(STORY.dealt(n, word(firsts[k][0]), word(firsts[k][1]))));
  lines.push(STORY.shows(word(up)));
  names.forEach((n) => {
    const hits = Math.floor(rng() * (level >= 3 ? 3 : 2));
    if (hits === 0) lines.push(STORY.stands(n));
    else {
      const drawn = Array.from({ length: hits }, next);
      lines.push(STORY.hits(n, drawn.map(word)));
    }
  });
  const hole = next();
  const dealerHits = level >= 2 ? Array.from({ length: Math.floor(rng() * 2) + 1 }, next) : [];
  lines.push(STORY.turns(word(hole), dealerHits.map(word)));
  const cards = deck.slice(0, i);
  return { lines, cards, answer: cards.reduce((s, c) => s + tagOf(c, system), 0) };
}

/** XP for an academy round: rewards accuracy, scaled lightly by level. */
export function academyXp(correct: number, level: number): number {
  return Math.round(correct * (1 + level * 0.25));
}
