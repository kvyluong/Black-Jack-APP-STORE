import { useSettings } from '../state/settings';
import { colorblindColors, colors } from '../theme';

/** Good/bad colors, swapped to blue/orange when the color-blind setting is on. */
export function useOutcomeColors(): { good: string; bad: string; colorblind: boolean } {
  const { settings } = useSettings();
  const pair = settings.colorblind ? colorblindColors : colors;
  return { good: pair.good, bad: pair.bad, colorblind: settings.colorblind };
}
