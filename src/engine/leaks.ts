// "Your leaks": which kinds of decisions a player gets wrong, and the exact
// spots they miss most, so practice can target them.
import { Card, RANKS, Rank, Rng, SUITS, pointValue } from './cards';
import { StrategyQuestion } from './drills';
import { handValue, isPair } from './hand';
import { getLang, localized, tr } from '../i18n/lang';
import { ACTION_LABEL, Action, upValue } from './strategy';

export type LeakCategory = 'hardLow' | 'stiff' | 'hardHigh' | 'soft' | 'pair' | 'insurance';

export const CATEGORY_INFO: Record<LeakCategory, { title: string; example: string }> = localized({
  en: {
    hardLow: { title: 'Hard 11 or less', example: 'e.g. 9, 10 or 11: when to double' },
    stiff: { title: 'Stiff hands (hard 12–16)', example: 'e.g. 16 vs 10: hit, stand or surrender' },
    hardHigh: { title: 'Hard 17 and up', example: 'e.g. 17 vs Ace' },
    soft: { title: 'Soft hands', example: 'e.g. A-7: stand, hit or double' },
    pair: { title: 'Pairs', example: 'e.g. 9-9 vs 7: split or stand' },
    insurance: { title: 'Insurance', example: 'Decline unless the true count is +3 or more' },
  },
  es: {
    hardLow: { title: '11 duro o menos', example: 'p. ej. 9, 10 u 11: cuándo doblar' },
    stiff: { title: 'Manos rígidas (12–16 duro)', example: 'p. ej. 16 vs 10: pedir, plantarse o rendirse' },
    hardHigh: { title: '17 duro o más', example: 'p. ej. 17 vs As' },
    soft: { title: 'Manos blandas', example: 'p. ej. A-7: plantarse, pedir o doblar' },
    pair: { title: 'Parejas', example: 'p. ej. 9-9 vs 7: dividir o plantarse' },
    insurance: { title: 'Seguro', example: 'Recházalo salvo que el conteo real sea +3 o más' },
  },
});

/** Categories you can drill (insurance is practiced at the table). */
export const DRILLABLE: LeakCategory[] = ['hardLow', 'stiff', 'hardHigh', 'soft', 'pair'];

export interface Tally {
  right: number;
  total: number;
}

export interface Spot extends Tally {
  /**
   * The situation, e.g. "Soft 18 vs 9". Stored in English (it doubles as the key);
   * topMissedSpots returns it in the current language.
   */
  label: string;
  best: Action;
}

export interface LeakStats {
  byCategory: Partial<Record<LeakCategory, Tally>>;
  /** Specific situations, keyed by their English label (e.g. "Soft 18 vs 9") so every language shares them. */
  spots: Record<string, Spot>;
  /**
   * Right (true) or wrong (false) for your last RECENT_WINDOW decisions, newest last.
   * Optional: saves from before it was added don't have it (read it as `recent ?? []`).
   */
  recent?: boolean[];
}

/** How many recent decisions the rolling window keeps (the casino-ready basic strategy check). */
export const RECENT_WINDOW = 200;

export const emptyLeaks = (): LeakStats => ({ byCategory: {}, spots: {}, recent: [] });

const upName = (r: Rank) => (r === 'A' ? 'A' : String(upValue(r)));

/** Which kind of decision a hand is. A pair only counts as a pair when splitting is allowed. */
export function categorize(cards: Card[], canSplit: boolean): LeakCategory {
  if (canSplit && isPair(cards)) return 'pair';
  const { total, soft } = handValue(cards);
  if (soft) return 'soft';
  if (total <= 11) return 'hardLow';
  if (total <= 16) return 'stiff';
  return 'hardHigh';
}

/** The language-independent key for a situation: its English label, e.g. "Soft 18 vs 9". */
function spotKey(cards: Card[], dealerUp: Rank, canSplit: boolean): string {
  const up = upName(dealerUp);
  if (canSplit && isPair(cards)) {
    const r = pointValue(cards[0].rank) === 10 ? '10' : cards[0].rank;
    return `${r},${r} vs ${up}`;
  }
  const { total, soft } = handValue(cards);
  return `${soft ? 'Soft' : 'Hard'} ${total} vs ${up}`;
}

/** A spot key (English label) in the current language: "Soft 18 vs 9" → "18 blando vs 9". Pairs read the same. */
export function localizeSpotLabel(key: string): string {
  if (getLang() !== 'es') return key;
  const m = /^(Soft|Hard) (\d+) vs (\S+)$/.exec(key);
  return m ? `${m[2]} ${m[1] === 'Soft' ? 'blando' : 'duro'} vs ${m[3]}` : key;
}

/**
 * A readable name for the exact situation in the current language,
 * e.g. "8,8 vs 10", "Soft 18 vs 9" ("18 blando vs 9"), "Hard 16 vs 10" ("16 duro vs 10").
 */
export function spotLabel(cards: Card[], dealerUp: Rank, canSplit: boolean): string {
  return localizeSpotLabel(spotKey(cards, dealerUp, canSplit));
}

/** Records one decision at the table or in a drill. */
export function recordDecision(
  stats: LeakStats,
  d: { cards: Card[]; dealerUp: Rank; canSplit: boolean; chosen: Action; best: Action },
): LeakStats {
  const category = categorize(d.cards, d.canSplit);
  // Keyed and stored in English so stats from either language merge.
  const label = spotKey(d.cards, d.dealerUp, d.canSplit);
  const ok = d.chosen === d.best;
  const cat = stats.byCategory[category] ?? { right: 0, total: 0 };
  const spot = stats.spots[label] ?? { label, best: d.best, right: 0, total: 0 };
  return {
    byCategory: { ...stats.byCategory, [category]: { right: cat.right + (ok ? 1 : 0), total: cat.total + 1 } },
    spots: { ...stats.spots, [label]: { ...spot, best: d.best, right: spot.right + (ok ? 1 : 0), total: spot.total + 1 } },
    recent: [...(stats.recent ?? []), ok].slice(-RECENT_WINDOW),
  };
}

export function recordInsurance(stats: LeakStats, ok: boolean): LeakStats {
  const cat = stats.byCategory.insurance ?? { right: 0, total: 0 };
  return { ...stats, byCategory: { ...stats.byCategory, insurance: { right: cat.right + (ok ? 1 : 0), total: cat.total + 1 } } };
}

export const accuracy = (t: Tally) => (t.total ? t.right / t.total : 1);

/** Decisions needed in a category before we call it a leak. */
export const MIN_SAMPLE = 5;

/** Categories with enough decisions, weakest first. */
export function rankedCategories(stats: LeakStats): { category: LeakCategory; tally: Tally }[] {
  return (Object.entries(stats.byCategory) as [LeakCategory, Tally][])
    .filter(([, t]) => t.total >= MIN_SAMPLE)
    .sort((a, b) => accuracy(a[1]) - accuracy(b[1]) || b[1].total - a[1].total)
    .map(([category, tally]) => ({ category, tally }));
}

/** The weakest drillable category, if any has enough data and is below 100%. */
export function weakestDrillable(stats: LeakStats): LeakCategory | undefined {
  return rankedCategories(stats).find((c) => DRILLABLE.includes(c.category) && accuracy(c.tally) < 1)?.category;
}

/** Spots you've missed, most misses first, labeled in the current language. */
export function topMissedSpots(stats: LeakStats, n = 5): Spot[] {
  return Object.values(stats.spots)
    .filter((s) => s.right < s.total)
    .sort((a, b) => b.total - b.right - (a.total - a.right) || accuracy(a) - accuracy(b))
    .slice(0, n)
    .map((s) => ({ ...s, label: localizeSpotLabel(s.label) }));
}

export const describeBest = (s: Spot) => `${tr('Best play', 'Mejor jugada')}: ${ACTION_LABEL[s.best]}`;

// ---------- Targeted practice ----------

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];
const card = (rank: Rank, rng: Rng): Card => ({ rank, suit: pick(SUITS, rng) });
const NON_ACE = RANKS.filter((r) => r !== 'A');

function twoCardsTotalling(min: number, max: number, rng: Rng): [Rank, Rank] {
  while (true) {
    const a = pick(NON_ACE, rng);
    const b = pick(NON_ACE, rng);
    const t = pointValue(a) + pointValue(b);
    if (pointValue(a) !== pointValue(b) && t >= min && t <= max) return [a, b];
  }
}

/** A strategy question drawn only from one category, for drilling a leak. */
export function focusedQuestion(category: LeakCategory, rng: Rng = Math.random): StrategyQuestion {
  let ranks: [Rank, Rank];
  switch (category) {
    case 'pair': {
      const r = pick(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as Rank[], rng);
      ranks = [r, r === '10' ? pick(['10', 'J', 'Q', 'K'] as Rank[], rng) : r];
      break;
    }
    case 'soft':
      ranks = ['A', pick(['2', '3', '4', '5', '6', '7', '8', '9'] as Rank[], rng)];
      break;
    case 'hardLow':
      ranks = twoCardsTotalling(5, 11, rng);
      break;
    case 'hardHigh':
      ranks = twoCardsTotalling(17, 19, rng);
      break;
    default:
      ranks = twoCardsTotalling(12, 16, rng);
  }
  if (rng() < 0.5) ranks.reverse();
  return { cards: ranks.map((r) => card(r, rng)), dealerUp: card(pick(RANKS, rng), rng) };
}
