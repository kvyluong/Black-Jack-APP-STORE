export const colors = {
  felt: '#0B5D3B',
  feltDark: '#073F28',
  feltLight: '#127A4F',
  panel: 'rgba(0,0,0,0.25)',
  gold: '#E8C547',
  text: '#F4F1E8',
  muted: '#B7C9BE',
  card: '#FFFFFF',
  cardBack: '#8E1B2C',
  black: '#1A1A1A',
  red: '#C8323C',
  good: '#4ADE80',
  bad: '#FF7A7A',
  warn: '#FBBF24',
};

export const spacing = (n: number) => n * 8;

export const radius = { sm: 6, md: 12, lg: 20 };

/** Color-blind-safe pair used instead of green/red when the setting is on. */
export const colorblindColors = { good: '#4C9AFF', bad: '#FFB020' };

/**
 * Brighter tints for level-two tags (±2, Omega II): higher contrast on the felt,
 * always paired with a doubled symbol so the size never depends on color alone.
 */
const strongTag = { good: '#9BF5BA', bad: '#FFB0B0' };
const strongTagColorblind = { good: '#9CC8FF', bad: '#FFD27A' };

/** Shape for a count tag, so it never depends on color alone: ▲▲ +2, ▲ +1, ● 0, ▼ −1, ▼▼ −2. */
export const tagSymbol = (t: number) => (t >= 2 ? '▲▲' : t > 0 ? '▲' : t <= -2 ? '▼▼' : t < 0 ? '▼' : '●');

export function tagColor(t: number, colorblind: boolean): string {
  if (t === 0) return colors.muted;
  const pair = Math.abs(t) >= 2 ? (colorblind ? strongTagColorblind : strongTag) : colorblind ? colorblindColors : colors;
  return t > 0 ? pair.good : pair.bad;
}

/** "▲▲ +2", "▲ +1", "● 0", "▼ −1", "▼▼ −2". */
export const tagText = (t: number) => `${tagSymbol(t)} ${t > 0 ? `+${t}` : t < 0 ? `−${-t}` : '0'}`;
