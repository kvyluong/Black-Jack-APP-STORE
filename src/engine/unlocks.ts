// What a player sees as they progress. New players start with just the lessons
// and the casino floor; features appear when the lessons that explain them are
// done (or after enough play), so nothing shows up before it makes sense.
// "I already know how to play" (settings.experienced) opens everything.

import { tr } from '../i18n/lang';

export type Feature =
  | 'lessons'
  | 'tables'
  | 'strategyDrill'
  | 'chart'
  | 'leaks'
  | 'ready'
  | 'progress'
  | 'academy'
  | 'countDrill'
  | 'trueCountDrill'
  | 'decksDrill'
  | 'deviations'
  | 'exam'
  | 'simulator'
  | 'tableCount';

/** What unlocks a feature: a finished lesson, or enough hands played (whichever comes first). */
interface Rule {
  lesson?: string;
  hands?: number;
}

/**
 * Lesson ids from src/content/lessons.ts. 'tableCount' is the count bar, bet
 * suggestion and level bar at the table (revealed with the counting lessons).
 */
const RULES: Record<Feature, Rule | null> = {
  lessons: null,
  tables: null,
  strategyDrill: { lesson: 'actions', hands: 20 },
  chart: { lesson: 'actions', hands: 20 },
  leaks: { lesson: 'actions', hands: 30 },
  ready: { lesson: 'basic-strategy', hands: 60 },
  progress: { lesson: 'basic-strategy', hands: 60 },
  academy: { lesson: 'why-counting' },
  countDrill: { lesson: 'why-counting' },
  tableCount: { lesson: 'why-counting' },
  trueCountDrill: { lesson: 'true-count' },
  decksDrill: { lesson: 'true-count' },
  deviations: { lesson: 'deviations' },
  exam: { lesson: 'deviations' },
  simulator: { lesson: 'betting' },
};

export const FEATURES = Object.keys(RULES) as Feature[];

export interface UnlockInput {
  lessonsCompleted: string[];
  handsPlayed: number;
  experienced?: boolean;
}

export function isUnlocked(f: Feature, s: UnlockInput): boolean {
  const rule = RULES[f];
  if (!rule || s.experienced) return true;
  return (!!rule.lesson && s.lessonsCompleted.includes(rule.lesson)) || (rule.hands !== undefined && s.handsPlayed >= rule.hands);
}

export const unlockedFeatures = (s: UnlockInput) => FEATURES.filter((f) => isUnlocked(f, s));

/** Features you've unlocked but not opened yet (shown with a "New" badge). */
export function newFeatures(s: UnlockInput, seen: string[]): Feature[] {
  return unlockedFeatures(s).filter((f) => RULES[f] !== null && f !== 'tableCount' && !seen.includes(f));
}

/** A short "Unlocks after lesson 5" style hint for a locked feature. */
export function unlockHint(f: Feature, lessonNumber: (id: string) => number): string {
  const rule = RULES[f];
  if (!rule) return '';
  const n = rule.lesson ? lessonNumber(rule.lesson) : 0;
  if (rule.lesson && rule.hands)
    return tr(`Unlocks after lesson ${n} or ${rule.hands} hands`, `Se desbloquea tras la lección ${n} o ${rule.hands} manos`);
  return tr(`Unlocks after lesson ${n}`, `Se desbloquea tras la lección ${n}`);
}
