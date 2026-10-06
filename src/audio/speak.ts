import * as Speech from 'expo-speech';

/** Says a short phrase out loud (used by the listening drill). Never throws. */
export function speak(text: string) {
  try {
    Speech.stop().catch(() => {});
    Speech.speak(text, { rate: 1.05 });
  } catch {
    // Speech unavailable on this device: the drill still works with sounds.
  }
}

export function stopSpeaking() {
  Speech.stop().catch(() => {});
}

/** How a count reads aloud: "plus three", "minus one", "zero". */
export function spokenCount(n: number): string {
  return n === 0 ? 'zero' : `${n > 0 ? 'plus' : 'minus'} ${Math.abs(n)}`;
}
