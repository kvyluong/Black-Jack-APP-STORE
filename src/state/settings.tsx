import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { BonusClaims, STARTING_CHIPS } from '../engine/progression';
import { DEFAULT_RULES, Rules } from '../engine/rules';

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
  /** How many seats you play at the practice table (1 or 2). */
  yourHands: number;
  /** Computer players who come and go at the practice table. */
  otherPlayers: boolean;
  /** Your chips. They start at STARTING_CHIPS and carry over between sessions. */
  bankroll: number;
  /** The casino table you're sitting at (see TABLES in engine/progression). */
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

interface Store {
  ready: boolean;
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

  const value = useMemo(
    () => ({ ready, settings, stats, updateSettings, updateRules, addChips, updateStats, resetProgress }),
    [ready, settings, stats, updateSettings, updateRules, addChips, updateStats, resetProgress],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useSettings must be used inside SettingsProvider');
  return store;
}
