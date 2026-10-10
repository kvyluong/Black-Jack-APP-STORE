// Which features the player has unlocked, which are new, and how to unlock the rest.
import { getLessons } from '../content/lessons';
import { Feature, isUnlocked, newFeatures, unlockHint } from '../engine/unlocks';
import { useSettings } from '../state/settings';

export function useUnlocks() {
  const { stats, settings, updateStats } = useSettings();
  const input = { lessonsCompleted: stats.lessonsCompleted, handsPlayed: stats.handsPlayed, experienced: settings.experienced };
  const seen = stats.seenFeatures ?? [];
  // Players who said they already know how to play get everything at once, without a wall of "New" badges.
  const fresh = settings.experienced ? [] : newFeatures(input, seen);
  const lessonNumber = (id: string) => getLessons().findIndex((l) => l.id === id) + 1;
  return {
    has: (f: Feature) => isUnlocked(f, input),
    isNew: (f: Feature) => fresh.includes(f),
    newOnes: fresh,
    hint: (f: Feature) => unlockHint(f, lessonNumber),
    /** Clears the "New" badge once the feature is opened. */
    markSeen: (f: Feature) => {
      if (!fresh.includes(f)) return;
      updateStats((s) => ({ ...s, seenFeatures: [...(s.seenFeatures ?? []), f] }));
    },
  };
}
