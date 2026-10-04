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
import { DEAL_STEP_MS, DealSchedule, cardDelay, dealSchedule } from '../src/engine/dealSchedule';
import { countDrillCards, strategyQuestion, trueCountQuestion } from '../src/engine/drills';
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
  yourHands: number;
  otherPlayers: boolean;
  bankroll: number;
  tableId: string;
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
  yourHands: 2,
  otherPlayers: true,
  bankroll: STARTING_CHIPS,
  tableId: 'floor',
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
    ? `<span class="tag ${t > 0 ? 'plus' : t < 0 ? 'minus' : ''}">${t > 0 ? '+1' : t < 0 ? '−1' : '0'}</span>`
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
    'drill-strategy': { title: 'Strategy Drill', back: 'drills', render: renderStrategyDrill },
    'drill-count': { title: 'Running Count Drill', back: 'drills', render: renderCountDrill },
    'drill-true-count': { title: 'True Count Drill', back: 'drills', render: renderTrueCountDrill },
    chart: { title: 'Strategy Chart', back: 'home', render: renderChart },
    settings: { title: 'Settings', back: 'home', render: renderSettings },
  };
  return views[hash] ?? views.home;
}

function navigate() {
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
// Warm up audio on the first interaction so the first deal isn't silent.
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// ---------- Home ----------

function renderHome() {
  const accuracy = stats.decisions ? `${Math.round((stats.correctDecisions / stats.decisions) * 100)}%` : '—';
  const tiles = [
    ['learn', 'Learn', 'Step-by-step lessons from the rules to card counting', '01'],
    ['tables', 'Casino Floor', 'Play with a coach. Win chips to unlock bigger tables', '02'],
    ['drills', 'Drills', 'Basic strategy, running count and true count drills', '03'],
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
  }
  afterChange(act(table.game, action));
}

function insurance(take: boolean) {
  const tc = currentTrueCount(table.game);
  const best = settings.useDeviations && shouldTakeInsurance(tc);
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

function renderStrategyDrill() {
  let q = strategyQuestion();
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
      }));
      draw();
    }
  };
  const next = () => {
    picked = null;
    q = strategyQuestion();
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
        ${toggle('bigEffects', 'Big effects', 'Screen shake, chip bursts and score pop-ups')}
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

    (['showHints', 'correctMistakes', 'showCount', 'countQuizzes', 'useDeviations', 'soundEffects', 'bigEffects', 'otherPlayers'] as const).forEach((id) =>
      on(`#${id}`, 'change', (el) => {
        updateSettings({ [id]: (el as HTMLInputElement).checked });
        if (id === 'showCount') table.countVisible = settings.showCount;
        if (id === 'otherPlayers') applySeating();
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

function setRules(patch: Partial<Rules>) {
  updateSettings({ rules: { ...settings.rules, ...patch } });
  resetTable();
}

enableCardTilt(app);
navigate();
