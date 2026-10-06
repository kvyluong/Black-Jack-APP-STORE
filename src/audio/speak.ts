import * as Speech from 'expo-speech';

import { tr } from '../i18n/lang';

/** Says a short phrase out loud (used by the listening drill), in the app's language. Never throws. */
export function speak(text: string) {
  try {
    Speech.stop().catch(() => {});
    Speech.speak(text, { rate: 1.05, language: tr('en-US', 'es-MX') });
  } catch {
    // Speech unavailable on this device: the drill still works with sounds.
  }
}

export function stopSpeaking() {
  Speech.stop().catch(() => {});
}

/** How a count reads aloud: "plus 3", "minus 1", "zero" (Spanish: "más 3", "menos 1", "cero"). */
export function spokenCount(n: number): string {
  if (n === 0) return tr('zero', 'cero');
  return `${n > 0 ? tr('plus', 'más') : tr('minus', 'menos')} ${Math.abs(n)}`;
}
