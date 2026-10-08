// Bankroll simulator: edge, hourly win, swings and risk of ruin for a Hi-Lo bet spread.
//
// Method (a "hybrid" simulation, the approach used by Wong's and Schlesinger's
// tables and by CVData-style quick estimators):
//
// 1. The true-count distribution is SIMULATED: real shoes (as Hi-Lo tags) are
//    shuffled and dealt round by round to the cut card. Each hand takes 2 cards
//    plus a few hits, about 2.7 cards per hand on average (Wong, "Professional
//    Blackjack"), and every seat plus the dealer is a hand. Before each round we
//    record the true count a player would bet on (running count ÷ decks left,
//    decks judged to the nearest half deck and floored, exactly like the app's
//    own `flooredTrueCount`) and the exact true count (used for the edge).
// 2. The edge at each count uses the standard linear model: the off-the-top
//    edge set by the rules, plus about 0.5% per +1 Hi-Lo true count
//    (Griffin, "The Theory of Blackjack"; Schlesinger, "Blackjack Attack", ch. 10).
//    Count plays (Illustrious 18, Fab 4, insurance at +3) earn more at positive
//    counts; we use 0.6% per true count above zero for them. Checked against this
//    app's own game engine (game.ts + recommend(), 12M rounds per mode, 6 decks
//    S17 DAS LS 75%): measured slopes were ~0.55% (basic strategy) and ~0.55% below
//    zero / ~0.65% above zero (count plays), so these figures are slightly conservative.
// 3. Each hand's variance is about 1.30 squared units for basic strategy with
//    doubles and splits (Schlesinger, "Blackjack Attack": 1.26–1.33 by rules).
//
// From those: EV per hand = Σ freq × bet × edge, Var = Σ freq × bet² × 1.30 − EV²,
// N0 = Var / EV², and risk of ruin = exp(−2·EV·B / Var) (the diffusion
// approximation for a fixed bankroll that is never topped up or resized; it is
// the "lifetime" risk of losing the whole bankroll, see Schlesinger ch. 6).
//
// It runs in well under a second on a phone and is cached by its inputs.

import { flooredTrueCount } from './counting';
import { Rng, seededRng } from './cards';
import { Lang, localized } from '../i18n/lang';
import { Rules } from './rules';

/** The rules the simulator needs (a subset of the table Rules). */
export type SimRules = Pick<Rules, 'decks' | 'penetration' | 'dealerHitsSoft17' | 'doubleAfterSplit' | 'lateSurrender' | 'blackjackPayout'>;

/** Bet in units at true count ≤1, 2, 3, 4, 5+ (0 never: a minimum bet is 1 unit). */
export type BetRamp = [number, number, number, number, number];

export interface SimInputs {
  rules: SimRules;
  ramp: BetRamp;
  /** Dollars per betting unit. */
  unit: number;
  /** Dollars. */
  bankroll: number;
  /** Rounds dealt per hour at your table. */
  handsPerHour: number;
  /** Players at the table, you included (1 = heads-up, 7 = full table). */
  players: number;
  /** Sit out (no bet) when the true count is below −1, like a back-counter. */
  wongOut: boolean;
  /** Plays the Hi-Lo index plays (I18, Fab 4, insurance); false = basic strategy only. */
  countPlays: boolean;
}

export type RampPreset = 'app' | 'oneTwelve' | 'conservative' | 'flat';

/** "app" is the app's own ramp (counting.ts `suggestedBetUnits`). */
export const RAMP_PRESETS: Record<RampPreset, BetRamp> = {
  app: [1, 2, 4, 6, 8],
  oneTwelve: [1, 3, 6, 9, 12],
  conservative: [1, 2, 3, 4, 4],
  flat: [1, 1, 1, 1, 1],
};

/** Hi-Lo edge gained per +1 true count, in percent (Griffin; Schlesinger). */
export const EDGE_PER_TC = 0.5;
/** Same, above a true count of 0 when using count plays (see the method note above). */
export const EDGE_PER_TC_INDEXES = 0.6;

/** Player edge in percent at an exact true count, given the rules' house edge. */
export function edgeAt(houseEdgePct: number, tc: number, countPlays: boolean): number {
  const slope = countPlays && tc > 0 ? EDGE_PER_TC_INDEXES : EDGE_PER_TC;
  return -houseEdgePct + slope * tc;
}
/** Variance of one hand in squared units (Schlesinger, "Blackjack Attack"). */
export const HAND_VARIANCE = 1.3;
/** Average cards per hand, player or dealer (Wong, "Professional Blackjack"). */
export const CARDS_PER_HAND = 2.73;

/**
 * Effect of the number of decks on the house edge, relative to 6 decks, in
 * percent (Griffin; Wong; Wizard of Odds rule-variation tables).
 */
const DECK_EFFECT: Record<number, number> = { 1: -0.48, 2: -0.19, 3: -0.1, 4: -0.06, 5: -0.03, 6: 0, 7: 0.01, 8: 0.02 };

/** Chance of a blackjack from a shoe of this many decks (~4.83% single deck, ~4.75% six decks). */
export function blackjackChance(decks: number): number {
  const n = decks * 52;
  const aces = 4 * decks;
  const tens = 16 * decks;
  return (2 * aces * tens) / (n * (n - 1));
}

/**
 * Off-the-top house edge in percent (positive = casino advantage) for basic
 * strategy. Base: 6 decks, S17, DAS, no surrender, 3:2, resplit to 4 ≈ 0.40%.
 * Adjustments: H17 +0.20, no DAS +0.14, late surrender −0.08 (Wong; Griffin;
 * Wizard of Odds). A lower blackjack payout costs (1.5 − payout) × P(blackjack)
 * × P(dealer has none), which is +1.36% for 6:5 in six decks.
 */
export function houseEdge(r: SimRules): number {
  const decks = Math.max(1, Math.min(8, Math.round(r.decks)));
  let edge = 0.4 + DECK_EFFECT[decks];
  if (r.dealerHitsSoft17) edge += 0.2;
  if (!r.doubleAfterSplit) edge += 0.14;
  if (r.lateSurrender) edge -= 0.08;
  const bj = blackjackChance(decks);
  edge += (1.5 - r.blackjackPayout) * bj * (1 - bj) * 100;
  return edge;
}

/** Which ramp step a floored true count bets: ≤1 → 0, 2 → 1, … 5+ → 4. */
export const rampIndex = (tc: number) => Math.max(0, Math.min(4, tc - 1));

export interface TcBucket {
  /** Floored true count as a player would bet on it (clamped to MIN_TC..MAX_TC). */
  tc: number;
  /** Share of rounds dealt at this count. */
  freq: number;
  /** Average exact true count of those rounds (for the edge). */
  meanTc: number;
}

export interface TcDistribution {
  buckets: TcBucket[];
  rounds: number;
}

export const MIN_TC = -6;
export const MAX_TC = 8;

/** Cards for one hand: 2 plus 0–3 hits, mean ≈ 2.73 (see CARDS_PER_HAND). */
function cardsForHand(rng: Rng): number {
  const u = rng();
  return u < 0.45 ? 2 : u < 0.85 ? 3 : u < 0.97 ? 4 : 5;
}

/** Accumulates rounds into buckets. Split out so the async runner can work in chunks. */
class TcSampler {
  private count = new Float64Array(MAX_TC - MIN_TC + 1);
  private sumTc = new Float64Array(MAX_TC - MIN_TC + 1);
  private rounds = 0;
  private shoe: Int8Array;
  private cut: number;

  constructor(
    private decks: number,
    penetration: number,
    private players: number,
    private rng: Rng,
  ) {
    // Hi-Lo tags of one deck: twenty +1 (2–6), twelve 0 (7–9), twenty −1 (10–A).
    this.shoe = new Int8Array(decks * 52);
    for (let i = 0; i < this.shoe.length; i++) {
      const k = i % 52;
      this.shoe[i] = k < 20 ? 1 : k < 32 ? 0 : -1;
    }
    this.cut = Math.floor(this.shoe.length * Math.min(0.95, Math.max(0.4, penetration)));
  }

  /** Shuffles and deals one shoe to the cut card. */
  playShoe() {
    const { shoe, rng } = this;
    const n = shoe.length;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = shoe[i];
      shoe[i] = shoe[j];
      shoe[j] = t;
    }
    let dealt = 0;
    let rc = 0;
    while (dealt < this.cut) {
      const left = n - dealt;
      const bucket = Math.max(MIN_TC, Math.min(MAX_TC, flooredTrueCount(rc, left, 'hiLo'))) - MIN_TC;
      this.count[bucket] += 1;
      this.sumTc[bucket] += rc / (left / 52);
      this.rounds += 1;
      let cards = 0;
      for (let h = 0; h <= this.players; h++) cards += cardsForHand(rng);
      const end = Math.min(n, dealt + cards);
      for (; dealt < end; dealt++) rc += shoe[dealt];
    }
  }

  result(): TcDistribution {
    const buckets: TcBucket[] = [];
    for (let i = 0; i < this.count.length; i++) {
      const c = this.count[i];
      buckets.push({ tc: i + MIN_TC, freq: this.rounds ? c / this.rounds : 0, meanTc: c ? this.sumTc[i] / c : i + MIN_TC });
    }
    return { buckets, rounds: this.rounds };
  }

  /** How many shoes give about 1.2 million dealt cards (a stable estimate). */
  static shoesFor(decks: number, penetration: number): number {
    return Math.ceil(1_200_000 / (decks * 52 * Math.max(0.4, penetration)));
  }
}

/** Simulates the true-count distribution synchronously (tests; the app uses the async version). */
export function simulateTrueCounts(decks: number, penetration: number, players: number, seed = 1, shoes?: number): TcDistribution {
  const s = new TcSampler(decks, penetration, players, seededRng(seed));
  const total = shoes ?? TcSampler.shoesFor(decks, penetration);
  for (let i = 0; i < total; i++) s.playShoe();
  return s.result();
}

const cache = new Map<string, TcDistribution>();
const cacheKey = (decks: number, pen: number, players: number) => `${decks}|${pen.toFixed(3)}|${players}`;

/** Cached result for these table conditions, if already simulated. */
export function cachedTrueCounts(decks: number, penetration: number, players: number): TcDistribution | undefined {
  return cache.get(cacheKey(decks, penetration, players));
}

/**
 * Simulates the true-count distribution in small chunks so the UI stays responsive,
 * reporting progress 0..1. Results are cached by decks, penetration and players.
 */
export function simulateTrueCountsAsync(
  decks: number,
  penetration: number,
  players: number,
  onProgress?: (p: number) => void,
  isCancelled?: () => boolean,
): Promise<TcDistribution | null> {
  const key = cacheKey(decks, penetration, players);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const s = new TcSampler(decks, penetration, players, seededRng(1));
  const total = TcSampler.shoesFor(decks, penetration);
  const chunk = Math.max(1, Math.ceil(total / 20));
  let done = 0;
  return new Promise((resolve) => {
    const step = () => {
      if (isCancelled?.()) return resolve(null);
      const end = Math.min(total, done + chunk);
      for (; done < end; done++) s.playShoe();
      onProgress?.(done / total);
      if (done < total) setTimeout(step, 0);
      else {
        const d = s.result();
        cache.set(key, d);
        resolve(d);
      }
    };
    setTimeout(step, 0);
  });
}

export interface SimResult {
  /** Off-the-top house edge for the rules, percent (positive = casino). */
  houseEdge: number;
  /** Player edge on money bet, percent. */
  edge: number;
  /** Average bet in units over the hands you play. */
  avgBet: number;
  /** Share of rounds you bet on (below 1 when wonging out). */
  playedShare: number;
  /** Per round dealt, in units. */
  evPerRound: number;
  varPerRound: number;
  /** Dollars. */
  evPer100: number;
  sdPer100: number;
  evPerHour: number;
  sdPerHour: number;
  /** Rounds to overcome one standard deviation (Var / EV²); Infinity when EV ≤ 0. */
  n0: number;
  /** Risk of ruin for the bankroll, 0..1. */
  ror: number;
  /** Bankroll in dollars for 5% and 1% risk of ruin; Infinity when EV ≤ 0. */
  bankroll5: number;
  bankroll1: number;
}

/** Edge, swings and risk of ruin for a bet ramp over a true-count distribution. */
export function analyze(input: SimInputs, dist: TcDistribution): SimResult {
  const he = houseEdge(input.rules);
  let ev = 0;
  let money = 0;
  let second = 0;
  let played = 0;
  for (const b of dist.buckets) {
    if (!b.freq) continue;
    // Wong out: sit out at true counts below −1 (floored −2 or lower).
    if (input.wongOut && b.tc < -1) continue;
    const bet = Math.max(0, input.ramp[rampIndex(b.tc)]);
    // Linear within a bucket, so the bucket's mean exact count gives its mean edge
    // (a floored bucket lies on one side of 0, up to the half-deck estimate).
    const edge = edgeAt(he, b.meanTc, input.countPlays) / 100;
    ev += b.freq * bet * edge;
    money += b.freq * bet;
    second += b.freq * bet * bet * HAND_VARIANCE;
    played += bet > 0 ? b.freq : 0;
  }
  const variance = Math.max(1e-9, second - ev * ev);
  const unit = input.unit;
  const h = input.handsPerHour;
  const bankrollUnits = input.bankroll / unit;
  const winning = ev > 0;
  const needed = (risk: number) => (winning ? (-Math.log(risk) * variance) / (2 * ev) * unit : Infinity);
  return {
    houseEdge: he,
    edge: money ? (ev / money) * 100 : 0,
    avgBet: played ? money / played : 0,
    playedShare: played,
    evPerRound: ev,
    varPerRound: variance,
    evPer100: ev * 100 * unit,
    sdPer100: Math.sqrt(variance * 100) * unit,
    evPerHour: ev * h * unit,
    sdPerHour: Math.sqrt(variance * h) * unit,
    n0: winning ? variance / (ev * ev) : Infinity,
    ror: winning ? Math.min(1, Math.exp((-2 * ev * bankrollUnits) / variance)) : 1,
    bankroll5: needed(0.05),
    bankroll1: needed(0.01),
  };
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** Chance of being ahead after this many hours (normal approximation). */
export function chanceAhead(r: SimResult, hours: number): number {
  if (r.sdPerHour <= 0) return r.evPerHour > 0 ? 1 : 0;
  return normalCdf((r.evPerHour * Math.sqrt(hours)) / r.sdPerHour);
}

export type SimWarning = 'sixFive' | 'losing' | 'ror' | 'spread' | 'shallow';

/** Things worth flagging about these conditions and this result. */
export function warnings(input: SimInputs, r: SimResult): SimWarning[] {
  const out: SimWarning[] = [];
  if (input.rules.blackjackPayout < 1.5) out.push('sixFive');
  if (r.evPerRound <= 0) out.push('losing');
  else if (r.ror > 0.1) out.push('ror');
  const min = Math.max(1, Math.min(...input.ramp));
  // Shoe-game spreads much past 1–8 to 1–10 tend to draw the casino's attention.
  if (Math.max(...input.ramp) / min > 10) out.push('spread');
  if (input.rules.penetration < 0.7) out.push('shallow');
  return out;
}

const money = (n: number, lang: Lang) => {
  const v = Math.round(Math.abs(n)).toLocaleString(lang === 'es' ? 'es-MX' : 'en-US');
  return `${n < 0 ? '−' : ''}$${v}`;
};

const T = localized({
  en: {
    lang: 'en' as Lang,
    win: (ev: string, down: string) => `You’d win about ${ev} an hour on average, but about one hour in six you’d be down more than ${down}.`,
    winSmall: (ev: string, sd: string) => `You’d win about ${ev} an hour on average, with typical swings of ±${sd} an hour.`,
    lose: (ev: string) => `You’d lose about ${ev} an hour on average. This spread doesn’t beat these rules.`,
    ahead: (p: number, hours: number) => `Chance of being ahead after ${hours} hours: about ${p}%.`,
    long: (hours: number) => `It takes about ${hours.toLocaleString('en-US')} hours of play before your edge reliably outweighs the swings (N0).`,
    ror: (p: string, bank: string) => `Risk of losing the whole ${bank} bankroll: ${p}.`,
  },
  es: {
    lang: 'es' as Lang,
    win: (ev: string, down: string) => `Ganarías unos ${ev} por hora en promedio, pero más o menos una hora de cada seis estarías perdiendo más de ${down}.`,
    winSmall: (ev: string, sd: string) => `Ganarías unos ${ev} por hora en promedio, con altibajos típicos de ±${sd} por hora.`,
    lose: (ev: string) => `Perderías unos ${ev} por hora en promedio. Este rango de apuestas no le gana a estas reglas.`,
    ahead: (p: number, hours: number) => `Probabilidad de ir ganando tras ${hours} horas: alrededor de ${p}%.`,
    long: (hours: number) => `Se necesitan unas ${hours.toLocaleString('es-MX')} horas de juego para que tu ventaja supere con claridad los altibajos (N0).`,
    ror: (p: string, bank: string) => `Riesgo de perder toda tu banca de ${bank}: ${p}.`,
  },
});

/** "12.3%", "<0.1%". */
export function formatPercent(p: number): string {
  const pct = p * 100;
  if (pct > 0 && pct < 0.1) return '<0.1%';
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`;
}

/** Plain-language summary lines for a result, in the current language. */
export function describe(input: SimInputs, r: SimResult): string[] {
  const lang = T.lang;
  const lines: string[] = [];
  if (r.evPerHour > 0) {
    const down = r.sdPerHour - r.evPerHour;
    lines.push(down > 0 ? T.win(money(r.evPerHour, lang), money(down, lang)) : T.winSmall(money(r.evPerHour, lang), money(r.sdPerHour, lang)));
    lines.push(T.ahead(Math.round(chanceAhead(r, 100) * 100), 100));
    lines.push(T.long(Math.max(1, Math.round(r.n0 / input.handsPerHour))));
  } else {
    lines.push(T.lose(money(-r.evPerHour, lang)));
  }
  lines.push(T.ror(formatPercent(r.ror), money(input.bankroll, lang)));
  return lines;
}

/** Dollar amount for display ("$1,250", "−$40"). */
export const formatMoney = (n: number) => money(n, T.lang);
