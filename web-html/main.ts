// Single-file HTML build of Blackjack Coach for quick testing in any desktop browser.
// It reuses the app's engine and lesson content; only the UI layer is separate.
import { LESSONS, Lesson, getLesson } from '../src/content/lessons';
import { Card, isRed } from '../src/engine/cards';
import {
  decksRemaining,
  flooredTrueCount,
  hiLoValue,
  runningCount,
  shouldTakeInsurance,
  suggestedBetUnits,
} from '../src/engine/counting';
import {
  AcademyMode,
  LearningPreference,
  MAX_LEVEL,
  MODES,
  ModeProgress,
  PREFERENCE_LABEL,
  academyXp,
  cardGroups,
  cardRun,
  countStory,
  dailyWorkout,
  flashMs,
  groupChoices,
  groupValue,
  isDue,
  modesFor,
  newProgress,
  recordRound,
  roundLength,
  spokenEvery,
  tagOf,
  tapSeconds,
  visualHints,
} from '../src/engine/academy';
import { DEAL_STEP_MS, DealSchedule, HapticKind, SoundName, cardDelay, dealSchedule, hapticSchedule } from '../src/engine/dealSchedule';
import { countDrillCards, strategyQuestion, trueCountQuestion } from '../src/engine/drills';
import {
  CATEGORY_INFO,
  DRILLABLE,
  LeakCategory,
  LeakStats,
  MIN_SAMPLE,
  Tally,
  accuracy,
  describeBest,
  emptyLeaks,
  focusedQuestion,
  rankedCategories,
  recordDecision,
  recordInsurance,
  topMissedSpots,
  weakestDrillable,
} from '../src/engine/leaks';
import { TUTORIAL, TUTORIAL_BET, tutorialGame } from '../src/engine/tutorial';
import { tagSymbol, tagText } from '../src/theme';
import {
  GameState,
  Outcome,
  YOU,
  isYours,
  act,
  currentTrueCount,
  decisionContext,
  legalActions,
  newGame,
  resolveInsurance,
  startRound,
} from '../src/engine/game';
import { describeHand } from '../src/engine/hand';
import { DEFAULT_RULES, Rules } from '../src/engine/rules';
import { ACTION_LABEL, Action, Cell, formatTrueCount, hardCell, pairCell, recommend, softCell } from '../src/engine/strategy';
import { countUpTicks, roundFanfare, streakPitch } from '../src/engine/juice';
import {
  BonusClaims,
  bonusAdsLeft,
  bonusChips,
  recordBonusClaim,
  CHIP_COLORS,
  CasinoTable,
  STARTING_CHIPS,
  TABLES,
  bestAffordableTable,
  canSit,
  chipBreakdown,
  chipLabel,
  formatChips,
  getTable,
  isUnlocked,
  levelInfo,
  localDay,
  needsRefill,
  newlyUnlocked,
  roundXp,
} from '../src/engine/progression';
import {
  Npc,
  Occupant,
  SEAT_COUNT,
  STYLE_LABEL,
  TableEvent,
  Table as SeatTable,
  betweenRounds,
  createTable,
  findNpc,
  isNpc,
  npcAction,
  roundBets,
  setYourHands,
  settleNpcs,
} from '../src/engine/table';
import { clearFanfare, enableCardTilt, playFanfare } from './fx';
import { playSound, unlockAudio } from './sound';

// ---------- Saved settings and progress ----------

interface Stats {
  handsPlayed: number;
  decisions: number;
  correctDecisions: number;
  countDrillsPassed: number;
  bestStrategyStreak: number;
  lessonsCompleted: string[];
  xp: number;
  peakChips: number;
  biggestWin: number;
  refills: number;
  bonusClaims?: BonusClaims;
  bonusChipsEarned: number;
  leaks: LeakStats;
  onboarded: boolean;
  academy: {
    pref?: LearningPreference;
    progress: Partial<Record<AcademyMode, ModeProgress>>;
    streak: number;
    lastWorkoutDay?: string;
  };
}

interface Settings {
  rules: Rules;
  showHints: boolean;
  correctMistakes: boolean;
  showCount: boolean;
  countQuizzes: boolean;
  useDeviations: boolean;
  soundEffects: boolean;
  bigEffects: boolean;
  haptics: boolean;
  yourHands: number;
  otherPlayers: boolean;
  bankroll: number;
  tableId: string;
  colorblind: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  rules: DEFAULT_RULES,
  showHints: true,
  correctMistakes: true,
  showCount: true,
  countQuizzes: false,
  useDeviations: false,
  soundEffects: true,
  bigEffects: true,
  haptics: true,
  yourHands: 2,
  otherPlayers: true,
  bankroll: STARTING_CHIPS,
  tableId: 'floor',
  colorblind: false,
};
const DEFAULT_STATS: Stats = {
  handsPlayed: 0,
  decisions: 0,
  correctDecisions: 0,
  countDrillsPassed: 0,
  bestStrategyStreak: 0,
  lessonsCompleted: [],
  xp: 0,
  peakChips: STARTING_CHIPS,
  biggestWin: 0,
  refills: 0,
  bonusChipsEarned: 0,
  leaks: emptyLeaks(),
  onboarded: false,
  academy: { progress: {}, streak: 0 },
};
const STORAGE_KEY = 'blackjack-coach/v1';

let settings: Settings = DEFAULT_SETTINGS;
let stats: Stats = DEFAULT_STATS;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  if (saved) {
    settings = { ...DEFAULT_SETTINGS, ...saved.settings, rules: { ...DEFAULT_RULES, ...saved.settings?.rules } };
    stats = { ...DEFAULT_STATS, ...saved.stats };
  }
} catch {
  // Storage unavailable (private window, file:// restrictions): run without saving.
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, stats }));
  } catch {
    // Ignore; progress just won't persist.
  }
}

function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  save();
}

function updateStats(fn: (s: Stats) => Stats) {
  stats = fn(stats);
  save();
}

// ---------- Helpers ----------

const app = document.getElementById('app')!;
const titleEl = document.getElementById('screen-title')!;
const backEl = document.getElementById('back') as HTMLAnchorElement;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = (s: string) => esc(s).replace(/\n/g, '<br>');
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;
const SUIT_NAME: Record<Card['suit'], string> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };

function cardHtml(card: Card | null, opts: { size?: 'xs' | 'sm' | 'md' | 'lg'; tag?: boolean; dealAt?: number; flipAt?: number } = {}): string {
  const size = opts.size ?? 'md';
  if (size === 'xs' && card) {
    // Tiny cards for other players' seats: just rank over suit.
    const deal = opts.dealAt !== undefined;
    return `<div class="card-wrap ${deal ? 'deal-in' : ''}" style="${deal ? `animation-delay:${opts.dealAt}ms` : ''}"><div class="card xs ${isRed(card) ? 'red' : ''}" aria-label="${card.rank} of ${SUIT_NAME[card.suit]}"><b>${card.rank}</b><span>${card.suit}</span></div></div>`;
  }
  if (!card) return `<div class="card back ${size} ${opts.dealAt !== undefined ? 'deal-in' : ''}" style="${opts.dealAt !== undefined ? `animation-delay:${opts.dealAt}ms` : ''}" aria-label="Face-down card"></div>`;
  if (opts.flipAt !== undefined) {
    // Two-sided card that starts face down and turns over after the delay.
    return `<div class="flipper ${size}" style="animation-delay:${opts.flipAt}ms">
      <div class="card back ${size} face-back"></div>${cardHtml(card, { size })}</div>`;
  }
  const t = hiLoValue(card.rank);
  const tag = opts.tag
    ? `<span class="tag ${t > 0 ? 'plus' : t < 0 ? 'minus' : ''}" aria-label="Count tag ${t > 0 ? 'plus 1' : t < 0 ? 'minus 1' : 'zero'}">${tagText(t)}</span>`
    : '';
  const deal = opts.dealAt !== undefined;
  return `<div class="card-wrap ${deal ? 'deal-in' : ''}" style="${deal ? `animation-delay:${opts.dealAt}ms` : ''}"><div class="card ${size} ${isRed(card) ? 'red' : ''}" aria-label="${card.rank} of ${SUIT_NAME[card.suit]}">
    <span class="idx">${card.rank}<br>${card.suit}</span><span class="pip">${card.suit}</span><span class="idx flip">${card.rank}<br>${card.suit}</span>
  </div>${tag}</div>`;
}

interface HandOpts {
  label: string;
  hideHole?: boolean;
  active?: boolean;
  result?: string;
  size?: 'sm' | 'md';
  /** Deal delay for cards that are new in this render (undefined = already on the table). */
  dealAt?: (index: number) => number | undefined;
  flipAt?: number;
  /** Cards still landing: hide totals and results so they don't spoil the outcome. */
  settling?: boolean;
}

function handHtml(cards: Card[], o: HandOpts) {
  const cardsHtml = cards
    .map((c, i) =>
      cardHtml(o.hideHole && i === 1 ? null : c, {
        size: o.size,
        dealAt: o.dealAt?.(i),
        flipAt: i === 1 && !o.hideHole ? o.flipAt : undefined,
      }),
    )
    .join('');
  const desc = o.settling ? '…' : o.hideHole ? `showing ${cards[0].rank}` : describeHand(cards);
  return `<div class="hand ${o.active ? 'active' : ''}">
    <div class="hand-cards">${cardsHtml}</div>
    <div class="hand-label">${esc(o.label)}: <b>${esc(desc)}</b>${o.result && !o.settling ? ` · ${esc(o.result)}` : ''}</div>
  </div>`;
}

function on(selector: string, event: string, fn: (el: HTMLElement, e: Event) => void) {
  app.querySelectorAll<HTMLElement>(selector).forEach((el) => el.addEventListener(event, (e) => fn(el, e)));
}

let cleanup: (() => void) | null = null;

// ---------- Router ----------

type View = { title: string; back?: string; render: () => void };

function route(): View {
  const hash = location.hash.replace(/^#/, '') || 'home';
  if (hash.startsWith('academy-')) {
    const mode = MODES.find((m) => m.id === hash.slice(8));
    if (mode) return { title: mode.title, back: 'academy', render: () => renderAcademyMode(mode.id) };
  }
  if (hash.startsWith('drill-strategy-')) {
    const focus = hash.slice(15) as LeakCategory;
    if (DRILLABLE.includes(focus)) return { title: `Drill: ${CATEGORY_INFO[focus].title}`, back: 'leaks', render: () => renderStrategyDrill(focus) };
  }
  if (hash.startsWith('lesson-')) {
    const lesson = getLesson(hash.slice(7));
    if (lesson) return { title: lesson.title, back: 'learn', render: () => renderLesson(lesson) };
  }
  const views: Record<string, View> = {
    home: { title: 'Blackjack Coach', render: renderHome },
    learn: { title: 'Lessons', back: 'home', render: renderLearn },
    tables: { title: 'Casino Floor', back: 'home', render: renderTables },
    play: { title: getTable(settings.tableId).name, back: 'tables', render: renderPlay },
    drills: { title: 'Drills', back: 'home', render: renderDrills },
    'drill-strategy': { title: 'Strategy Drill', back: 'drills', render: () => renderStrategyDrill() },
    leaks: { title: 'Your Leaks', back: 'home', render: renderLeaks },
    welcome: { title: 'Welcome', render: renderWelcome },
    'drill-count': { title: 'Running Count Drill', back: 'drills', render: renderCountDrill },
    'drill-true-count': { title: 'True Count Drill', back: 'drills', render: renderTrueCountDrill },
    academy: { title: 'Counting Academy', back: 'home', render: renderAcademy },
    chart: { title: 'Strategy Chart', back: 'home', render: renderChart },
    settings: { title: 'Settings', back: 'home', render: renderSettings },
  };
  return views[hash] ?? views.home;
}

function navigate() {
  // Brand-new players get the guided first hands before anything else.
  if (!stats.onboarded && stats.handsPlayed === 0 && (location.hash === '' || location.hash === '#home')) {
    location.replace('#welcome');
    return;
  }
  cleanup?.();
  cleanup = null;
  settleTable();
  const view = route();
  titleEl.textContent = view.title;
  backEl.hidden = !view.back;
  backEl.href = `#${view.back ?? 'home'}`;
  view.render();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', navigate);

/** Color-blind mode swaps green/red for blue/orange everywhere via CSS variables. */
function applyTheme() {
  document.documentElement.classList.toggle('cb', settings.colorblind);
}
applyTheme();
// Warm up audio on the first interaction so the first deal isn't silent.
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// ---------- Home ----------

function renderHome() {
  const accuracy = stats.decisions ? `${Math.round((stats.correctDecisions / stats.decisions) * 100)}%` : '—';
  const tiles = [
    ['learn', 'Learn', 'Step-by-step lessons from the rules to card counting', '01'],
    ['tables', 'Casino Floor', 'Play with a coach. Win chips to unlock bigger tables', '02'],
    ['academy', 'Counting Academy', 'Learn to count your way: see it, hear it, tap it, chunk it or read it', '03'],
    ['drills', 'Drills', 'Basic strategy, running count and true count drills', '03'],
    ['leaks', 'Your Leaks', 'The decisions you miss most, and a drill aimed at them', '04'],
    ['chart', 'Strategy Chart', 'The full basic strategy chart for your table rules', '04'],
    ['settings', 'Settings', 'Table rules, coaching options and progress', '05'],
  ];
  app.innerHTML = `
    <section class="hero">
      <div class="hero-cards">${cardHtml({ rank: 'A', suit: '♠' }, { size: 'sm' })}${cardHtml({ rank: 'K', suit: '♥' }, { size: 'sm' })}</div>
      <h1>Blackjack Coach</h1>
      <p class="muted">Learn to play every hand correctly, then learn to count cards.</p>
    </section>
    <div class="panel">
      <div class="stats">
        <div><b>$${formatChips(settings.bankroll)}</b><span>Chips</span></div>
        <div><b>${stats.lessonsCompleted.length}/${LESSONS.length}</b><span>Lessons</span></div>
        <div><b>${accuracy}</b><span>Accuracy</span></div>
      </div>
      ${levelBarHtml()}
    </div>
    <nav class="tiles">
      ${tiles
        .map(
          ([href, title, sub]) => `<a class="tile" href="#${href}">
            <span class="tile-text"><b>${title}</b><span>${sub}</span></span><span class="chev" aria-hidden="true">›</span></a>`,
        )
        .join('')}
    </nav>
    <p class="fine">For entertainment and education only. Play money, no real-money gambling.</p>`;
}

/** Level, title and progress toward the next level. */
function levelBarHtml(compact = false) {
  const { level, title, into, span } = levelInfo(stats.xp);
  return `<div class="levelbar ${compact ? 'compact' : ''}">
    <div class="level-row"><b>Lv ${level} · ${title}</b>${compact ? '' : `<span>${into}/${span} XP</span>`}</div>
    <div class="track"><div class="fill" style="width:${Math.min(100, (into / span) * 100)}%"></div></div>
  </div>`;
}

const chipHtml = (d: number, attrs = '') => {
  const c = CHIP_COLORS[d] ?? CHIP_COLORS[1];
  return `<button class="chip" style="--chip:${c.fill};--chip-ink:${c.text}" ${attrs} aria-label="Add a ${d} chip"><span>${chipLabel(d)}</span></button>`;
};

/** Your bet drawn as a small stack of chips. */
function chipStackHtml(amount: number) {
  const chips = chipBreakdown(amount, 10).reverse();
  return `<div class="chip-stack" style="height:${26 + Math.max(0, chips.length - 1) * 4}px">${chips
    .map((d, i) => `<i style="bottom:${i * 4}px;background:${(CHIP_COLORS[d] ?? CHIP_COLORS[1]).fill}"></i>`)
    .join('')}</div>`;
}

// ---------- Casino floor ----------

function renderTables() {
  const chips = settings.bankroll;
  const peak = stats.peakChips;
  app.innerHTML = `
    <div class="panel">
      <div class="chips-head"><b>$${formatChips(chips)}</b><span>chips</span></div>
      ${levelBarHtml()}
      <p class="muted small">Best ever: $${formatChips(peak)} · Biggest win: $${formatChips(stats.biggestWin)}</p>
      ${bonusButtonHtml()}
    </div>
    <p class="muted">Grow your chips to unlock bigger tables. Chips are play money and can't be bought.</p>
    <div class="list">${TABLES.map((t) => {
      const unlocked = isUnlocked(t, peak);
      const sit = canSit(t, chips, peak);
      const here = settings.tableId === t.id;
      return `<button class="casino-table ${unlocked ? '' : 'locked'}" data-table="${t.id}" style="background:${t.felt}" ${sit ? '' : 'disabled'}>
        <span class="tile-text">
          <b>${unlocked ? '' : '🔒 '}${t.name}${here ? ' · your table' : ''}</b>
          <span class="limits">$${formatChips(t.minBet)} – $${formatChips(t.maxBet)}</span>
          <span>${t.blurb}</span>
          ${
            !unlocked
              ? `<span class="need">Reach $${formatChips(t.unlockAt)} chips to unlock</span><span class="track"><span class="fill" style="width:${Math.min(100, (peak / t.unlockAt) * 100)}%"></span></span>`
              : !sit
                ? `<span class="need">You need $${formatChips(t.minBet)} to sit here</span>`
                : ''
          }
        </span>${sit ? '<span class="chev" aria-hidden="true">›</span>' : ''}</button>`;
    }).join('')}</div>`;
  on('[data-table]', 'click', (el) => sitAt(el.dataset.table!));
  on('#bonus-ad', 'click', () => watchBonusAd(() => renderTables()));
}

/** Walks to another table: new shoe, new players, bet set to its minimum. */
function sitAt(id: string) {
  if (settings.tableId !== id) {
    updateSettings({ tableId: id });
    settleTable();
    resetTable();
  }
  location.hash = 'play';
}

// ---------- Lessons ----------

function renderLearn() {
  const units: Lesson['unit'][] = ['Basics', 'Strategy', 'Counting'];
  app.innerHTML =
    `<p class="muted">Work through the lessons in order. Each one ends with a short quiz.</p>` +
    units
      .map(
        (unit) => `<h2>${unit}</h2><div class="list">${LESSONS.filter((l) => l.unit === unit)
          .map((l) => {
            const done = stats.lessonsCompleted.includes(l.id);
            return `<a class="tile" href="#lesson-${l.id}">
              <span class="badge ${done ? 'done' : ''}">${done ? '✓' : LESSONS.indexOf(l) + 1}</span>
              <span class="tile-text"><b>${esc(l.title)}</b><span>${esc(l.summary)}</span></span></a>`;
          })
          .join('')}</div>`,
      )
      .join('');
}

const PRACTICE_HASH: Record<string, string> = {
  '/play': 'play',
  '/drills/strategy': 'drill-strategy',
  '/drills/count': 'drill-count',
  '/drills/true-count': 'drill-true-count',
  '/chart': 'chart',
};

function renderLesson(lesson: Lesson) {
  const answers: Record<number, number> = {};
  const suits = ['♠', '♥', '♣', '♦'] as const;
  const next = LESSONS[LESSONS.indexOf(lesson) + 1];

  const draw = () => {
    const allCorrect = lesson.quiz.every((q, i) => answers[i] === q.answer);
    app.innerHTML = `
      <article class="lesson">
        ${lesson.sections
          .map(
            (s) => `<section>
              ${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}
              <p>${text(s.body)}</p>
              ${s.cards ? `<div class="card-row">${s.cards.map((rank, j) => cardHtml({ rank, suit: suits[j % 4] }, { size: 'sm', tag: s.showTags })).join('')}</div>` : ''}
            </section>`,
          )
          .join('')}
      </article>
      <h2>Quiz</h2>
      ${lesson.quiz
        .map((q, qi) => {
          const picked = answers[qi];
          const answered = picked !== undefined;
          const ok = picked === q.answer;
          return `<div class="panel">
            <p class="q">${esc(q.question)}</p>
            <div class="btn-row">${q.options
              .map(
                (opt, oi) =>
                  `<button class="btn ${answered && oi === picked ? (ok ? 'primary' : 'danger') : 'secondary'}" data-q="${qi}" data-o="${oi}">${esc(opt)}</button>`,
              )
              .join('')}</div>
            ${answered ? `<p class="${ok ? 'good' : 'bad'}">${ok ? `✓ Correct. ${esc(q.explanation)}` : '✗ Not quite. Try again.'}</p>` : ''}
          </div>`;
        })
        .join('')}
      ${
        allCorrect
          ? `<div class="panel complete"><p class="done">Lesson complete</p>
            ${lesson.practice ? `<a class="btn primary" href="#${PRACTICE_HASH[lesson.practice.href]}">${esc(lesson.practice.label)}</a>` : ''}
            ${next ? `<a class="btn secondary" href="#lesson-${next.id}">Next: ${esc(next.title)}</a>` : ''}</div>`
          : ''
      }`;
    on('[data-q]', 'click', (el) => {
      const qi = Number(el.dataset.q);
      if (answers[qi] === lesson.quiz[qi].answer) return;
      answers[qi] = Number(el.dataset.o);
      if (lesson.quiz.every((q, i) => answers[i] === q.answer) && !stats.lessonsCompleted.includes(lesson.id)) {
        updateStats((s) => ({ ...s, lessonsCompleted: [...s.lessonsCompleted, lesson.id] }));
      }
      const y = window.scrollY;
      draw();
      window.scrollTo(0, y);
    });
  };
  draw();
}

// ---------- Practice table ----------

const OUTCOME_LABEL: Record<Outcome, string> = {
  win: 'Win',
  lose: 'Lose',
  push: 'Push',
  blackjack: 'Blackjack!',
  surrender: 'Surrendered',
};
const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];
// Mirrors the mobile app's interstitial caps (src/ads/config.ts).
const AD_EVERY_N_ROUNDS = 10;
const AD_MIN_INTERVAL_MS = 3 * 60 * 1000;

/** How long a computer player "thinks" before acting. */
const NPC_THINK_MS = 650;
/** Seat 1 (first base) is on the right from your chair; seats sit on an arc. */
const SEAT_ORDER = Array.from({ length: SEAT_COUNT }, (_, i) => SEAT_COUNT - 1 - i);
const ARC = [0, 10, 16, 18, 16, 10, 0];

const seatTable = () => {
  const t = createTable(settings.yourHands, getTable(settings.tableId).minBet, settings.otherPlayers);
  return t;
};

const table = {
  game: newGame(settings.rules, settings.bankroll),
  seats: seatTable() as SeatTable,
  events: [] as TableEvent[],
  /** What each computer player just did, keyed by player id. */
  bubbles: {} as Record<string, string>,
  npcPending: false,
  bet: getTable(settings.tableId).minBet,
  /** Correct decisions this round, for XP. */
  roundCorrect: 0,
  /** Level-ups and newly unlocked tables to announce after a round. */
  milestones: [] as { text: string; table?: CasinoTable }[],
  feedback: null as { ok: boolean; text: string } | null,
  countVisible: settings.showCount,
  quiz: null as { guess: number; revealed: boolean } | null,
  streak: 0,
  roundsSinceAd: 0,
  lastAd: Date.now(),
  // Deal animation state: what changed last, whether it has finished, and the
  // state whose cards have all landed (the count and bankroll show that one).
  schedule: null as DealSchedule | null,
  settled: true,
  shown: null as GameState | null,
  timers: [] as ReturnType<typeof setTimeout>[],
  // Bankroll display while winnings count up into it.
  bankrollShown: null as number | null,
  countTimer: null as ReturnType<typeof setInterval> | null,
  badgeShown: 0,
};

const reducedMotionPref = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Ends any running deal animation immediately. */
function settleTable() {
  table.timers.forEach(clearTimeout);
  table.timers = [];
  table.npcPending = false;
  if (table.countTimer) clearInterval(table.countTimer);
  table.countTimer = null;
  table.bankrollShown = null;
  clearFanfare();
  table.settled = true;
  table.schedule = null;
  table.shown = table.game;
}

function resetTable() {
  table.game = newGame(settings.rules, settings.bankroll);
  table.bet = getTable(settings.tableId).minBet;
  table.milestones = [];
  table.seats = seatTable();
  table.events = [];
  table.bubbles = {};
  table.shown = table.game;
  table.feedback = null;
  table.quiz = null;
}

function renderPlay() {
  cleanup?.();
  // Chips can change off the table (a bonus claimed in the lobby, a reset): pick them up between rounds.
  if (table.game.phase === 'betting' && table.settled && table.game.bankroll !== settings.bankroll && !table.countTimer) {
    table.game = { ...table.game, bankroll: settings.bankroll };
    table.shown = table.game;
  }
  const g = table.game;
  const shown = table.shown ?? g;
  const animating = !table.settled;
  const sched = animating ? table.schedule : null;
  const rules = g.rules;
  const legal = legalActions(g);
  const tc = currentTrueCount(g);
  const shownTc = currentTrueCount(shown);
  const activeHand = g.phase === 'playing' ? g.hands[g.active] : undefined;
  const yourTurn = isYours(activeHand);
  const ctx = yourTurn ? decisionContext(g, settings.useDeviations) : null;
  const advice = ctx ? recommend(ctx) : null;
  const waitingOn = activeHand && !yourTurn ? findNpc(table.seats, activeHand.owner) : undefined;
  const yourSeatCount = table.seats.seats.filter((o) => o === YOU).length;
  const affordable = Math.min(yourSeatCount, Math.floor(g.bankroll / table.bet));
  const casino = getTable(settings.tableId);
  const unit = casino.minBet;
  const maxPerHand = Math.min(casino.maxBet, Math.floor(g.bankroll / Math.max(1, yourSeatCount)));
  // When your chips no longer cover this table's minimum, suggest one that fits.
  const moveTo = g.bankroll < unit && !needsRefill(g.bankroll) ? bestAffordableTable(g.bankroll, stats.peakChips) : undefined;
  const units = suggestedBetUnits(flooredTrueCount(g.runningCount, g.shoe.length));
  const hideHole = !g.holeRevealed && g.dealer.length > 0;

  const countHtml = table.countVisible
    ? `<button class="count" id="count-toggle" title="Hide the count">RC ${signed(shown.runningCount)} · Decks ${decksRemaining(shown.shoe.length)} · TC ${formatTrueCount(shownTc)}</button>`
    : `<button class="count" id="count-toggle">Show count</button>`;

  // Your hands, shown large, in the same left-to-right order as the seats.
  const yours = g.hands.map((h, i) => ({ h, i })).filter(({ h }) => isYours(h)).reverse();
  const inSchedule = (seat: 'dealer' | number) => (i: number) =>
    sched?.cards.some((c) => c.seat === seat && c.index === i) ? cardDelay(sched, seat, i) : undefined;

  let controls = '';
  if (animating) {
    controls = '';
  } else if (g.phase === 'playing' && !yourTurn) {
    controls = `<p class="waiting">${esc(waitingOn?.name ?? 'Another player')} is playing…</p>`;
  } else if (g.phase === 'playing') {
    controls = `
      ${settings.showHints && advice ? `<p class="hint">Seat ${activeHand!.seat + 1} · Coach: ${ACTION_LABEL[advice.action]}${advice.deviation ? ' (count play)' : ''}</p>` : ''}
      <div class="btn-row actions">${ACTIONS.filter((a) => a !== 'surrender' || rules.lateSurrender)
        .map(
          (a) =>
            `<button class="btn secondary ${settings.showHints && advice?.action === a ? 'glow' : ''}" data-act="${a}" ${legal[a] ? '' : 'disabled'}>${ACTION_LABEL[a]}</button>`,
        )
        .join('')}</div>
      <p class="keys">Keys: H hit · S stand · D double · P split · R surrender</p>`;
  } else if (g.phase === 'insurance') {
    controls = `<div class="panel">
      <p class="prompt">Dealer shows an Ace. Insurance?</p>
      ${settings.showHints ? `<p class="hint">Coach: ${settings.useDeviations && shouldTakeInsurance(tc) ? 'Take it (TC +3 or higher)' : 'Decline'}</p>` : ''}
      <div class="btn-row"><button class="btn secondary" data-ins="1">Take insurance</button><button class="btn secondary" data-ins="0">No insurance</button></div>
    </div>`;
  } else if (g.phase === 'roundOver') {
    const q = table.quiz;
    controls = `<div class="panel">
      <p class="prompt ${g.lastNet > 0 ? 'good' : g.lastNet < 0 ? 'bad' : ''}">${g.lastNet > 0 ? `You won ${money(g.lastNet)}` : g.lastNet < 0 ? `You lost ${money(-g.lastNet)}` : 'Push'}</p>
      ${
        q
          ? `<p class="prompt">Pop quiz: what's the running count?</p>
        <div class="stepper"><button class="btn ghost" id="q-minus" ${q.revealed ? 'disabled' : ''}>−</button><span class="guess">${signed(q.guess)}</span><button class="btn ghost" id="q-plus" ${q.revealed ? 'disabled' : ''}>+</button>
        ${q.revealed ? '' : '<button class="btn secondary" id="q-check">Check</button>'}</div>
        ${q.revealed ? `<p class="${q.guess === g.runningCount ? 'good' : 'bad'}">${q.guess === g.runningCount ? '✓ Spot on!' : `✗ It was ${signed(g.runningCount)}.`}</p>` : ''}`
          : ''
      }
      <button class="btn primary" id="next-hand">Next hand <kbd>Enter</kbd></button>
    </div>`;
  } else {
    controls = `<div class="panel">
      <div class="seg" id="hands-choice" role="group" aria-label="Hands to play">${[1, 2]
        .map((n) => `<button class="${settings.yourHands === n ? 'on' : ''}" data-hands="${n}" aria-pressed="${settings.yourHands === n}">Play ${n} hand${n > 1 ? 's' : ''}</button>`)
        .join('')}</div>
      <div class="bet-row">${chipStackHtml(table.bet)}<p class="prompt">Bet $${formatChips(table.bet)}${yourSeatCount > 1 ? ` on each of your ${yourSeatCount} hands` : ''}</p></div>
      <p class="muted center small">Table limits $${formatChips(unit)}–$${formatChips(casino.maxBet)}</p>
      ${table.countVisible ? `<button class="hint linklike" id="count-bet">Count suggests ${units} unit${units > 1 ? 's' : ''} ($${formatChips(units * unit)}) per hand · bet it</button>` : ''}
      <div class="tray">${casino.chips.map((c) => chipHtml(c, `data-chip="${c}" ${table.bet + c > maxPerHand ? 'disabled' : ''}`)).join('')}
        <button class="btn ghost" id="clear-bet" ${table.bet === 0 ? 'disabled' : ''}>Clear</button></div>
      ${
        needsRefill(g.bankroll)
          ? `<button class="btn primary" id="refill">Out of chips: free refill to $${formatChips(STARTING_CHIPS)}</button>`
          : moveTo
            ? `<button class="btn primary" id="move-table" data-table="${moveTo.id}">You need $${formatChips(unit)} here. Move to ${moveTo.name}</button>`
            : table.bet < unit
              ? `<button class="btn primary" disabled>Add chips: $${formatChips(unit)} minimum</button>`
              : affordable >= 1
                ? `<button class="btn primary" id="deal">${affordable < yourSeatCount ? 'Deal (1 hand: low on chips)' : 'Deal'} <kbd>Enter</kbd></button>`
                : `<button class="btn primary" id="lower-bet">Lower bet to $${formatChips(unit)}</button>`
      }
      ${bonusButtonHtml()}
      <a class="center small" href="#tables">Change table</a>
    </div>`;
  }

  app.innerHTML = `
    <div class="topbar"><span class="bankroll" id="bankroll">Chips $${formatChips(table.bankrollShown ?? shown.bankroll)}</span>${countHtml}</div>
    ${levelBarHtml(true)}
    ${streakBadge()}
    ${g.justShuffled && g.phase !== 'betting' ? '<p class="shuffle">New shoe shuffled. The count resets to 0.</p>' : ''}
    <div class="felt" style="background-color:${casino.felt}">
      <div class="area">${
        g.dealer.length
          ? handHtml(g.dealer, {
              label: 'Dealer',
              hideHole,
              dealAt: inSchedule('dealer'),
              flipAt: sched?.holeFlipAt ?? undefined,
              settling: animating && g.holeRevealed,
            })
          : `<p class="rules-line">${casino.name} · $${formatChips(unit)}–$${formatChips(casino.maxBet)} · ${rules.decks} deck${rules.decks > 1 ? 's' : ''} · Dealer ${rules.dealerHitsSoft17 ? 'hits soft 17' : 'stands on all 17s'} · Blackjack pays ${rules.blackjackPayout === 1.5 ? '3:2' : '6:5'}</p>`
      }</div>
      <div class="seats">${SEAT_ORDER.map(
        (seat, pos) => `<div class="seat-slot" style="margin-top:${ARC[pos]}px">${seatHtml(seat, table.seats.seats[seat], g, inSchedule, animating)}</div>`,
      ).join('')}</div>
      <div class="area players">${yours
        .map(({ h, i }) =>
          handHtml(h.cards, {
            label: `Seat ${h.seat + 1}`,
            active: g.phase === 'playing' && i === g.active,
            result: h.outcome ? OUTCOME_LABEL[h.outcome] : money(h.bet),
            size: yours.length > 2 || (yours.length > 1 && yours.some(({ h: x }) => x.cards.length >= 4)) ? 'sm' : 'md',
            dealAt: inSchedule(i),
            settling: animating,
          }),
        )
        .join('')}</div>
    </div>
    ${
      table.events.length
        ? `<div class="events">${table.events.map((e, i) => `<p class="${i ? 'old' : ''}">${e.kind === 'join' ? '→' : '←'} ${esc(e.text)}</p>`).join('')}</div>`
        : ''
    }
    ${
      !animating && table.milestones.length
        ? `<div class="panel milestone">${table.milestones
            .map(
              (m) =>
                `<p class="milestone-text">★ ${esc(m.text)}</p>${
                  m.table ? `<button class="btn secondary" data-goto="${m.table.id}">Go to ${m.table.name} ($${formatChips(m.table.minBet)}–$${formatChips(m.table.maxBet)})</button>` : ''
                }`,
            )
            .join('')}</div>`
        : ''
    }
    ${table.feedback ? `<div class="feedback ${table.feedback.ok ? 'ok' : 'no'}">${table.feedback.ok ? '✓' : '✗'} ${esc(table.feedback.text)}</div>` : ''}
    ${controls}`;

  on('#count-toggle', 'click', () => {
    table.countVisible = !table.countVisible;
    renderPlay();
  });
  on('[data-act]', 'click', (el) => playerAction(el.dataset.act as Action));
  on('[data-ins]', 'click', (el) => insurance(el.dataset.ins === '1'));
  on('[data-bet]', 'click', (el) => {
    table.bet += Number(el.dataset.bet);
    renderPlay();
  });
  on('#deal', 'click', deal);
  on('[data-hands]', 'click', (el) => {
    updateSettings({ yourHands: Number(el.dataset.hands) });
    applySeating();
    renderPlay();
  });
  on('#lower-bet', 'click', () => {
    table.bet = unit;
    renderPlay();
  });
  on('#next-hand', 'click', nextHand);
  on('[data-chip]', 'click', (el) => {
    vibrate('chip');
    table.bet += Number(el.dataset.chip);
    renderPlay();
  });
  on('#clear-bet', 'click', () => {
    table.bet = 0;
    renderPlay();
  });
  on('#count-bet', 'click', () => {
    table.bet = Math.min(maxPerHand, units * unit);
    renderPlay();
  });
  on('#refill', 'click', () => {
    // Free refill back to the starting stack, at the Main Floor.
    updateSettings({ bankroll: STARTING_CHIPS, tableId: 'floor' });
    updateStats((s) => ({ ...s, refills: s.refills + 1 }));
    resetTable();
    table.shown = table.game;
    titleEl.textContent = getTable('floor').name;
    renderPlay();
  });
  on('#move-table', 'click', (el) => sitAt(el.dataset.table!));
  on('#bonus-ad', 'click', () =>
    watchBonusAd((amount) => {
      // Bonus chips land in your stack with the usual count-up and a chip burst.
      const before = table.game.bankroll;
      table.game = { ...table.game, bankroll: before + amount };
      table.shown = table.game;
      renderPlay();
      countUpBankroll(before, table.game.bankroll);
      if (settings.soundEffects) playSound('chips');
      vibrate('bigWin');
      playFanfare(
        { tier: 'bigWin', label: `+$${formatChips(amount)} BONUS`, net: amount, shake: 0, particles: 28 },
        app.querySelector('.felt'),
        settings.bigEffects,
      );
    }),
  );
  on('[data-goto]', 'click', (el) => {
    if (table.game.phase === 'roundOver') nextHand();
    sitAt(el.dataset.goto!);
    titleEl.textContent = getTable(el.dataset.goto!).name;
    renderPlay();
  });
  on('#q-minus', 'click', () => {
    table.quiz!.guess--;
    renderPlay();
  });
  on('#q-plus', 'click', () => {
    table.quiz!.guess++;
    renderPlay();
  });
  on('#q-check', 'click', () => {
    table.quiz!.revealed = true;
    if (table.quiz!.guess === table.game.runningCount) updateStats((s) => ({ ...s, countDrillsPassed: s.countDrillsPassed + 1 }));
    renderPlay();
  });

  const keys = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const map: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };
    const ph = table.game.phase;
    if (!table.settled) return;
    if (ph === 'playing' && !isYours(table.game.hands[table.game.active])) return;
    if (ph === 'playing' && map[k] && legalActions(table.game)[map[k]]) playerAction(map[k]);
    else if (k === 'enter' && ph === 'betting' && app.querySelector('#deal')) deal();
    else if (k === 'enter' && ph === 'roundOver') nextHand();
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', keys);
  cleanup = () => document.removeEventListener('keydown', keys);
  // Computer players act on their own; one who has left just stands.
  if (table.settled && activeHand && !yourTurn) scheduleNpcTurn();
}

/** One seat: a computer player's avatar, bets and small cards, your spot, or an open seat. */
function seatHtml(seat: number, o: Occupant, g: GameState, inSchedule: (seat: number) => (i: number) => number | undefined, animating: boolean) {
  const no = `<span class="seat-no">${seat + 1}</span>`;
  if (o === null) return `<div class="seat"><div class="avatar empty"></div><span class="open">open</span>${no}</div>`;
  if (o === YOU) {
    const bet = g.hands.filter((h) => h.seat === seat).reduce((sum, h) => sum + h.bet, 0);
    return `<div class="seat"><div class="avatar you">YOU</div>${bet ? `<span class="seat-bet">${money(bet)}</span>` : ''}${no}</div>`;
  }
  const npc = o as Npc;
  const hands = g.hands.map((h, i) => ({ h, i })).filter(({ h }) => h.owner === npc.id);
  const turn = g.phase === 'playing' && hands.some(({ i }) => i === g.active);
  const initials = npc.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const bubble = table.bubbles[npc.id];
  return `<div class="seat">
    <div class="avatar ${turn ? 'turn' : ''}" style="background:hsl(${npc.hue} 45% 38%)">${esc(initials)}</div>
    <span class="seat-name">${esc(npc.name)}</span>
    <span class="seat-style">${STYLE_LABEL[npc.style]}</span>
    ${hands
      .map(({ h, i }) => {
        const dealAt = inSchedule(i);
        const cards = h.cards
          .map((c, ci) => `<div class="xs-pos" style="top:${ci * 14}px;left:${ci * 6}px">${cardHtml(c, { size: 'xs', dealAt: dealAt(ci) })}</div>`)
          .join('');
        const won = (h.payout ?? 0) > h.bet;
        const res = animating ? '&nbsp;' : h.outcome ? OUTCOME_SHORT[h.outcome] : esc(describeHand(h.cards));
        return `<div class="seat-hand"><span class="seat-bet">${money(h.bet)}</span>
          <div class="xs-stack" style="height:${42 + (h.cards.length - 1) * 14}px;width:${30 + (h.cards.length - 1) * 6}px">${cards}</div>
          <span class="seat-total ${!animating && h.outcome ? (won ? 'good' : h.payout === h.bet ? '' : 'bad') : ''}">${res}</span></div>`;
      })
      .join('')}
    ${bubble ? `<span class="bubble ${bubble.includes('✗') ? 'mistake' : ''}">${esc(bubble)}</span>` : ''}
    ${no}</div>`;
}

const OUTCOME_SHORT: Record<Outcome, string> = { win: 'Win', lose: 'Lose', push: 'Push', blackjack: 'BJ!', surrender: 'Surr.' };

/** Applies the "hands you play" and "other players" settings; only between rounds. */
function applySeating() {
  if (table.game.phase !== 'betting' && table.game.phase !== 'roundOver') return;
  const seated = setYourHands(table.seats, settings.yourHands);
  table.seats = settings.otherPlayers ? seated : { ...seated, seats: seated.seats.map((o) => (isNpc(o) ? null : o)) };
}

/** Lets the computer player whose turn it is act after a short pause. */
function scheduleNpcTurn() {
  if (table.npcPending) return;
  table.npcPending = true;
  table.timers.push(
    setTimeout(() => {
      table.npcPending = false;
      const g = table.game;
      const h = g.phase === 'playing' ? g.hands[g.active] : undefined;
      if (!h || isYours(h)) return;
      const npc = findNpc(table.seats, h.owner);
      let action: Action = 'stand';
      if (npc) {
        const choice = npcAction(g, npc);
        action = choice.action;
        const note = action === choice.book ? '' : npc.style === 'counter' ? ' · count play' : ` ✗ book: ${ACTION_LABEL[choice.book]}`;
        table.bubbles[npc.id] = `${ACTION_LABEL[action]}${note}`;
      }
      afterChange(act(g, action));
    }, NPC_THINK_MS),
  );
}

/** "STREAK ×n" badge; it pops only when the streak has just grown. */
function streakBadge(streak = table.streak) {
  if (streak < 2) {
    table.badgeShown = streak;
    return '';
  }
  const pop = streak > table.badgeShown ? 'pop' : '';
  table.badgeShown = streak;
  return `<div class="streak ${streak >= 10 ? 'hot' : ''} ${pop}">STREAK ×${streak}</div>`;
}

/** Correct/wrong chime; the correct one climbs a semitone per streak step. */
function gradeSound(ok: boolean, streak: number) {
  unlockAudio();
  if (settings.soundEffects) playSound(ok ? 'correct' : 'wrong', ok ? streakPitch(streak) : 1);
}

/** Vibration patterns (ms on/off). Browsers support this on Android only; elsewhere it's a no-op. */
const VIBRATION: Record<HapticKind, number | number[]> = {
  cardLand: 8,
  flip: 12,
  chip: 5,
  win: 30,
  bigWin: [30, 60, 40],
  blackjack: [40, 60, 40, 60, 80],
  bust: 120,
};

function vibrate(kind: HapticKind) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(VIBRATION[kind]);
  } catch {
    // No vibration here.
  }
}

/** Counts the bankroll display up to `target` with rising ticks. */
function countUpBankroll(from: number, target: number) {
  const ticks = reducedMotionPref() ? 0 : countUpTicks(target - from);
  if (!ticks) return;
  let i = 0;
  table.bankrollShown = from;
  table.countTimer = setInterval(() => {
    i++;
    table.bankrollShown = i >= ticks ? target : Math.round(from + ((target - from) * i) / ticks);
    const el = document.getElementById('bankroll');
    if (el) {
      el.textContent = `Chips $${formatChips(table.bankrollShown)}`;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
    if (settings.soundEffects) playSound('tick', 1 + i * 0.06);
    if (i >= ticks) {
      clearInterval(table.countTimer!);
      table.countTimer = null;
      table.bankrollShown = null;
    }
  }, 65);
}

function grade(ok: boolean, explanation: string) {
  table.streak = ok ? table.streak + 1 : 0;
  if (ok) table.roundCorrect++;
  gradeSound(ok, table.streak);
  updateStats((s) => ({ ...s, decisions: s.decisions + 1, correctDecisions: s.correctDecisions + (ok ? 1 : 0) }));
  if (!ok) table.feedback = settings.correctMistakes ? { ok, text: explanation } : null;
  else table.feedback = { ok, text: table.streak >= 5 ? `Correct! ${table.streak} in a row.` : 'Correct!' };
}

function afterChange(next: GameState) {
  unlockAudio();
  settleTable();
  const s = dealSchedule(table.game, next, reducedMotionPref() ? 0 : DEAL_STEP_MS);
  if (settings.soundEffects) {
    for (const sound of s.sounds) table.timers.push(setTimeout(() => playSound(sound.name), sound.at));
  }
  for (const h of hapticSchedule(next, s, reducedMotionPref() ? 0 : DEAL_STEP_MS)) table.timers.push(setTimeout(() => vibrate(h.kind), h.at));
  const before = (table.shown ?? table.game).bankroll;
  table.game = next;
  table.schedule = s;
  const land = (rerender: boolean) => {
    table.settled = true;
    table.shown = next;
    countUpBankroll(before, next.bankroll);
    if (rerender) renderPlay();
    const f = roundFanfare(next);
    if (f) playFanfare(f, app.querySelector('.felt'), settings.bigEffects);
  };
  if (s.doneAt > 0) {
    table.settled = false;
    // Leaving the table clears these timers (see navigate).
    table.timers.push(setTimeout(() => land(true), s.doneAt));
  } else {
    table.shown = next;
    queueMicrotask(() => land(false));
  }
  if (next.phase === 'roundOver') {
    table.seats = settleNpcs(table.seats, next);
    updateSettings({ bankroll: next.bankroll });
    // XP for each of your seats played and each correct call; new peaks unlock tables.
    const seatsPlayed = new Set(next.hands.filter(isYours).map((h) => h.seat)).size;
    const xp = stats.xp + roundXp(seatsPlayed, table.roundCorrect);
    const before = levelInfo(stats.xp);
    const after = levelInfo(xp);
    table.milestones = [];
    if (after.level > before.level) table.milestones.push({ text: `Level ${after.level}: ${after.title}` });
    for (const t of newlyUnlocked(stats.peakChips, next.bankroll)) table.milestones.push({ text: `New table unlocked: ${t.name}`, table: t });
    updateStats((s) => ({
      ...s,
      handsPlayed: s.handsPlayed + 1,
      xp,
      peakChips: Math.max(s.peakChips, next.bankroll),
      biggestWin: Math.max(s.biggestWin, next.lastNet),
    }));
    if (settings.countQuizzes && Math.random() < 0.25) {
      table.quiz = { guess: 0, revealed: false };
      table.countVisible = false;
    }
  }
  renderPlay();
}

function playerAction(action: Action) {
  const ctx = decisionContext(table.game, settings.useDeviations);
  if (ctx) {
    const advice = recommend(ctx);
    grade(action === advice.action, `Best play: ${ACTION_LABEL[advice.action]}. ${advice.reason}`);
    // Track which kinds of decisions you miss (see Your Leaks).
    updateStats((s) => ({
      ...s,
      leaks: recordDecision(s.leaks, { cards: ctx.cards, dealerUp: ctx.dealerUp, canSplit: ctx.canSplit, chosen: action, best: advice.action }),
    }));
  }
  afterChange(act(table.game, action));
}

function insurance(take: boolean) {
  const tc = currentTrueCount(table.game);
  const best = settings.useDeviations && shouldTakeInsurance(tc);
  updateStats((s) => ({ ...s, leaks: recordInsurance(s.leaks, take === best) }));
  grade(
    take === best,
    best
      ? `Take insurance: the true count is ${formatTrueCount(tc)} (+3 or more), so over a third of the remaining cards are 10s.`
      : 'Decline insurance. It loses money in the long run unless the true count is +3 or higher.',
  );
  afterChange(resolveInsurance(table.game, take));
}

function deal() {
  table.feedback = null;
  table.quiz = null;
  table.bubbles = {};
  table.milestones = [];
  table.roundCorrect = 0;
  const g = table.game;
  const yourSeatCount = table.seats.seats.filter((o) => o === YOU).length;
  // Play as many of your seats as your bankroll covers.
  let skip = yourSeatCount - Math.min(yourSeatCount, Math.floor(g.bankroll / table.bet));
  const bets = roundBets(table.seats, table.bet, currentTrueCount(g), getTable(settings.tableId).minBet).filter((b) => b.owner !== YOU || skip-- <= 0);
  const next = startRound(g, bets);
  if (next.phase === 'insurance') {
    // Card counters at the table take insurance when the count is high.
    const take = shouldTakeInsurance(currentTrueCount(next));
    for (const o of table.seats.seats) if (isNpc(o) && o.style === 'counter') table.bubbles[o.id] = take ? 'Takes insurance' : 'No insurance';
  }
  afterChange(next);
}

function nextHand() {
  table.feedback = null;
  table.quiz = null;
  settleTable();
  table.bubbles = {};
  table.game = { ...table.game, phase: 'betting', hands: [], dealer: [] };
  applySeating();
  const between = betweenRounds(table.seats, getTable(settings.tableId).minBet, settings.otherPlayers);
  table.seats = between.table;
  if (between.events.length) table.events = [...between.events, ...table.events].slice(0, 3);
  table.game = { ...table.game, phase: 'betting', hands: [], dealer: [] };
  table.shown = table.game;
  table.roundsSinceAd++;
  if (table.roundsSinceAd >= AD_EVERY_N_ROUNDS && Date.now() - table.lastAd >= AD_MIN_INTERVAL_MS) {
    table.roundsSinceAd = 0;
    table.lastAd = Date.now();
    showAdPreview();
  }
  renderPlay();
}

function showAdPreview() {
  const overlay = document.getElementById('ad-overlay')!;
  overlay.hidden = false;
  (overlay.querySelector('button') as HTMLButtonElement).focus();
}

// ---------- Bonus chips from rewarded ads ----------

/** "Watch an ad for bonus chips" button; a note once today's ads are used up. */
function bonusButtonHtml() {
  const left = bonusAdsLeft(stats.bonusClaims, new Date());
  if (left === 0) return '<p class="muted center small">Bonus chips: come back tomorrow for more.</p>';
  return `<button class="btn secondary" id="bonus-ad">▶ Watch an ad: +$${formatChips(bonusChips(stats.peakChips))} chips (${left} left today)</button>`;
}

const REWARD_SECONDS = 5;
let rewardTimer: ReturnType<typeof setInterval> | null = null;

/** Plays the rewarded-ad preview; chips are granted only if it runs to the end. */
function watchBonusAd(onGranted: (amount: number) => void) {
  const overlay = document.getElementById('reward-overlay')!;
  const count = document.getElementById('reward-count')!;
  const claim = document.getElementById('reward-claim') as HTMLButtonElement;
  const amount = bonusChips(stats.peakChips);
  let left = REWARD_SECONDS;
  const tick = () => {
    count.textContent = left > 0 ? `Reward in ${left}s` : 'Reward earned!';
    claim.hidden = left > 0;
    claim.textContent = `Claim +$${formatChips(amount)}`;
  };
  overlay.hidden = false;
  tick();
  if (rewardTimer) clearInterval(rewardTimer);
  rewardTimer = setInterval(() => {
    left--;
    tick();
    if (left <= 0 && rewardTimer) clearInterval(rewardTimer);
  }, 1000);
  const close = () => {
    overlay.hidden = true;
    if (rewardTimer) clearInterval(rewardTimer);
    claim.onclick = null;
  };
  document.getElementById('reward-close')!.onclick = close;
  claim.onclick = () => {
    close();
    updateSettings({ bankroll: settings.bankroll + amount });
    updateStats((s) => ({
      ...s,
      bonusClaims: recordBonusClaim(s.bonusClaims, new Date()),
      bonusChipsEarned: s.bonusChipsEarned + amount,
    }));
    onGranted(amount);
  };
}

document.getElementById('ad-close')!.addEventListener('click', () => {
  document.getElementById('ad-overlay')!.hidden = true;
});

// ---------- Drills ----------

function renderDrills() {
  const drills = [
    ['drill-strategy', 'Basic Strategy', 'Random hands vs a dealer upcard. Choose the best play and see why.'],
    ['drill-count', 'Running Count', 'Cards flash by. Keep the Hi-Lo count and enter it at the end.'],
    ['drill-true-count', 'True Count', 'Convert a running count to a true count using the decks remaining.'],
  ];
  app.innerHTML =
    `<p class="muted">Short, repeatable practice. A few minutes a day builds real speed.</p><div class="list">` +
    drills
      .map(([h, t, d]) => `<a class="tile" href="#${h}"><span class="tile-text"><b>${t}</b><span>${d}</span></span><span class="chev" aria-hidden="true">›</span></a>`)
      .join('') +
    '</div>';
}

function renderStrategyDrill(focus?: LeakCategory) {
  const nextQuestion = () => (focus ? focusedQuestion(focus) : strategyQuestion());
  let q = nextQuestion();
  let picked: Action | null = null;
  const score = { right: 0, total: 0, streak: 0 };
  const rules = settings.rules;
  const actions: Action[] = ['hit', 'stand', 'double', 'split', ...(rules.lateSurrender ? (['surrender'] as Action[]) : [])];

  const draw = () => {
    const advice = recommend({ cards: q.cards, dealerUp: q.dealerUp.rank, rules, canDouble: true, canSplit: true, canSurrender: rules.lateSurrender });
    const ok = picked === advice.action;
    app.innerHTML = `
      <div class="score-row"><span>${score.right}/${score.total} correct</span><span>Streak ${score.streak} · Best ${Math.max(stats.bestStrategyStreak, score.streak)}</span></div>
      ${streakBadge(score.streak)}
      <div class="felt drill">
        <p class="muted">Dealer shows</p>${cardHtml(q.dealerUp)}
        ${handHtml(q.cards, { label: 'You' })}
      </div>
      <div class="btn-row actions">${actions
        .map(
          (a) =>
            `<button class="btn ${picked && a === advice.action ? 'primary' : picked === a ? 'danger' : 'secondary'}" data-a="${a}">${ACTION_LABEL[a]}</button>`,
        )
        .join('')}</div>
      ${
        picked
          ? `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? '✓ Correct' : `✗ The best play is ${ACTION_LABEL[advice.action]}`}</b><br>${esc(advice.reason)}</div>
             <button class="btn primary" id="next">Next hand <kbd>Enter</kbd></button>`
          : '<p class="keys">Keys: H hit · S stand · D double · P split · R surrender</p>'
      }`;
    on('[data-a]', 'click', (el) => choose(el.dataset.a as Action));
    on('#next', 'click', next);

    function choose(a: Action) {
      if (picked) return;
      picked = a;
      const correct = a === advice.action;
      score.total++;
      score.right += correct ? 1 : 0;
      score.streak = correct ? score.streak + 1 : 0;
      gradeSound(correct, score.streak);
      updateStats((s) => ({
        ...s,
        decisions: s.decisions + 1,
        correctDecisions: s.correctDecisions + (correct ? 1 : 0),
        bestStrategyStreak: Math.max(s.bestStrategyStreak, score.streak),
        leaks: recordDecision(s.leaks, { cards: q.cards, dealerUp: q.dealerUp.rank, canSplit: true, chosen: a, best: advice.action }),
      }));
      draw();
    }
  };
  const next = () => {
    picked = null;
    q = nextQuestion();
    draw();
  };
  const keys = (e: KeyboardEvent) => {
    const map: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };
    const k = e.key.toLowerCase();
    if (picked && k === 'enter') next();
    else if (!picked && map[k] && actions.includes(map[k])) (app.querySelector(`[data-a="${map[k]}"]`) as HTMLButtonElement).click();
  };
  document.addEventListener('keydown', keys);
  cleanup = () => document.removeEventListener('keydown', keys);
  draw();
}

function renderCountDrill() {
  let speed = 1000;
  let length = 20;
  let perFlash = 1;
  let cards: Card[] = [];
  let index = 0;
  let guess = 0;
  let phase: 'setup' | 'running' | 'answer' | 'result' = 'setup';
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  cleanup = stop;

  const seg = <T extends number>(id: string, opts: [string, T][], value: T) =>
    `<div class="seg" role="group" id="${id}">${opts
      .map(([l, v]) => `<button class="${v === value ? 'on' : ''}" data-v="${v}" aria-pressed="${v === value}">${l}</button>`)
      .join('')}</div>`;

  const start = () => {
    cards = countDrillCards(length);
    index = 0;
    guess = 0;
    phase = 'running';
    stop();
    timer = setInterval(() => {
      index += perFlash;
      if (index >= cards.length) {
        stop();
        phase = 'answer';
      }
      draw();
    }, speed);
    draw();
  };

  const draw = () => {
    const actual = runningCount(cards);
    if (phase === 'setup') {
      app.innerHTML = `
        <p>Keep the Hi-Lo running count as the cards flash by: +1 for 2–6, 0 for 7–9, −1 for 10s and Aces.</p>
        <div class="panel">
          <label class="lbl">Speed</label>${seg('speed', [['Slow', 1500], ['Medium', 1000], ['Fast', 600], ['Pro', 350]], speed)}
          <label class="lbl">Length</label>${seg('length', [['10 cards', 10], ['20 cards', 20], ['Full deck', 52]], length)}
          <label class="lbl">Cards at a time</label>${seg('per', [['One', 1], ['Two (cancel pairs)', 2]], perFlash)}
        </div>
        <button class="btn primary" id="start">Start</button>`;
      on('#speed button', 'click', (el) => ((speed = Number(el.dataset.v)), draw()));
      on('#length button', 'click', (el) => ((length = Number(el.dataset.v)), draw()));
      on('#per button', 'click', (el) => ((perFlash = Number(el.dataset.v)), draw()));
      on('#start', 'click', start);
    } else if (phase === 'running') {
      app.innerHTML = `<div class="flash">${cards.slice(index, index + perFlash).map((c) => cardHtml(c, { size: 'lg' })).join('')}</div>
        <p class="muted center">${Math.min(index + perFlash, cards.length)} / ${cards.length}</p>
        <button class="btn ghost" id="stop">Stop</button>`;
      on('#stop', 'click', () => {
        stop();
        phase = 'setup';
        draw();
      });
    } else {
      const ok = guess === actual;
      app.innerHTML = `
        <div class="panel">
          <p class="prompt">What's the running count?</p>
          <div class="stepper"><button class="btn ghost" id="minus" ${phase === 'result' ? 'disabled' : ''}>−</button><span class="guess big">${signed(guess)}</span><button class="btn ghost" id="plus" ${phase === 'result' ? 'disabled' : ''}>+</button></div>
          ${phase === 'answer' ? '<button class="btn primary" id="check">Check</button><p class="keys">Arrow keys or +/− to change, Enter to check</p>' : ''}
        </div>
        ${
          phase === 'result'
            ? `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? '✓ Perfect count!' : `✗ The count was ${signed(actual)}`}</b></div>
          <div class="panel"><p class="muted">Every card with its tag:</p><div class="card-row">${cards.map((c) => cardHtml(c, { size: 'sm', tag: true })).join('')}</div></div>
          <div class="btn-row"><button class="btn primary" id="again">Try again</button><button class="btn ghost" id="setup">Change settings</button></div>`
            : ''
        }`;
      on('#minus', 'click', () => ((guess--), draw()));
      on('#plus', 'click', () => ((guess++), draw()));
      on('#check', 'click', check);
      on('#again', 'click', start);
      on('#setup', 'click', () => ((phase = 'setup'), draw()));
    }
  };

  const check = () => {
    phase = 'result';
    if (guess === runningCount(cards)) updateStats((s) => ({ ...s, countDrillsPassed: s.countDrillsPassed + 1 }));
    draw();
  };

  const keys = (e: KeyboardEvent) => {
    if (phase !== 'answer') return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+' || e.key === '=') guess++;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') guess--;
    else if (e.key === 'Enter') return check();
    else return;
    e.preventDefault();
    draw();
  };
  document.addEventListener('keydown', keys);
  cleanup = () => {
    stop();
    document.removeEventListener('keydown', keys);
  };
  draw();
}

function renderTrueCountDrill() {
  const maxDecks = Math.max(2, settings.rules.decks);
  let q = trueCountQuestion(maxDecks);
  let picked: number | null = null;
  const score = { right: 0, total: 0 };
  const draw = () => {
    const ok = picked === q.answer;
    app.innerHTML = `
      <p class="muted">True count = running count ÷ decks remaining.</p>
      <div class="score-row"><span>${score.right}/${score.total} correct</span></div>
      <div class="panel center"><p class="big">Running count ${signed(q.running)}</p><p class="big">${q.decks} deck${q.decks === 1 ? '' : 's'} left</p><p class="muted">What's the true count?</p></div>
      <div class="btn-row">${q.options
        .map((n) => `<button class="btn ${picked !== null && n === q.answer ? 'primary' : picked === n ? 'danger' : 'secondary'}" data-n="${n}">${signed(n)}</button>`)
        .join('')}</div>
      ${
        picked !== null
          ? `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? '✓ Correct' : `✗ It's ${signed(q.answer)}`}</b><br>${signed(q.running)} ÷ ${q.decks} = ${signed(q.answer)}</div><button class="btn primary" id="next">Next</button>`
          : ''
      }`;
    on('[data-n]', 'click', (el) => {
      if (picked !== null) return;
      picked = Number(el.dataset.n);
      score.total++;
      score.right += picked === q.answer ? 1 : 0;
      draw();
    });
    on('#next', 'click', () => {
      picked = null;
      q = trueCountQuestion(maxDecks);
      draw();
    });
  };
  draw();
}

// ---------- Counting Academy ----------

const PREFS: LearningPreference[] = ['see', 'hear', 'do', 'read', 'mix'];
/** The daily workout in progress, if any: three modes played in order. */
let workoutRun: { plan: AcademyMode[]; step: number } | null = null;

const sgn = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const tagClass = (t: number) => (t > 0 ? 'plus' : t < 0 ? 'minus' : 'zero');
const tagSound = (t: number): SoundName => (t > 0 ? 'tag_plus' : t < 0 ? 'tag_minus' : 'tag_zero');

function sfx(name: SoundName) {
  if (settings.soundEffects) playSound(name);
}

/** Says a short phrase with the browser's speech engine, if there is one. */
function say(text: string) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch {
    // No speech in this browser: the sounds still carry the tags.
  }
}
const spoken = (n: number) => (n === 0 ? 'zero' : `${n > 0 ? 'plus' : 'minus'} ${Math.abs(n)}`);

function renderAcademy() {
  workoutRun = null;
  const academy = stats.academy;
  const pref = academy.pref ?? 'mix';
  const today = localDay(new Date());
  const plan = dailyWorkout(academy.progress, today, pref);
  const doneToday = academy.lastWorkoutDay === today;
  app.innerHTML = `
    <p>Five ways to learn the Hi-Lo count. Start with the style you enjoy, then mix them.</p>
    <div class="panel">
      <b>How do you like to learn?</b>
      <div class="pref-chips">${PREFS.map((p) => `<button class="pref ${p === pref ? 'on' : ''}" data-pref="${p}" aria-pressed="${p === pref}">${PREFERENCE_LABEL[p]}</button>`).join('')}</div>
      <p class="muted small">Your choice only sets which exercises come first. Research finds that everyone learns best from a mix, which is why the daily workout uses several.</p>
    </div>
    <div class="panel milestone-ish">
      <div class="row-between"><b class="gold big-label">Today's workout</b><span>${academy.streak > 0 ? `🔥 ${academy.streak}-day streak` : 'Start a streak'}</span></div>
      <p class="muted small">Three short exercises, mixed up. A few minutes a day beats one long session: spacing practice out helps it stick.</p>
      <ol class="plan">${plan.map((id) => `<li>${MODES.find((m) => m.id === id)!.title}</li>`).join('')}</ol>
      <button class="btn primary" id="start-workout">${doneToday ? 'Done for today. Go again' : 'Start workout'}</button>
    </div>
    <h2>All exercises</h2>
    <div class="list">${modesFor(pref)
      .map((m) => {
        const p = academy.progress[m.id];
        const due = isDue(p, today) && (p?.played ?? 0) > 0;
        return `<a class="tile mode-tile" href="#academy-${m.id}"><span class="tile-text">
          <span class="row-between"><b>${m.title}</b><span class="gold">Lv ${p?.level ?? 1}/${MAX_LEVEL}</span></span>
          <span class="gold small">${m.forWho}${due ? ' · due for review' : ''}</span>
          <span class="ink">${m.how}</span>
          <span>Why it works: ${m.why}</span></span></a>`;
      })
      .join('')}</div>`;
  on('[data-pref]', 'click', (el) => {
    updateStats((s) => ({ ...s, academy: { ...s.academy, pref: el.dataset.pref as LearningPreference } }));
    renderAcademy();
  });
  on('#start-workout', 'click', () => {
    workoutRun = { plan, step: 0 };
    location.hash = `academy-${plan[0]}`;
  });
}

interface RoundResult {
  accuracy: number;
  correct: number;
}

function renderAcademyMode(mode: AcademyMode) {
  const today = localDay(new Date());
  const progress = stats.academy.progress[mode] ?? newProgress(today);
  const level = progress.level;
  const run = workoutRun && workoutRun.plan[workoutRun.step] === mode ? workoutRun : null;
  const header = `<p class="muted center">${run ? `Workout ${run.step + 1}/${run.plan.length} · ` : ''}Level ${level}/${MAX_LEVEL}</p>`;
  const timers: ReturnType<typeof setTimeout>[] = [];
  cleanup = () => {
    timers.forEach(clearTimeout);
    try {
      speechSynthesis.cancel();
    } catch {
      // ignore
    }
  };
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

  const finish = (r: RoundResult) => {
    cleanup?.();
    const { progress: next, leveledUp } = recordRound(progress, r.accuracy, today);
    const xp = academyXp(r.correct, level);
    const before = levelInfo(stats.xp).level;
    const lastStep = run && run.step === run.plan.length - 1;
    const yesterday = localDay(new Date(Date.now() - 86400000));
    updateStats((s) => ({
      ...s,
      xp: s.xp + xp,
      academy: {
        ...s.academy,
        progress: { ...s.academy.progress, [mode]: next },
        ...(lastStep && s.academy.lastWorkoutDay !== today
          ? { lastWorkoutDay: today, streak: s.academy.lastWorkoutDay === yesterday ? s.academy.streak + 1 : 1 }
          : {}),
      },
    }));
    const after = levelInfo(stats.xp).level;
    const nextMode = run && run.step < run.plan.length - 1 ? run.plan[run.step + 1] : null;
    app.innerHTML = `<div class="panel center">
      <p class="big">${Math.round(r.accuracy * 100)}% accurate</p>
      ${leveledUp ? `<p class="milestone-text">★ Level up! Now level ${next.level}</p>` : `<p class="muted">${r.accuracy >= 0.9 ? 'Top level. Keep it sharp.' : 'Score 90% or more to level up.'}</p>`}
      <p class="muted">+${xp} XP${after > before ? ` · You're now player level ${after}!` : ''}</p>
      <p class="muted">Next review: ${next.due === today ? 'today' : next.due}</p>
      ${
        nextMode
          ? `<button class="btn primary" id="next-ex">Next: ${MODES.find((m) => m.id === nextMode)!.title}</button>`
          : `${run ? '<p class="milestone-text">Workout complete! See you tomorrow.</p>' : ''}
             <button class="btn secondary" id="again">Again</button><a class="btn ghost" href="#academy">Back to the Academy</a>`
      }</div>`;
    if (leveledUp) sfx('win');
    on('#next-ex', 'click', () => {
      workoutRun = { plan: run!.plan, step: run!.step + 1 };
      location.hash = `academy-${nextMode}`;
    });
    on('#again', 'click', () => renderAcademyMode(mode));
  };

  /** "What's the running count?" step with the full answer revealed afterwards. */
  const countAnswer = (cards: Card[]) => {
    const actual = cards.reduce((s, c) => s + tagOf(c), 0);
    let guess = 0;
    let checked = false;
    const draw = () => {
      const acc = guess === actual ? 1 : Math.abs(guess - actual) === 1 ? 0.5 : 0;
      app.innerHTML = `${header}<div class="panel">
        <p class="prompt">What's the running count?</p>
        <div class="stepper"><button class="btn ghost" id="minus" ${checked ? 'disabled' : ''}>−</button><span class="guess big">${sgn(guess)}</span><button class="btn ghost" id="plus" ${checked ? 'disabled' : ''}>+</button></div>
        ${
          !checked
            ? '<button class="btn primary" id="check">Check</button>'
            : `<p class="verdict ${acc === 1 ? 'good' : acc > 0 ? 'warnc' : 'bad'}">${acc === 1 ? '✓ Exactly right' : `${acc > 0 ? 'Close: ' : '✗ '}it was ${sgn(actual)}`}</p>
               <div class="card-row">${cards.map((c) => cardHtml(c, { size: 'sm', tag: true })).join('')}</div>
               <button class="btn primary" id="done">Finish</button>`
        }</div>`;
      on('#minus', 'click', () => ((guess--), draw()));
      on('#plus', 'click', () => ((guess++), draw()));
      on('#check', 'click', () => {
        checked = true;
        sfx(acc === 1 ? 'correct' : 'wrong');
        draw();
      });
      on('#done', 'click', () => finish({ accuracy: acc, correct: Math.round(acc * cards.length * 0.5) }));
    };
    draw();
  };

  /** Flash cards one at a time for the See and Hear modes. */
  const flashRun = (paint: (card: Card, i: number, running: number, total: number) => void, onCard?: (card: Card, i: number, running: number) => void) => {
    const cards = cardRun(roundLength('colorCount', level));
    let i = 0;
    let running = 0;
    const step = () => {
      if (i >= cards.length) return countAnswer(cards);
      running += tagOf(cards[i]);
      paint(cards[i], i, running, cards.length);
      onCard?.(cards[i], i, running);
      i++;
      later(step, flashMs(level));
    };
    step();
  };

  if (mode === 'colorCount') {
    const hints = visualHints(level);
    flashRun((card, i, running, total) => {
      const t = tagOf(card);
      app.innerHTML = `${header}<p class="muted center">Card ${i + 1}/${total} · Level ${level}: ${hints.glow ? 'color hints on' : 'no color hints'}</p>
        <div class="color-stage">
          ${hints.meter ? `<div class="meter" aria-label="Running count ${running}"><div class="meter-fill ${tagClass(running)}" style="height:${50 + Math.max(-10, Math.min(10, running)) * 5}%"></div><span>${sgn(running)}</span></div>` : ''}
          <div class="glow ${hints.glow ? tagClass(t) : ''}">${cardHtml(card, { size: 'lg', tag: hints.badge })}</div>
        </div>
        <p class="muted center">Green = +1 · Gray = 0 · Red = −1</p>`;
    });
  } else if (mode === 'soundCount') {
    const every = spokenEvery(level);
    const eyesFree = level >= 4;
    flashRun(
      (card, i, _running, total) => {
        app.innerHTML = `${header}<p class="muted center">Card ${i + 1}/${total} · ${every ? `Count spoken every ${every === 1 ? 'card' : `${every} cards`}` : 'No spoken count'}${eyesFree ? ' · Eyes-free' : ''}</p>
          <div class="flash">${cardHtml(eyesFree ? null : card, { size: 'lg' })}</div>
          <p class="muted center">High pip = +1 · Click = 0 · Low pip = −1. Turn your sound on.</p>`;
      },
      (card, i, running) => {
        unlockAudio();
        playSound(tagSound(tagOf(card)));
        if (every && (i + 1) % every === 0) later(() => say(spoken(running)), 250);
      },
    );
  } else if (mode === 'tagTap') {
    const cards = cardRun(roundLength('tagTap', level));
    const secs = tapSeconds(level);
    let i = 0;
    let right = 0;
    let combo = 0;
    let answered = false;
    const show = (flash = '') => {
      app.innerHTML = `${header}<div class="row-between muted"><span>${i + 1}/${cards.length}</span><span>${combo >= 3 ? `Combo ×${combo}` : `${secs.toFixed(1)}s per card`}</span></div>
        <div class="track"><div class="fill tap-clock" style="animation-duration:${secs}s"></div></div>
        <div class="flash stage ${flash}">${cardHtml(cards[i], { size: 'lg' })}</div>
        <div class="btn-row tag-buttons">${[-1, 0, 1].map((v) => `<button class="btn secondary tagb ${tagClass(v)}" data-tag="${v}">${tagSymbol(v)} ${sgn(v)}</button>`).join('')}</div>
        <p class="keys">Keys: ← or 1 = −1 · ↓ or 2 = 0 · → or 3 = +1</p>`;
      on('[data-tag]', 'click', (el) => answer(Number(el.dataset.tag)));
    };
    let timer: ReturnType<typeof setTimeout>;
    const answer = (v: number | null) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      const ok = v === tagOf(cards[i]);
      right += ok ? 1 : 0;
      combo = ok ? combo + 1 : 0;
      sfx(ok ? tagSound(tagOf(cards[i])) : 'wrong');
      show(ok ? 'ok' : 'no');
      later(() => {
        i++;
        if (i >= cards.length) return finish({ accuracy: right / cards.length, correct: right });
        start();
      }, 220);
    };
    const start = () => {
      answered = false;
      show();
      timer = setTimeout(() => answer(null), secs * 1000);
      timers.push(timer);
    };
    const keys = (e: KeyboardEvent) => {
      const map: Record<string, number> = { ArrowLeft: -1, '1': -1, ArrowDown: 0, '2': 0, ArrowRight: 1, '3': 1 };
      if (e.key in map) {
        e.preventDefault();
        answer(map[e.key]);
      }
    };
    document.addEventListener('keydown', keys);
    const baseCleanup = cleanup;
    cleanup = () => {
      baseCleanup();
      document.removeEventListener('keydown', keys);
    };
    start();
  } else if (mode === 'pairCancel') {
    const groups = cardGroups(level);
    let i = 0;
    let right = 0;
    let shown: { ok: boolean; value: number } | null = null;
    const draw = () => {
      const g = groups[i];
      app.innerHTML = `${header}<p class="muted center">Group ${i + 1}/${groups.length} · ${g.length === 2 ? 'Pairs' : `Groups of ${g.length}`}</p>
        <div class="card-row group ${shown ? (shown.ok ? 'ok' : 'no') : ''}">${g.map((c) => cardHtml(c, { size: 'md', tag: !!shown })).join('')}</div>
        ${shown && !shown.ok ? `<p class="verdict bad">That group is ${sgn(shown.value)}</p>` : ''}
        <div class="btn-row">${groupChoices(g.length).map((v) => `<button class="btn secondary" data-v="${v}">${sgn(v)}</button>`).join('')}</div>
        <p class="muted center">Tip: a high card and a low card cancel to 0. Count only what's left.</p>`;
      on('[data-v]', 'click', (el) => {
        if (shown) return;
        const value = groupValue(g);
        const ok = Number(el.dataset.v) === value;
        right += ok ? 1 : 0;
        sfx(ok ? 'correct' : 'wrong');
        shown = { ok, value };
        draw();
        later(
          () => {
            shown = null;
            i++;
            if (i >= groups.length) finish({ accuracy: right / groups.length, correct: right });
            else draw();
          },
          ok ? 350 : 1100,
        );
      });
    };
    draw();
  } else {
    const story = countStory(level);
    const oneAtATime = level >= 3;
    let line = oneAtATime ? 0 : story.lines.length - 1;
    const draw = () => {
      app.innerHTML = `${header}<p class="muted center">${oneAtATime ? 'One line at a time: keep the count as you read' : 'Read the round, then give the count'}</p>
        <div class="panel story">${story.lines.map((l, k) => (oneAtATime && k !== line ? '' : `<p>${esc(l)}</p>`)).join('')}</div>
        ${oneAtATime && line < story.lines.length - 1 ? '<button class="btn primary" id="next-line">Next line</button>' : '<button class="btn primary" id="have-count">I have the count</button>'}`;
      on('#next-line', 'click', () => ((line++), draw()));
      on('#have-count', 'click', () => countAnswer(story.cards));
    };
    draw();
  }
}

// ---------- Chart ----------

function renderChart() {
  const rules = settings.rules;
  const ups = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let tab: 'hard' | 'soft' | 'pairs' = 'hard';
  const legend: [Cell, string][] = [
    ['H', 'Hit'],
    ['S', 'Stand'],
    ['D', 'Double, otherwise hit'],
    ['Ds', 'Double, otherwise stand'],
    ['P', 'Split'],
    ['Rh', 'Surrender, otherwise hit'],
    ['Rs', 'Surrender, otherwise stand'],
    ['Rp', 'Surrender, otherwise split'],
  ];
  const draw = () => {
    let rows: { label: string; cells: Cell[] }[];
    if (tab === 'hard') {
      rows = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((t) => ({
        label: t === 8 ? '≤8' : t === 17 ? '17+' : String(t),
        cells: ups.map((u) => hardCell(t, u, rules)),
      }));
    } else if (tab === 'soft') {
      rows = [13, 14, 15, 16, 17, 18, 19, 20].map((t) => ({ label: `A,${t - 11}`, cells: ups.map((u) => softCell(t, u, rules)) }));
    } else {
      rows = [1, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((p) => {
        const n = p === 1 ? 'A' : String(p);
        return {
          label: `${n},${n}`,
          cells: ups.map((u) => pairCell(p, u, rules) ?? (p === 1 ? 'P' : p === 10 ? 'S' : hardCell(p * 2, u, rules))),
        };
      });
    }
    app.innerHTML = `
      <p class="muted">${rules.decks} deck${rules.decks > 1 ? 's' : ''}, dealer ${rules.dealerHitsSoft17 ? 'hits' : 'stands on'} soft 17, ${rules.doubleAfterSplit ? 'double after split' : 'no double after split'}${rules.lateSurrender ? ', late surrender' : ''}. Change rules in <a href="#settings">Settings</a>.</p>
      <div class="seg" id="tabs">${(['hard', 'soft', 'pairs'] as const).map((t) => `<button class="${t === tab ? 'on' : ''}" data-t="${t}" aria-pressed="${t === tab}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      <div class="chart-wrap"><table class="chart">
        <thead><tr><th scope="col">You</th>${ups.map((u) => `<th scope="col">${u === 11 ? 'A' : u}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr><th scope="row">${r.label}</th>${r.cells.map((c) => `<td class="c-${c[0]}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <ul class="legend">${legend
        .filter(([k]) => rules.lateSurrender || !k.startsWith('R'))
        .map(([k, v]) => `<li><span class="c-${k[0]}">${k}</span>${v}</li>`)
        .join('')}</ul>`;
    on('#tabs button', 'click', (el) => {
      tab = el.dataset.t as typeof tab;
      draw();
    });
  };
  draw();
}

// ---------- Settings ----------

function renderSettings() {
  let confirmReset = false;
  const toggle = (id: keyof Settings, label: string, hint: string) =>
    `<label class="toggle" for="${id}"><span><b>${label}</b><small>${hint}</small></span><input type="checkbox" id="${id}" ${settings[id] ? 'checked' : ''}></label>`;
  const ruleToggle = (id: keyof Rules, label: string) =>
    `<label class="toggle" for="rule-${id}"><span><b>${label}</b></span><input type="checkbox" id="rule-${id}" ${settings.rules[id] ? 'checked' : ''}></label>`;
  const seg = (id: string, opts: [string, number][], value: number) =>
    `<div class="seg" id="${id}">${opts.map(([l, v]) => `<button class="${v === value ? 'on' : ''}" data-v="${v}" aria-pressed="${v === value}">${l}</button>`).join('')}</div>`;

  const draw = () => {
    const r = settings.rules;
    app.innerHTML = `
      <h2>Coaching</h2>
      <div class="panel">
        ${toggle('showHints', 'Show hints', 'Highlight the best play before you act')}
        ${toggle('correctMistakes', 'Explain mistakes', 'After a wrong play, show the correct one and why')}
        ${toggle('showCount', 'Show the count', 'Display running count, decks left and true count at the table')}
        ${toggle('countQuizzes', 'Count pop quizzes', 'Sometimes ask for the running count between hands')}
        ${toggle('useDeviations', 'Count-based advice', 'Coach uses Hi-Lo index plays and insurance at +3')}
        ${toggle('soundEffects', 'Sound effects', 'Card, chip and win/lose sounds')}
        ${toggle('haptics', 'Haptics', 'Vibrate as your cards land and when you win (Android browsers)')}
        ${toggle('bigEffects', 'Big effects', 'Screen shake, chip bursts and score pop-ups')}
      </div>
      <h2>Accessibility</h2>
      <div class="panel">
        ${toggle('colorblind', 'Color-blind mode', 'Blue and orange instead of green and red. Count tags always show ▲ ● ▼ too.')}
        <button class="btn secondary" id="replay-tour">Replay the welcome tour</button>
      </div>
      <h2>The table</h2>
      <div class="panel">
        <span class="lbl">Hands you play</span>${seg('hands', [['1 hand', 1], ['2 hands', 2]], settings.yourHands)}
        ${toggle('otherPlayers', 'Other players', 'Players sit down and leave like a real casino table. Their cards count too.')}
      </div>
      <h2>Table rules</h2>
      <div class="panel">
        <span class="lbl">Decks</span>${seg('decks', [['1', 1], ['2', 2], ['6', 6], ['8', 8]], r.decks)}
        <span class="lbl">Blackjack pays</span>${seg('payout', [['3:2', 1.5], ['6:5', 1.2]], r.blackjackPayout)}
        ${ruleToggle('dealerHitsSoft17', 'Dealer hits soft 17')}
        ${ruleToggle('doubleAfterSplit', 'Double after split')}
        ${ruleToggle('lateSurrender', 'Late surrender')}
        <p class="muted small">The strategy chart and coach are tuned for multi-deck games. Changing rules starts a new shoe.</p>
      </div>
      <h2>Data</h2>
      <div class="panel">
        ${
          confirmReset
            ? `<p>This clears your stats, levels, unlocked tables, lesson progress and chips. You start again with 1,000 chips.</p><div class="btn-row"><button class="btn danger" id="reset-yes">Reset everything</button><button class="btn ghost" id="reset-no">Cancel</button></div>`
            : `<button class="btn danger" id="reset">Reset progress and chips</button>`
        }
      </div>
      <h2>About</h2>
      <p class="muted">Blackjack Coach is a training tool for entertainment and education. It uses play money only and offers no real-money gambling or prizes. Card counting is legal, but casinos may refuse service to players they suspect of counting. If gambling stops being fun, get help: in the US call 1-800-GAMBLER.</p>`;

    (['showHints', 'correctMistakes', 'showCount', 'countQuizzes', 'useDeviations', 'soundEffects', 'haptics', 'bigEffects', 'otherPlayers', 'colorblind'] as const).forEach((id) =>
      on(`#${id}`, 'change', (el) => {
        updateSettings({ [id]: (el as HTMLInputElement).checked });
        if (id === 'showCount') table.countVisible = settings.showCount;
        if (id === 'otherPlayers') applySeating();
        if (id === 'colorblind') applyTheme();
      }),
    );
    (['dealerHitsSoft17', 'doubleAfterSplit', 'lateSurrender'] as const).forEach((id) =>
      on(`#rule-${id}`, 'change', (el) => setRules({ [id]: (el as HTMLInputElement).checked })),
    );
    on('#hands button', 'click', (el) => {
      updateSettings({ yourHands: Number(el.dataset.v) });
      applySeating();
      draw();
    });
    on('#decks button', 'click', (el) => (setRules({ decks: Number(el.dataset.v) }), draw()));
    on('#payout button', 'click', (el) => (setRules({ blackjackPayout: Number(el.dataset.v) }), draw()));
    on('#reset', 'click', () => ((confirmReset = true), draw()));
    on('#replay-tour', 'click', () => {
      updateStats((s) => ({ ...s, onboarded: false }));
      location.hash = 'welcome';
    });
    on('#reset-no', 'click', () => ((confirmReset = false), draw()));
    on('#reset-yes', 'click', () => {
      stats = DEFAULT_STATS;
      updateSettings({ bankroll: STARTING_CHIPS, tableId: 'floor' });
      resetTable();
      confirmReset = false;
      draw();
    });
  };
  draw();
}

// ---------- Your leaks ----------

function renderLeaks() {
  const leaks = stats.leaks ?? emptyLeaks();
  const ranked = rankedCategories(leaks);
  if (ranked.length === 0) {
    app.innerHTML = `
      <div class="panel"><h2>Not enough hands yet</h2>
        <p>Every decision you make at the table and in the strategy drill is tracked here. After ${MIN_SAMPLE} decisions of a kind (stiff hands, soft hands, pairs and so on), you'll see how often you get it right and which spots trip you up.</p></div>
      <a class="btn primary" href="#tables">Play a few hands</a>
      <a class="btn secondary" href="#drill-strategy">Strategy drill</a>`;
    return;
  }
  const weakest = weakestDrillable(leaks);
  const missed = topMissedSpots(leaks);
  const pending = (Object.entries(leaks.byCategory) as [LeakCategory, Tally][]).filter(([, t]) => t.total < MIN_SAMPLE);
  const pct = (t: Tally) => Math.round(accuracy(t) * 100);
  app.innerHTML = `
    ${
      weakest
        ? `<div class="panel focus"><span class="eyebrow">Biggest leak</span><h2 class="plain">${CATEGORY_INFO[weakest].title}</h2>
            <p class="muted">${CATEGORY_INFO[weakest].example}</p><a class="btn primary" href="#drill-strategy-${weakest}">Drill my weakest spot</a></div>`
        : `<div class="panel focus"><h2 class="plain">No leaks found</h2><p class="muted">Every category you've played is at 100%. Keep it up.</p></div>`
    }
    <h2>By decision type</h2>
    <div class="panel">
      ${ranked
        .map(({ category, tally }) => {
          const p = pct(tally);
          const cls = p >= 90 ? 'good' : p >= 75 ? 'warn' : 'bad';
          return `<div class="leak" aria-label="${CATEGORY_INFO[category].title}: ${p} percent correct, ${tally.right} of ${tally.total}">
            <div class="leak-head"><b>${CATEGORY_INFO[category].title}</b><span class="${cls}">${p}% <small class="muted">(${tally.right}/${tally.total})</small></span></div>
            <div class="leak-track"><div class="leak-bar ${cls}" style="width:${p}%"></div></div>
            ${DRILLABLE.includes(category) && p < 100 ? `<a href="#drill-strategy-${category}" class="small">Drill this</a>` : ''}
          </div>`;
        })
        .join('')}
      ${pending.length ? `<p class="muted small">Still learning about you: ${pending.map(([c, t]) => `${CATEGORY_INFO[c].title} (${t.total}/${MIN_SAMPLE})`).join(', ')}.</p>` : ''}
    </div>
    ${
      missed.length
        ? `<h2>Spots you miss most</h2><div class="panel">${missed
            .map(
              (m) => `<div class="spot"><span><b>${esc(m.label)}</b><small class="muted">${describeBest(m)}</small></span><span class="bad">✗ ${m.total - m.right}/${m.total}</span></div>`,
            )
            .join('')}</div>`
        : ''
    }
    <p class="muted small">Graded against basic strategy for your table rules. Insurance is graded at the table only.</p>`;
}

// ---------- Welcome tour ----------

function renderWelcome() {
  type Stage = { kind: 'intro' } | { kind: 'hand'; index: number } | { kind: 'finish' };
  let stage: Stage = { kind: 'intro' };
  let game: GameState | null = null;
  let step = 0;
  let sched: DealSchedule | null = null;
  let settled = true;
  let seen: Card[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const done = (to = 'home') => {
    updateStats((s) => ({ ...s, onboarded: true }));
    location.hash = to;
  };

  const commit = (prev: GameState, next: GameState) => {
    unlockAudio();
    timers.forEach(clearTimeout);
    clearFanfare();
    const s = dealSchedule(prev, next, reducedMotionPref() ? 0 : DEAL_STEP_MS);
    if (settings.soundEffects) for (const sound of s.sounds) timers.push(setTimeout(() => playSound(sound.name), sound.at));
    for (const h of hapticSchedule(next, s, reducedMotionPref() ? 0 : DEAL_STEP_MS)) timers.push(setTimeout(() => vibrate(h.kind), h.at));
    game = next;
    sched = s;
    settled = false;
    draw();
    timers.push(
      setTimeout(() => {
        settled = true;
        if (next.phase === 'roundOver') seen = [...seen, ...next.hands.flatMap((h) => h.cards), ...next.dealer];
        draw();
        const f = roundFanfare(next);
        if (f) playFanfare(f, app.querySelector('.felt'), settings.bigEffects);
      }, s.doneAt),
    );
  };
  const dealHand = (index: number) => {
    const fresh = tutorialGame(TUTORIAL[index], 100);
    stage = { kind: 'hand', index };
    step = 0;
    commit(fresh, startRound(fresh, TUTORIAL_BET));
  };

  const skip = '<p class="center"><a href="#home" id="skip" class="small">Skip the tour</a></p>';
  const draw = () => {
    if (stage.kind === 'intro') {
      titleEl.textContent = 'Welcome';
      app.innerHTML = `
        <section class="hero">
          <div class="hero-cards">${cardHtml({ rank: 'A', suit: '♠' }, { size: 'sm' })}${cardHtml({ rank: 'K', suit: '♥' }, { size: 'sm' })}</div>
          <h1>Welcome to Blackjack Coach</h1>
        </section>
        <div class="panel"><p>Let's play two quick practice hands together. I'll tell you exactly what to do and why.</p>
          <p class="muted">Takes about a minute. Practice chips only: your real stack of $${formatChips(STARTING_CHIPS)} is waiting for you after.</p></div>
        <button class="btn primary" id="start">Let's play</button>${skip}`;
      on('#start', 'click', () => dealHand(0));
    } else if (stage.kind === 'finish') {
      titleEl.textContent = 'Nice playing!';
      const rc = runningCount(seen);
      app.innerHTML = `
        <h1>Two hands, two wins</h1>
        <p>You already know the heart of the game: stand when the dealer is likely to bust, hit when you can't.</p>
        <div class="panel">
          <h2>Your first look at counting</h2>
          <p>Card counters give every card a tag: low cards (2–6) are +1, 7–9 are 0, and 10s and Aces are −1. Here are the cards from your two hands:</p>
          <div class="seen-cards">${seen.map((c) => cardHtml(c, { size: 'sm', tag: true })).join('')}</div>
          <p class="rc-big">Running count: ${signed(rc)}</p>
          <p class="muted">${
            rc > 0
              ? 'Positive means more low cards than high ones have gone, so the cards left are rich in 10s and Aces. That favors you, so counters bet more.'
              : 'Negative means lots of 10s and Aces have gone, which is bad news for you. When the count is high, counters bet more.'
          } The Counting Academy teaches you to keep this count in your head.</p>
        </div>
        <button class="btn primary" data-go="learn">Start the lessons</button>
        <button class="btn secondary" data-go="tables">Go to the casino floor</button>
        <button class="btn secondary" data-go="academy">Learn to count</button>
        <p class="center"><a href="#home" id="skip" class="small">Home</a></p>`;
      on('[data-go]', 'click', (el) => done(el.dataset.go));
    } else {
      const hand = TUTORIAL[stage.index];
      const g = game!;
      titleEl.textContent = `Practice hand ${stage.index + 1} of ${TUTORIAL.length}`;
      const coachStep = g.phase === 'playing' ? hand.steps[step] : undefined;
      const over = g.phase === 'roundOver';
      const last = stage.index === TUTORIAL.length - 1;
      const anim = settled ? null : sched;
      const inSchedule = (seat: 'dealer' | number) => (i: number) =>
        anim?.cards.some((c) => c.seat === seat && c.index === i) ? cardDelay(anim, seat, i) : undefined;
      app.innerHTML = `
        <h2 class="center">${hand.title}</h2>
        <div class="felt tour">
          ${handHtml(g.dealer, { label: 'Dealer', size: 'sm', hideHole: !g.holeRevealed, dealAt: inSchedule('dealer'), flipAt: anim?.holeFlipAt ?? undefined, settling: !settled && g.holeRevealed })}
          ${handHtml(g.hands[0].cards, { label: 'You', active: g.phase === 'playing', result: g.hands[0].outcome === 'win' ? 'Win' : `$${TUTORIAL_BET}`, dealAt: inSchedule(0), settling: !settled })}
        </div>
        ${settled ? `<div class="coach"><span class="eyebrow">Coach</span><p>${esc(over ? hand.outro : coachStep?.say ?? hand.intro)}</p></div>` : ''}
        ${
          settled && coachStep
            ? `<div class="btn-row actions">${(['hit', 'stand', 'double'] as Action[])
                .map((a) => `<button class="btn ${a === coachStep.action ? 'primary pulse' : 'secondary'}" data-a="${a}" ${a === coachStep.action ? '' : 'disabled'}>${ACTION_LABEL[a]}</button>`)
                .join('')}</div>`
            : ''
        }
        ${settled && over ? `<button class="btn primary" id="next">${last ? 'See what counters see' : 'Next hand'}</button>` : ''}
        ${skip}`;
      on('[data-a]', 'click', (el) => {
        if (settings.soundEffects) playSound('correct');
        step++;
        commit(g, act(g, el.dataset.a as Action));
      });
      on('#next', 'click', () => (last ? ((stage = { kind: 'finish' }), draw()) : dealHand(stage.kind === 'hand' ? stage.index + 1 : 0)));
    }
    on('#skip', 'click', (_el, e) => {
      e.preventDefault();
      done();
    });
  };
  cleanup = () => {
    timers.forEach(clearTimeout);
    clearFanfare();
  };
  draw();
}

function setRules(patch: Partial<Rules>) {
  updateSettings({ rules: { ...settings.rules, ...patch } });
  resetTable();
}

enableCardTilt(app);
navigate();
