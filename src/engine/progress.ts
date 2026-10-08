// Road to the Casino: daily goals, progress history and the casino-ready score.
// (Being built; these types are saved in Stats.)

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
}

export const emptyGoals = (): GoalsState => ({ day: null, start: null, claimed: [], streak: 0, lastCompleteDay: null });

/** One day's totals, for the progress charts. */
export interface HistoryPoint {
  day: string;
  values: Record<string, number>;
}
