// Road to the Casino: the casino-ready score, daily goals with a streak, and
// the day-by-day history behind the progress charts. Pure logic, no React.
import { LESSONS } from '../content/lessons';
import { localized, tr } from '../i18n/lang';
import { LeakStats, weakestDrillable } from './leaks';
import { TABLES, isUnlocked } from './progression';
import { CountRecords, DeckEstimateRecords, DeviationProgress, ExamResult, Tally } from './records';
import { DEVIATIONS, SURRENDER_DEVIATIONS } from './strategy';

/** Today's goals: progress is measured from a snapshot of your stats taken at the start of the day. */
export interface GoalsState {
  /** Local day (YYYY-MM-DD) the snapshot belongs to. */
  day: string | null;
  /** Stats counters at the start of `day`. */
  start: Record<string, number> | null;
  /** Goal ids already claimed today. */
  claimed: string[];
  /** Days in a row with all of the day's goals done. */
  streak: number;
  lastCompleteDay: string | null;
  /** The goals picked for `day` (fixed at the snapshot so they don't change mid-day). */
  today?: string[];
}

export const emptyGoals = (): GoalsState => ({ day: null, start: null, claimed: [], streak: 0, lastCompleteDay: null });

/** One day's totals, for the progress charts. */
export interface HistoryPoint {
  day: string;
  /** Counters at the end of the day. */
  values: Record<string, number>;
  /** Counters at the start of the day (so the day's change is exact even after gaps). */
  start?: Record<string, number>;
}

/** The parts of the saved Stats this module reads (Stats in state/settings satisfies it). */
export interface ProgressStats {
  handsPlayed: number;
  decisions: number;
  correctDecisions: number;
  lessonsCompleted: string[];
  peakChips: number;
  leaks: LeakStats;
  academy: { lastWorkoutDay?: string; pref?: string };
  countRecords: CountRecords;
  trueCountDrill: Tally;
  deviations: DeviationProgress;
  exams: ExamResult[];
  deckEstimates: DeckEstimateRecords;
  goals: GoalsState;
  history: HistoryPoint[];
}

// ---------- Days ----------

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A local day (YYYY-MM-DD) moved by n days. Uses calendar math, so DST changes don't matter. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return fmt(new Date(y, m - 1, d + n));
}

export const previousDay = (day: string) => addDays(day, -1);

/** The last n days ending today, oldest first. */
export const lastDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));

// ---------- Counters ----------

export type CounterId =
  | 'hands'
  | 'decisions'
  | 'correct'
  | 'lessons'
  | 'devReviews'
  | 'perfectDecks'
  | 'trueCount'
  | 'deckEstimates'
  | 'workout'
  | 'bestDeckMs';

/** The stats counters goals and charts are measured from. bestDeckMs is 0 when there's no record yet. */
export function counters(s: ProgressStats, today: string): Record<CounterId, number> {
  return {
    hands: s.handsPlayed,
    decisions: s.decisions,
    correct: s.correctDecisions,
    lessons: s.lessonsCompleted.length,
    devReviews: Object.values(s.deviations?.cards ?? {}).reduce((sum, c) => sum + c.total, 0),
    perfectDecks: s.countRecords?.perfectDecks ?? 0,
    trueCount: s.trueCountDrill?.total ?? 0,
    deckEstimates: s.deckEstimates?.total ?? 0,
    workout: s.academy?.lastWorkoutDay === today ? 1 : 0,
    bestDeckMs: s.countRecords?.bestDeckMs ?? 0,
  };
}

// ---------- Daily goals ----------

/** The first four lessons: rules, soft vs hard, your options, basic strategy. */
const BASICS = ['rules', 'soft-hard', 'actions', 'basic-strategy'];
const has = (s: ProgressStats, ids: string[]) => ids.every((id) => s.lessonsCompleted.includes(id));
const basicsDone = (s: ProgressStats) => has(s, BASICS);
/** A counting goal is offered once you've learned the basics plus its lesson, or already use its drill. */
const counting = (lessons: string[], used: (s: ProgressStats) => boolean) => (s: ProgressStats) =>
  used(s) || (basicsDone(s) && has(s, lessons));

export interface GoalDef {
  id: string;
  counter: CounterId;
  target: number;
  /** Reward in minimum bets at your best unlocked table. */
  bets: number;
  xp: number;
  route: string;
  eligible: (s: ProgressStats) => boolean;
  /** Measured as today's value, not the change since the snapshot (e.g. "finished today's workout"). */
  absolute?: boolean;
}

export const GOAL_POOL: GoalDef[] = [
  { id: 'hands', counter: 'hands', target: 20, bets: 3, xp: 40, route: '/tables', eligible: () => true },
  { id: 'correct', counter: 'correct', target: 15, bets: 3, xp: 30, route: '/drills/strategy', eligible: () => true },
  {
    id: 'lesson',
    counter: 'lessons',
    target: 1,
    bets: 4,
    xp: 40,
    route: '/learn',
    eligible: (s) => s.lessonsCompleted.length < LESSONS.length,
  },
  {
    id: 'workout',
    counter: 'workout',
    target: 1,
    bets: 4,
    xp: 40,
    route: '/academy',
    absolute: true,
    eligible: (s) => basicsDone(s) || !!s.academy?.pref,
  },
  {
    id: 'perfectDeck',
    counter: 'perfectDecks',
    target: 1,
    bets: 5,
    xp: 50,
    route: '/drills/count',
    eligible: counting(['hi-lo', 'running-count'], (s) => (s.countRecords?.perfectDecks ?? 0) > 0),
  },
  {
    id: 'trueCount',
    counter: 'trueCount',
    target: 10,
    bets: 3,
    xp: 30,
    route: '/drills/true-count',
    eligible: counting(['true-count'], (s) => (s.trueCountDrill?.total ?? 0) > 0),
  },
  {
    id: 'deckEstimates',
    counter: 'deckEstimates',
    target: 5,
    bets: 2,
    xp: 25,
    route: '/drills/decks',
    eligible: counting(['true-count'], (s) => (s.deckEstimates?.total ?? 0) > 0),
  },
  {
    id: 'devReviews',
    counter: 'devReviews',
    target: 10,
    bets: 4,
    xp: 40,
    route: '/drills/deviations',
    eligible: counting(['deviations'], (s) => Object.keys(s.deviations?.cards ?? {}).length > 0),
  },
];

export const GOALS_PER_DAY = 3;

const GOAL_TEXT = localized({
  en: {
    hands: (n: number) => `Play ${n} hands`,
    correct: (n: number) => `Make ${n} correct decisions`,
    lesson: () => 'Finish a lesson',
    workout: () => 'Finish today’s Academy workout',
    perfectDeck: () => 'Count a full deck exactly',
    trueCount: (n: number) => `Answer ${n} true count questions`,
    deckEstimates: (n: number) => `Make ${n} deck estimates`,
    devReviews: (n: number) => `Review ${n} count-play cards`,
  } as Record<string, (n: number) => string>,
  es: {
    hands: (n: number) => `Juega ${n} manos`,
    correct: (n: number) => `Toma ${n} decisiones correctas`,
    lesson: () => 'Termina una lección',
    workout: () => 'Termina el entrenamiento de hoy en la Academia',
    perfectDeck: () => 'Cuenta una baraja completa sin errores',
    trueCount: (n: number) => `Responde ${n} preguntas de conteo real`,
    deckEstimates: (n: number) => `Haz ${n} estimaciones de barajas`,
    devReviews: (n: number) => `Repasa ${n} tarjetas de jugadas por conteo`,
  },
});

export const goalTitle = (g: GoalDef) => GOAL_TEXT[g.id](g.target);
export const getGoal = (id: string) => GOAL_POOL.find((g) => g.id === id);

/** FNV-1a hash of a string, used to seed the day's goal pick. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Mulberry32: a tiny deterministic PRNG. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The day's goals: picked deterministically from the goals that suit your progress, seeded by the date. */
export function pickGoals(s: ProgressStats, day: string): GoalDef[] {
  const rng = seeded(hash(day));
  const pool = GOAL_POOL.filter((g) => g.eligible(s));
  // Fisher-Yates shuffle, then keep the pool order for display.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = new Set(pool.slice(0, GOALS_PER_DAY).map((g) => g.id));
  return GOAL_POOL.filter((g) => chosen.has(g.id));
}

/** Today's goals: the ones fixed at the snapshot, or a fresh pick before the snapshot exists. */
export function todaysGoals(s: ProgressStats, today: string): GoalDef[] {
  if (s.goals.day === today && s.goals.today?.length) {
    return s.goals.today.map(getGoal).filter((g): g is GoalDef => !!g);
  }
  return pickGoals(s, today);
}

/** Progress toward a goal today, 0..target. */
export function goalProgress(g: GoalDef, s: ProgressStats, today: string): number {
  const now = counters(s, today)[g.counter];
  const start = s.goals.day === today ? s.goals.start?.[g.counter] : undefined;
  const value = g.absolute ? now : now - (start ?? now);
  return Math.max(0, Math.min(g.target, value));
}

/** Chips and XP for claiming a goal: a few minimum bets at your best unlocked table. */
export function goalReward(g: GoalDef, peakChips: number): { chips: number; xp: number } {
  const best = [...TABLES].reverse().find((t) => isUnlocked(t, peakChips)) ?? TABLES[0];
  return { chips: best.minBet * g.bets, xp: g.xp };
}

/** Claims one goal; finishing all of the day's goals extends the streak (or restarts it after a missed day). */
export function claimGoal(goals: GoalsState, id: string, today: string, dayGoalIds: string[]): GoalsState {
  if (goals.claimed.includes(id)) return goals;
  const claimed = [...goals.claimed, id];
  const next = { ...goals, claimed };
  if (goals.lastCompleteDay !== today && dayGoalIds.every((g) => claimed.includes(g))) {
    next.streak = goals.lastCompleteDay === previousDay(today) ? goals.streak + 1 : 1;
    next.lastCompleteDay = today;
  }
  return next;
}

/** The streak as of today: it survives until the end of the day after the last complete day. */
export function currentStreak(goals: GoalsState, today: string): number {
  const last = goals.lastCompleteDay;
  return last === today || (last && last === previousDay(today)) ? goals.streak : 0;
}

/** Days of history kept (a little over a year). */
export const HISTORY_CAP = 400;

/**
 * The start-of-day update: snapshots today's counters and goals, and files the last
 * day you used the app into the history. Returns null when today is already set up.
 */
export function rolloverDay(s: ProgressStats, today: string): { goals: GoalsState; history: HistoryPoint[] } | null {
  const goals = s.goals ?? emptyGoals();
  // Only roll forward: a clock or time zone moved back a day isn't a new day.
  if (goals.day && goals.day >= today) return null;
  let history = s.history ?? [];
  if (goals.day && goals.start) {
    const point: HistoryPoint = { day: goals.day, start: goals.start, values: counters(s, goals.day) };
    history = [...history.filter((p) => p.day !== goals.day), point].slice(-HISTORY_CAP);
  }
  return {
    history,
    goals: { ...goals, day: today, start: counters(s, today), claimed: [], today: pickGoals(s, today).map((g) => g.id) },
  };
}

// ---------- Progress charts ----------

/** History plus today so far, oldest first. */
export function historyWithToday(s: ProgressStats, today: string): HistoryPoint[] {
  const past = (s.history ?? []).filter((p) => p.day < today);
  const start = s.goals.day === today ? (s.goals.start ?? undefined) : undefined;
  return [...past, { day: today, start, values: counters(s, today) }];
}

/** One day's change in a counter. */
function delta(points: HistoryPoint[], i: number, key: CounterId): number {
  const p = points[i];
  const before = p.start?.[key] ?? points[i - 1]?.values[key];
  // Without a start or an earlier day there's no baseline; count the day as 0 rather than guess.
  return before === undefined ? 0 : Math.max(0, (p.values[key] ?? 0) - before);
}

export interface DayValue {
  day: string;
  /** Null for a day with nothing to show (no decisions, or the app wasn't opened). */
  value: number | null;
  right?: number;
  total?: number;
}

/** Strategy accuracy (0–100) for each of the last n days, from the day's decisions. */
export function accuracyByDay(points: HistoryPoint[], today: string, n = 30): DayValue[] {
  const byDay = new Map(points.map((p, i) => [p.day, { right: delta(points, i, 'correct'), total: delta(points, i, 'decisions') }]));
  return lastDays(today, n).map((day) => {
    const d = byDay.get(day);
    return d && d.total > 0
      ? { day, value: (100 * Math.min(d.right, d.total)) / d.total, right: Math.min(d.right, d.total), total: d.total }
      : { day, value: null };
  });
}

/** Hands played on each of the last n days (0 on days you didn't play). */
export function handsByDay(points: HistoryPoint[], today: string, n = 14): DayValue[] {
  const byDay = new Map(points.map((p, i) => [p.day, delta(points, i, 'hands')]));
  return lastDays(today, n).map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

/** Each day your best full-deck time improved, in ms. */
export function bestDeckTimeline(points: HistoryPoint[]): { day: string; ms: number }[] {
  const out: { day: string; ms: number }[] = [];
  for (const p of points) {
    const ms = p.values.bestDeckMs ?? 0;
    if (ms > 0 && (out.length === 0 || ms < out[out.length - 1].ms)) out.push({ day: p.day, ms });
  }
  return out;
}

/** "Rose from 82% to 95% over 14 days" style summary, for screen readers. */
export function trendSummary(first: number, last: number, days: number, unit: (v: number) => string, lowerIsBetter = false): string {
  const better = lowerIsBetter ? last < first : last > first;
  const word =
    last === first ? tr('stayed at', 'se mantuvo en') : better ? tr('improved from', 'mejoró de') : tr('went from', 'pasó de');
  if (last === first) return `${word} ${unit(last)}`;
  return tr(`${word} ${unit(first)} to ${unit(last)} over ${days} days`, `${word} ${unit(first)} a ${unit(last)} en ${days} días`);
}

/** Days between two local days (b − a). */
export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

/** "Oct 3" / "3 oct". */
export function shortDay(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return tr(`${MONTHS.en[m - 1]} ${d}`, `${d} ${MONTHS.es[m - 1]}`);
}

/** "27.4 s". */
export const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

// ---------- Casino-ready score ----------

export type BenchmarkId = 'lessons' | 'strategy' | 'countDeck' | 'trueCount' | 'decks' | 'deviations' | 'exam';

/** Basic strategy: 99%+ over your last 200 decisions. */
export const STRATEGY_WINDOW = 200;
export const STRATEGY_TARGET = 0.99;
/** Full 52-card deck counted exactly in 30 seconds or less. */
export const DECK_TARGET_MS = 30000;
export const TRUE_COUNT_TARGET = 0.9;
export const TRUE_COUNT_MIN = 20;
/** Deck estimation: average error ≤ half a deck over the last 10 answers. */
export const DECK_EST_WINDOW = 10;
export const DECK_EST_TARGET = 0.5;
/** A count-play card counts as learned once it reaches this review box. */
export const LEARNED_BOX = 3;
/** Every play in the count-play deck: the index plays, the Fab 4 surrenders, and insurance. */
export const COUNT_PLAY_IDS: string[] = [...DEVIATIONS, ...SURRENDER_DEVIATIONS].map((d) => d.id).concat('insurance');

/**
 * Weights for the overall score (sum 100). Basic strategy and the casino-conditions
 * test count most: they're what actually protects your money at a real table.
 */
export const READY_WEIGHTS: Record<BenchmarkId, number> = {
  strategy: 25,
  exam: 20,
  countDeck: 15,
  deviations: 15,
  lessons: 10,
  trueCount: 10,
  decks: 5,
};

/** The order to work on them: learn, play right, count, convert, read the tray, count plays, then the test. */
export const READY_ORDER: BenchmarkId[] = ['lessons', 'strategy', 'countDeck', 'trueCount', 'decks', 'deviations', 'exam'];

export interface Benchmark {
  id: BenchmarkId;
  /** 0..1 */
  progress: number;
  done: boolean;
  started: boolean;
  /** Where you stand, e.g. "97% over your last 120 decisions". */
  detail: string;
  /** Screen to practice it. */
  route: string;
}

export const BENCHMARK_TEXT: Record<BenchmarkId, { title: string; goal: string; why: string }> = localized({
  en: {
    lessons: { title: 'Lessons', goal: 'Finish every lesson', why: 'The rules, the strategy and the count, explained once properly.' },
    strategy: {
      title: 'Basic strategy',
      goal: '99%+ correct over your last 200 decisions',
      why: 'Every mistake hands the house extra edge; counting can’t make up for sloppy play.',
    },
    countDeck: {
      title: 'Count a full deck',
      goal: 'An exact count of 52 cards in 30 seconds or less',
      why: 'Real dealers are fast. If you can’t keep up, the count is worthless.',
    },
    trueCount: {
      title: 'True count conversion',
      goal: '90%+ correct, with at least 20 answers',
      why: 'Your bets and count plays depend on the true count, not the running count.',
    },
    decks: {
      title: 'Deck estimation',
      goal: 'Average error of half a deck or less over 10 answers',
      why: 'A bad read of the discard tray throws off every true count.',
    },
    deviations: {
      title: 'Count plays',
      goal: 'Learn every card in the count-play deck',
      why: 'Index plays like 16 vs 10 and insurance add most of a counter’s extra edge after betting.',
    },
    exam: {
      title: 'Casino conditions',
      goal: 'Pass the test: a full shoe, no hints, no count on screen',
      why: 'Putting it all together, under pressure, is the real test.',
    },
  },
  es: {
    lessons: { title: 'Lecciones', goal: 'Termina todas las lecciones', why: 'Las reglas, la estrategia y el conteo, bien explicados una vez.' },
    strategy: {
      title: 'Estrategia básica',
      goal: '99% o más de aciertos en tus últimas 200 decisiones',
      why: 'Cada error le da más ventaja a la casa; contar no compensa jugar mal.',
    },
    countDeck: {
      title: 'Contar una baraja completa',
      goal: 'Un conteo exacto de 52 cartas en 30 segundos o menos',
      why: 'Los crupieres reales son rápidos. Si no te mantienes al día, el conteo no sirve.',
    },
    trueCount: {
      title: 'Conversión al conteo real',
      goal: '90% o más de aciertos, con al menos 20 respuestas',
      why: 'Tus apuestas y jugadas por conteo dependen del conteo real, no del continuo.',
    },
    decks: {
      title: 'Estimar barajas',
      goal: 'Error promedio de media baraja o menos en 10 respuestas',
      why: 'Leer mal la bandeja de descartes arruina cada conteo real.',
    },
    deviations: {
      title: 'Jugadas por conteo',
      goal: 'Aprende todas las tarjetas de jugadas por conteo',
      why: 'Jugadas como 16 contra 10 y el seguro dan casi toda la ventaja extra después de las apuestas.',
    },
    exam: {
      title: 'Condiciones de casino',
      goal: 'Aprueba la prueba: un zapato completo, sin pistas ni conteo en pantalla',
      why: 'Juntarlo todo, bajo presión, es la verdadera prueba.',
    },
  },
});

const DETAIL = localized({
  en: {
    none: 'Not started yet',
    lessons: (d: number, t: number) => `${d} of ${t} lessons done`,
    strategy: (p: number, n: number) => `${p}% over your last ${n} decisions${n < STRATEGY_WINDOW ? ` (${STRATEGY_WINDOW} needed)` : ''}`,
    countDeck: (time: string) => `Best exact deck: ${time}`,
    countDeckNone: 'No exact full-deck count yet',
    trueCount: (p: number, n: number) => `${p}% over ${n} answers${n < TRUE_COUNT_MIN ? ` (${TRUE_COUNT_MIN} needed)` : ''}`,
    decks: (err: string, n: number) => `Average error ${err} decks over your last ${n}${n < DECK_EST_WINDOW ? ` (${DECK_EST_WINDOW} needed)` : ''}`,
    deviations: (l: number, t: number) => `${l} of ${t} cards learned`,
    exam: (g: number, passed: boolean) => `Best grade ${g}${passed ? ' · passed' : ' · not passed yet'}`,
  },
  es: {
    none: 'Aún no empiezas',
    lessons: (d: number, t: number) => `${d} de ${t} lecciones terminadas`,
    strategy: (p: number, n: number) => `${p}% en tus últimas ${n} decisiones${n < STRATEGY_WINDOW ? ` (se necesitan ${STRATEGY_WINDOW})` : ''}`,
    countDeck: (time: string) => `Mejor baraja exacta: ${time}`,
    countDeckNone: 'Aún no cuentas una baraja completa sin errores',
    trueCount: (p: number, n: number) => `${p}% en ${n} respuestas${n < TRUE_COUNT_MIN ? ` (se necesitan ${TRUE_COUNT_MIN})` : ''}`,
    decks: (err: string, n: number) =>
      `Error promedio de ${err} barajas en tus últimas ${n}${n < DECK_EST_WINDOW ? ` (se necesitan ${DECK_EST_WINDOW})` : ''}`,
    deviations: (l: number, t: number) => `${l} de ${t} tarjetas aprendidas`,
    exam: (g: number, passed: boolean) => `Mejor calificación ${g}${passed ? ' · aprobada' : ' · aún sin aprobar'}`,
  },
});

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => Math.floor(x * 1000) / 10; // 98.96 → 98.9, so "99%" is never rounded up

/** Where you stand on each casino-ready benchmark, in READY_ORDER. */
export function benchmarks(s: ProgressStats): Benchmark[] {
  const list: Benchmark[] = [];

  // Lessons.
  const lessonsDone = LESSONS.filter((l) => s.lessonsCompleted.includes(l.id)).length;
  list.push({
    id: 'lessons',
    progress: lessonsDone / LESSONS.length,
    done: lessonsDone === LESSONS.length,
    started: lessonsDone > 0,
    detail: DETAIL.lessons(lessonsDone, LESSONS.length),
    route: '/learn',
  });

  // Basic strategy: sample size × accuracy, where 75% counts as 0 and 99% as full.
  const recent = (s.leaks?.recent ?? []).slice(-STRATEGY_WINDOW);
  const right = recent.filter(Boolean).length;
  const acc = recent.length ? right / recent.length : 0;
  const weakest = s.leaks ? weakestDrillable(s.leaks) : undefined;
  list.push({
    id: 'strategy',
    progress: clamp01(recent.length / STRATEGY_WINDOW) * clamp01((acc - 0.75) / (STRATEGY_TARGET - 0.75)),
    done: recent.length >= STRATEGY_WINDOW && acc >= STRATEGY_TARGET,
    started: recent.length > 0,
    detail: recent.length ? DETAIL.strategy(pct(acc), recent.length) : DETAIL.none,
    route: weakest ? `/drills/strategy?focus=${weakest}` : '/drills/strategy',
  });

  // Full deck: at 60 s you're halfway there.
  const best = s.countRecords?.bestDeckMs ?? null;
  list.push({
    id: 'countDeck',
    progress: best ? clamp01(DECK_TARGET_MS / best) : 0,
    done: best !== null && best <= DECK_TARGET_MS,
    started: best !== null || (s.countRecords?.perfectDecks ?? 0) > 0,
    detail: best ? DETAIL.countDeck(formatSeconds(best)) : DETAIL.countDeckNone,
    route: '/drills/count',
  });

  // True count conversion.
  const tc = s.trueCountDrill ?? { right: 0, total: 0 };
  const tcAcc = tc.total ? tc.right / tc.total : 0;
  list.push({
    id: 'trueCount',
    progress: clamp01(tc.total / TRUE_COUNT_MIN) * clamp01(tcAcc / TRUE_COUNT_TARGET),
    done: tc.total >= TRUE_COUNT_MIN && tcAcc >= TRUE_COUNT_TARGET,
    started: tc.total > 0,
    detail: tc.total ? DETAIL.trueCount(pct(tcAcc), tc.total) : DETAIL.none,
    route: '/drills/true-count',
  });

  // Deck estimation.
  const errs = (s.deckEstimates?.recentErrors ?? []).slice(-DECK_EST_WINDOW);
  const avg = errs.length ? errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length : 0;
  list.push({
    id: 'decks',
    progress: errs.length ? clamp01(errs.length / DECK_EST_WINDOW) * (avg <= DECK_EST_TARGET ? 1 : DECK_EST_TARGET / avg) : 0,
    done: errs.length >= DECK_EST_WINDOW && avg <= DECK_EST_TARGET,
    started: errs.length > 0 || (s.deckEstimates?.total ?? 0) > 0,
    detail: errs.length ? DETAIL.decks(avg.toFixed(2), errs.length) : DETAIL.none,
    route: '/drills/decks',
  });

  // Count plays.
  const cards = s.deviations?.cards ?? {};
  const learned = COUNT_PLAY_IDS.filter((id) => (cards[id]?.box ?? 0) >= LEARNED_BOX).length;
  list.push({
    id: 'deviations',
    progress: learned / COUNT_PLAY_IDS.length,
    done: learned === COUNT_PLAY_IDS.length,
    started: COUNT_PLAY_IDS.some((id) => cards[id]),
    detail: COUNT_PLAY_IDS.some((id) => cards[id]) ? DETAIL.deviations(learned, COUNT_PLAY_IDS.length) : DETAIL.none,
    route: '/drills/deviations',
  });

  // Casino conditions: a pass is full marks; otherwise the best grade, capped below full.
  const exams = s.exams ?? [];
  const passed = exams.some((e) => e.passed);
  const bestGrade = exams.length ? Math.max(...exams.map((e) => e.grade)) : 0;
  list.push({
    id: 'exam',
    progress: passed ? 1 : Math.min(0.9, bestGrade / 100),
    done: passed,
    started: exams.length > 0,
    detail: exams.length ? DETAIL.exam(Math.round(bestGrade), passed) : DETAIL.none,
    route: '/exam',
  });

  return READY_ORDER.map((id) => list.find((b) => b.id === id)!);
}

/** Overall score 0–100: the weighted average of benchmark progress. 100 only when every benchmark is done. */
export function readyScore(list: Benchmark[]): number {
  const total = list.reduce((sum, b) => sum + READY_WEIGHTS[b.id] * b.progress, 0);
  const score = Math.round(total);
  return list.every((b) => b.done) ? 100 : Math.min(99, score);
}

/** The next benchmark to work on, in READY_ORDER; undefined when you're ready. */
export const nextStep = (list: Benchmark[]) => list.find((b) => !b.done);

/** "Ready for the casino", or what to do next. */
export function readyHeadline(list: Benchmark[]): string {
  const next = nextStep(list);
  if (!next) return tr('Ready for the casino', 'Listo para el casino');
  return tr(`Next step: ${BENCHMARK_TEXT[next.id].title}`, `Siguiente paso: ${BENCHMARK_TEXT[next.id].title}`);
}

/** "Basic strategy 25%, Casino conditions 20%, …" for explaining the score. */
export function weightsText(): string {
  return (Object.entries(READY_WEIGHTS) as [BenchmarkId, number][])
    .map(([id, w]) => `${BENCHMARK_TEXT[id].title} ${w}%`)
    .join(', ');
}
