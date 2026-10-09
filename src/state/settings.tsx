import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getLocales } from 'expo-localization';

import { AcademyMode, LearningPreference, ModeProgress } from '../engine/academy';
import { CountingSystem, setCountingSystem } from '../engine/counting';
import { LeakStats, emptyLeaks } from '../engine/leaks';
import { GoalsState, HistoryPoint, emptyGoals } from '../engine/progress';
import {
  CountRecords,
  DeckEstimateRecords,
  DeviationProgress,
  ExamResult,
  Tally,
  emptyCountRecords,
  emptyDeckEstimates,
  emptyDeviationProgress,
  emptyTally,
} from '../engine/records';
import { BonusClaims, STARTING_CHIPS } from '../engine/progression';
import { DEFAULT_RULES, Rules } from '../engine/rules';
import { Lang, LanguageSetting, resolveLang, setLang } from '../i18n/lang';

export interface Stats {
  handsPlayed: number;
  decisions: number;
  correctDecisions: number;
  countDrillsPassed: number;
  bestStrategyStreak: number;
  lessonsCompleted: string[];
  /** Experience from hands played and correct decisions; sets your level. */
  xp: number;
  /** Most chips you've ever had; unlocks tables. */
  peakChips: number;
  biggestWin: number;
  refills: number;
  /** Rewarded-ad bonus claims today (resets daily). */
  bonusClaims?: BonusClaims;
  bonusChipsEarned: number;
  /** Which decisions you get right and wrong, by kind and by exact spot. */
  leaks: LeakStats;
  /** Finished (or skipped) the guided first hand. */
  onboarded: boolean;
  /** Counting Academy: chosen learning preference and per-mode progress. */
  academy: {
    pref?: LearningPreference;
    progress: Partial<Record<AcademyMode, ModeProgress>>;
    /** Days in a row with a finished daily workout. */
    streak: number;
    lastWorkoutDay?: string;
  };
  /** Running count drill records (full decks counted exactly, best time). */
  countRecords: CountRecords;
  /** True count conversion drill answers. */
  trueCountDrill: Tally;
  /** Count-play trainer flash cards (spaced review). */
  deviations: DeviationProgress;
  /** Casino-conditions tests, newest last (kept to the last 20). */
  exams: ExamResult[];
  /** Deck estimation drill answers. */
  deckEstimates: DeckEstimateRecords;
  /** Daily goals and their streak. */
  goals: GoalsState;
  /** One point per day you used the app, for progress charts (kept to ~1 year). */
  history: HistoryPoint[];
}

export interface Settings {
  rules: Rules;
  /** Show the recommended play before the player acts. */
  showHints: boolean;
  /** Flag mistakes after the player acts. */
  correctMistakes: boolean;
  /** Show the running and true count on the table. */
  showCount: boolean;
  /** Periodically quiz the player on the running count during play. */
  countQuizzes: boolean;
  /** Apply Hi-Lo index plays in coaching advice. */
  useDeviations: boolean;
  /** Card, chip and result sound effects. */
  soundEffects: boolean;
  /** Screen shake, chip bursts and pop-ups. */
  bigEffects: boolean;
  /** Vibration as your cards land and when you win. */
  haptics: boolean;
  /** Blue/orange instead of green/red for count tags and results. */
  colorblind: boolean;
  /** How many seats you play at the practice table (1 or 2). */
  yourHands: number;
  /** Computer players who come and go at the practice table. */
  otherPlayers: boolean;
  /** Your chips. They start at STARTING_CHIPS and carry over between sessions. */
  bankroll: number;
  /** The casino table you're sitting at (see TABLES in engine/progression). */
  tableId: string;
  /** Bought "Remove ads": no banner or between-hand ads. Kept on reset (it was paid for). */
  adsRemoved: boolean;
  /** App language; "system" follows the phone. */
  language: LanguageSetting;
  /** Card counting system used by the count display, drills and Academy. */
  countingSystem: CountingSystem;
  /** Play at the table with casino hand signals: tap the felt to hit, swipe sideways to stand. */
  handSignals: boolean;
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
  colorblind: false,
  yourHands: 2,
  otherPlayers: true,
  bankroll: STARTING_CHIPS,
  adsRemoved: false,
  language: 'system',
  countingSystem: 'hiLo',
  handSignals: false,
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
  academy: { progress: {}, streak: 0 },
  leaks: emptyLeaks(),
  onboarded: false,
  countRecords: emptyCountRecords(),
  trueCountDrill: emptyTally(),
  deviations: emptyDeviationProgress(),
  exams: [],
  deckEstimates: emptyDeckEstimates(),
  goals: emptyGoals(),
  history: [],
};

// Kept from the app's first name (Blackjack Coach) so saved progress carries over.
const STORAGE_KEY = 'blackjack-coach/v1';

interface Store {
  ready: boolean;
  /** The language in use right now (resolved from the setting and the phone's language). */
  lang: Lang;
  settings: Settings;
  stats: Stats;
  updateSettings: (patch: Partial<Settings>) => void;
  updateRules: (patch: Partial<Rules>) => void;
  /** Adds chips to your current balance (e.g. a rewarded-ad bonus). */
  addChips: (amount: number) => void;
  updateStats: (fn: (s: Stats) => Stats) => void;
  resetProgress: () => void;
}

const Ctx = createContext<Store | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setSettings({ ...DEFAULT_SETTINGS, ...saved.settings, rules: { ...DEFAULT_RULES, ...saved.settings?.rules } });
        setStats({ ...DEFAULT_STATS, ...saved.stats });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, stats })).catch(() => {});
  }, [ready, settings, stats]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const updateRules = useCallback(
    (patch: Partial<Rules>) => setSettings((s) => ({ ...s, rules: { ...s.rules, ...patch } })),
    [],
  );
  const addChips = useCallback((amount: number) => setSettings((s) => ({ ...s, bankroll: s.bankroll + amount })), []);
  const updateStats = useCallback((fn: (s: Stats) => Stats) => setStats(fn), []);
  const resetProgress = useCallback(() => {
    setStats(DEFAULT_STATS);
    setSettings((s) => ({ ...s, bankroll: STARTING_CHIPS, tableId: 'floor' }));
  }, []);

  // Text everywhere (including the engine) reads the current language; set it before children render.
  const lang: Lang = resolveLang(settings.language, deviceLanguage());
  setLang(lang);
  setCountingSystem(settings.countingSystem);

  const value = useMemo(
    () => ({ ready, lang, settings, stats, updateSettings, updateRules, addChips, updateStats, resetProgress }),
    [ready, lang, settings, stats, updateSettings, updateRules, addChips, updateStats, resetProgress],
  );
  // Until saved settings load, render nothing (the splash screen is still up), so the
  // first frame is already in the right language with the right chips.
  return <Ctx.Provider value={value}>{ready ? children : null}</Ctx.Provider>;
}

function deviceLanguage(): string | null {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

export function useSettings(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useSettings must be used inside SettingsProvider');
  return store;
}
