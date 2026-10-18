// Asks for a store rating after a happy moment, when engine/review says it's time.
import * as StoreReview from 'expo-store-review';
import { useCallback, useRef } from 'react';
import { localDay } from '../engine/progression';
import { recordReviewAsk, shouldAskForReview } from '../engine/review';
import { useSettings } from '../state/settings';

/** Lets the moment's own celebration play first. */
const DELAY_MS = 1500;

export function useReviewPrompt() {
  const { stats, updateStats } = useSettings();
  const asking = useRef(false);
  return useCallback(() => {
    const today = localDay(new Date());
    if (asking.current || !shouldAskForReview(stats, today)) return;
    asking.current = true;
    setTimeout(async () => {
      try {
        // False on web, and in TestFlight builds on iOS: those don't use up an ask.
        if (!(await StoreReview.isAvailableAsync())) return;
        await StoreReview.requestReview();
        updateStats((s) => ({ ...s, review: recordReviewAsk(s.review, today) }));
      } catch {
        // No prompt this time; try again at the next happy moment.
      } finally {
        asking.current = false;
      }
    }, DELAY_MS);
  }, [stats, updateStats]);
}
