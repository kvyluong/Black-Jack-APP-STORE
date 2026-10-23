// Suds stickmen: big round heads, line-drawn limbs and very expressive faces, in the Suds house look
// (boiling lines, misprinted color, sticker borders, foam). Original characters.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SUDS } from './Suds';

export const W = 1920;
export const H = 1080;
export const LOOP = 90;
const INK = SUDS.ink;

type Pt = [number, number];
const jit = (f: number, seed: number, i: number, amt = 2.6): Pt => {
  const k = Math.floor(f / 3) * 7.13 + seed;
  return [Math.sin(k + i * 1.9) * amt, Math.cos(k * 1.3 + i * 2.7) * amt];
};
/** A boiling open polyline (limbs, mouths, brows). */
const line = (pts: Pt[], f: number, seed: number, amt = 2.2) =>
  pts.map(([x, y], i) => { const [dx, dy] = jit(f, seed, i, amt); return `${i ? 'L' : 'M'}${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`; }).join(' ');
/** A boiling circle. */
const blob = (cx: number, cy: number, r: number, f: number, seed: number, n = 22) =>
  line(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)] as Pt), f, seed, 2.4) + ' Z';

export type Hair = 'spiky' | 'swoop' | 'buzz' | 'beanie' | 'messy' | 'bald' | 'bun' | 'cap' | 'beret' | 'long';
export type Mood = 'smug' | 'shock' | 'rage' | 'cry' | 'scheme' | 'downbad' | 'galaxy' | 'dead' | 'happy';

const Stroke = ({ d, w = 6, c = INK }: { d: string; w?: number; c?: string }) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);

/** The face, drawn on a head centred at (0,0) with radius 70. */
const Face = ({ mood, f, seed }: { mood: Mood; f: number; seed: number }) => {
  const blink = (f + seed * 17) % 80 < 4 && !['dead', 'galaxy', 'shock'].includes(mood);
  const L = -26, R = 26, Y = -6;
  const eye = (x: number, r = 13, pupil = 6, look: Pt = [0, 0]) => blink ? <Stroke d={line([[x - 11, Y], [x + 11, Y]], f, seed + x)} w={5} /> : (
    <g key={x}>
      <circle cx={x} cy={Y} r={r} fill="#fff" stroke={INK} strokeWidth={4.5} />
      <circle cx={x + look[0]} cy={Y + look[1]} r={pupil} fill={INK} />
      <circle cx={x + look[0] + 2} cy={Y + look[1] - 2} r={2} fill="#fff" />
    </g>
  );
  switch (mood) {
    case 'happy':
      return <g>{eye(L)}{eye(R)}<Stroke d={line([[-22, 26], [-8, 38], [8, 38], [22, 26]], f, seed + 1)} /></g>;
    case 'smug':
      return <g>
        <Stroke d={line([[L - 14, Y - 14], [L + 12, Y - 10]], f, seed + 2)} />
        <Stroke d={line([[R - 12, Y - 22], [R + 14, Y - 16]], f, seed + 3)} />
        {blink ? null : <><path d={`M${L - 13} ${Y} a13 13 0 0 0 26 0 Z`} fill="#fff" stroke={INK} strokeWidth={4.5} /><circle cx={L + 3} cy={Y + 4} r={5} fill={INK} /><path d={`M${R - 13} ${Y} a13 13 0 0 0 26 0 Z`} fill="#fff" stroke={INK} strokeWidth={4.5} /><circle cx={R + 3} cy={Y + 4} r={5} fill={INK} /></>}
        <Stroke d={line([[-18, 30], [4, 34], [24, 22]], f, seed + 4)} />
      </g>;
    case 'shock':
      return <g>
        <Stroke d={line([[L - 12, Y - 28], [L + 10, Y - 32]], f, seed + 5)} />
        <Stroke d={line([[R - 10, Y - 32], [R + 12, Y - 28]], f, seed + 6)} />
        {eye(L, 16, 4)}{eye(R, 16, 4)}
        <ellipse cx={0} cy={36} rx={13} ry={18} fill={INK} />
        <Stroke d={line([[56, -46], [60, -26]], f, seed + 7)} w={5} c={SUDS.blue} />
      </g>;
    case 'rage':
      return <g>
        <Stroke d={line([[L - 14, Y - 22], [L + 12, Y - 8]], f, seed + 8)} w={7} />
        <Stroke d={line([[R + 14, Y - 22], [R - 12, Y - 8]], f, seed + 9)} w={7} />
        {eye(L, 11, 7)}{eye(R, 11, 7)}
        <path d="M-24 28 h48 v14 h-48 Z" fill="#fff" stroke={INK} strokeWidth={4.5} />
        <Stroke d="M-12 28 v14 M0 28 v14 M12 28 v14" w={3} />
        <Stroke d={line([[40, -54], [52, -40], [62, -54]], f, seed + 10)} w={5} c={SUDS.pink} />
      </g>;
    case 'cry':
      return <g>
        <Stroke d={line([[L - 12, Y - 12], [L + 12, Y - 20]], f, seed + 11)} />
        <Stroke d={line([[R - 12, Y - 20], [R + 12, Y - 12]], f, seed + 12)} />
        <Stroke d={line([[L - 11, Y], [L, Y - 7], [L + 11, Y]], f, seed + 13)} w={5} />
        <Stroke d={line([[R - 11, Y], [R, Y - 7], [R + 11, Y]], f, seed + 14)} w={5} />
        {[L, R].map((x) => <path key={x} d={`M${x} ${Y + 6} q-6 ${20 + (f % 20)} 0 ${30 + (f % 20)} q6 -10 0 -${30 + (f % 20)}`} fill={SUDS.blue} stroke={INK} strokeWidth={3} />)}
        <Stroke d={line([[-20, 36], [-6, 26], [8, 26], [20, 36]], f, seed + 15)} />
      </g>;
    case 'scheme':
      return <g>
        <Stroke d={line([[L - 14, Y - 16], [L + 12, Y - 6]], f, seed + 16)} />
        <Stroke d={line([[R + 14, Y - 16], [R - 12, Y - 6]], f, seed + 17)} />
        <path d={`M${L - 12} ${Y + 2} q12 -10 24 0 q-12 6 -24 0 Z`} fill="#fff" stroke={INK} strokeWidth={4} /><circle cx={L + 4} cy={Y + 1} r={4} fill={INK} />
        <path d={`M${R - 12} ${Y + 2} q12 -10 24 0 q-12 6 -24 0 Z`} fill="#fff" stroke={INK} strokeWidth={4} /><circle cx={R + 4} cy={Y + 1} r={4} fill={INK} />
        <path d="M-26 22 q26 26 52 0 Z" fill="#fff" stroke={INK} strokeWidth={4.5} />
        <Stroke d="M-14 24 v8 M0 25 v10 M14 24 v8" w={3} />
      </g>;
    case 'downbad':
      return <g>
        <Stroke d={line([[L - 12, Y - 10], [L + 12, Y - 18]], f, seed + 18)} />
        <Stroke d={line([[R - 12, Y - 18], [R + 12, Y - 10]], f, seed + 19)} />
        <path d={`M${L - 13} ${Y + 2} a13 13 0 0 0 26 0`} fill="#fff" stroke={INK} strokeWidth={4.5} /><circle cx={L} cy={Y + 8} r={4.5} fill={INK} />
        <path d={`M${R - 13} ${Y + 2} a13 13 0 0 0 26 0`} fill="#fff" stroke={INK} strokeWidth={4.5} /><circle cx={R} cy={Y + 8} r={4.5} fill={INK} />
        <Stroke d={line([[L - 6, Y + 22], [L - 4, Y + 30]], f, seed + 20)} w={3} />
        <Stroke d={line([[-14, 36], [0, 30], [14, 36]], f, seed + 21)} />
        <Stroke d={line([[-58, -60], [-58, -40], [-52, -48]], f, seed + 22)} w={5} c={SUDS.blue} />
      </g>;
    case 'galaxy': {
      const spin = (f * 6) % 360;
      return <g>
        {[L, R].map((x) => (
          <g key={x} transform={`rotate(${spin} ${x} ${Y})`}>
            <circle cx={x} cy={Y} r={15} fill={SUDS.ink} />
            <path d={`M${x} ${Y} m-10 0 a10 10 0 1 1 10 10 a6 6 0 1 1 -6 -6`} fill="none" stroke={SUDS.pink} strokeWidth={3} />
            <circle cx={x + 6} cy={Y - 6} r={2} fill={SUDS.yellow} />
          </g>
        ))}
        <path d="M-24 26 q24 22 48 0" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        {[0, 1, 2].map((i) => <circle key={i} cx={-40 + i * 40} cy={-74 - Math.abs(Math.sin(f / 8 + i)) * 10} r={4} fill={SUDS.yellow} stroke={INK} strokeWidth={2} />)}
      </g>;
    }
    case 'dead':
      return <g>
        {[L, R].map((x) => <Stroke key={x} d={`M${x - 10} ${Y - 10} L${x + 10} ${Y + 10} M${x + 10} ${Y - 10} L${x - 10} ${Y + 10}`} w={6} />)}
        <Stroke d={line([[-20, 32], [20, 32]], f, seed + 23)} />
        <path d="M6 32 q6 18 14 0" fill={SUDS.pink} stroke={INK} strokeWidth={4} />
      </g>;
  }
};

/** Body poses: arm and leg lines relative to the hips at (0, 120). */
const POSES: Record<Mood, { arms: [Pt[], Pt[]]; legs: [Pt[], Pt[]] }> = {
  happy: { arms: [[[0, 90], [-36, 120], [-50, 150]], [[0, 90], [36, 120], [50, 150]]], legs: [[[0, 170], [-24, 220], [-30, 260]], [[0, 170], [24, 220], [30, 260]]] },
  smug: { arms: [[[0, 90], [-30, 130], [-6, 150]], [[0, 90], [30, 130], [6, 150]]], legs: [[[0, 170], [-14, 220], [-28, 260]], [[0, 170], [14, 220], [30, 258]]] },
  shock: { arms: [[[0, 90], [-50, 70], [-62, 34]], [[0, 90], [50, 70], [62, 34]]], legs: [[[0, 170], [-30, 220], [-44, 258]], [[0, 170], [30, 220], [44, 258]]] },
  rage: { arms: [[[0, 90], [-52, 92], [-60, 56]], [[0, 90], [52, 92], [60, 56]]], legs: [[[0, 170], [-34, 214], [-46, 258]], [[0, 170], [34, 214], [46, 258]]] },
  cry: { arms: [[[0, 90], [-26, 70], [-24, 30]], [[0, 90], [26, 70], [24, 30]]], legs: [[[0, 170], [-14, 220], [-12, 260]], [[0, 170], [14, 220], [12, 260]]] },
  scheme: { arms: [[[0, 90], [-30, 110], [-4, 112]], [[0, 90], [30, 110], [4, 112]]], legs: [[[0, 170], [-20, 220], [-26, 260]], [[0, 170], [20, 220], [26, 260]]] },
  downbad: { arms: [[[0, 90], [-20, 140], [-22, 180]], [[0, 90], [20, 140], [22, 180]]], legs: [[[0, 170], [-16, 220], [-20, 260]], [[0, 170], [16, 220], [20, 260]]] },
  galaxy: { arms: [[[0, 90], [-50, 60], [-40, 20]], [[0, 90], [50, 60], [40, 20]]], legs: [[[0, 170], [-24, 220], [-30, 260]], [[0, 170], [24, 220], [30, 260]]] },
  dead: { arms: [[[0, 90], [-44, 118], [-70, 128]], [[0, 90], [44, 118], [70, 128]]], legs: [[[0, 170], [-24, 220], [-38, 256]], [[0, 170], [24, 220], [38, 256]]] },
};

/**
 * A Suds stickman. Body is a single boiling line; the head is a big circle with a sticker border and
 * a misprinted skin fill; the shirt is a misprinted color block; drawn hair on top.
 */
export const Stickman = ({ mood, f, x = 0, y = 0, shirt = SUDS.yellow, seed = 0, hair = 'spiky', hairColor = INK, scale = 1 }: {
  mood: Mood; f: number; x?: number; y?: number; shirt?: string; seed?: number; hair?: Hair; hairColor?: string; scale?: number;
}) => {
  const p = POSES[mood];
  const bob = mood === 'dead' ? 0 : Math.sin(f / 12 + seed) * (mood === 'rage' ? 5 : 3);
  const shake = mood === 'rage' ? Math.sin(f * 2.3) * 2 : 0;
  const limbs = [...p.arms, ...p.legs, [[0, 60], [0, 172]] as Pt[]];
  return (
    <g transform={`translate(${x + shake} ${y + bob}) scale(${scale})`}>
      {/* Sticker border and hard shadow */}
      <g transform="translate(10 12)">
        {limbs.map((l, i) => <Stroke key={i} d={line(l, f, seed + i)} w={30} c={INK} />)}
        <circle cx={0} cy={0} r={86} fill={INK} />
      </g>
      {limbs.map((l, i) => <Stroke key={i} d={line(l, f, seed + i)} w={28} c="#fff" />)}
      <circle cx={0} cy={0} r={84} fill="#fff" />
      {/* Shirt: a misprinted block behind the torso line */}
      <path d={line([[-24, 70], [24, 70], [28, 150], [-28, 150]], f, seed + 30, 1.5) + ' Z'} fill={shirt} transform="translate(8 6)" />
      <path d={line([[-24, 70], [24, 70], [28, 150], [-28, 150]], f, seed + 31) + ' Z'} fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      {limbs.map((l, i) => <Stroke key={i} d={line(l, f, seed + i)} w={7} />)}
      {/* Head */}
      <path d={blob(0, 0, 70, f, seed + 40)} fill={SUDS.skin} transform="translate(8 7)" />
      <path d={blob(0, 0, 70, f, seed + 41)} fill="none" stroke={INK} strokeWidth={6} />
      <Face mood={mood} f={f} seed={seed} />
      <HairShape hair={hair} f={f} seed={seed} color={hairColor} />
    </g>
  );
};

/** Hair drawn on a head centred at (0,0), radius 70: ink shapes with the same boiling line. */
const HairShape = ({ hair, f, seed, color = INK }: { hair: Hair; f: number; seed: number; color?: string }) => {
  const fill = (pts: Pt[], c = color, amt = 1.8) => <path d={line(pts, f, seed + 50, amt) + ' Z'} fill={c} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
  switch (hair) {
    case 'spiky':
      return fill([[-68, -14], [-74, -46], [-54, -40], [-58, -78], [-30, -58], [-20, -96], [2, -66], [20, -98], [32, -62], [60, -84], [56, -46], [76, -50], [68, -14], [40, -40], [0, -34], [-40, -40]]);
    case 'swoop':
      return fill([[-70, -6], [-66, -50], [-30, -76], [20, -80], [62, -60], [80, -30], [56, -36], [10, -30], [-30, -26], [-56, -10]]);
    case 'buzz':
      return fill([[-66, -24], [-56, -52], [-24, -70], [24, -70], [56, -52], [66, -24], [40, -40], [0, -46], [-40, -40]], '#4A4A5E');
    case 'beanie':
      return <g>{fill([[-72, -34], [-64, -70], [-30, -94], [30, -94], [64, -70], [72, -34]], SUDS.pink)}{fill([[-76, -42], [76, -42], [74, -24], [-74, -24]], SUDS.pink)}<circle cx={0} cy={-102} r={14} fill="#fff" stroke={INK} strokeWidth={5} /></g>;
    case 'messy':
      return fill([[-72, -4], [-80, -34], [-60, -30], [-70, -64], [-40, -58], [-36, -88], [-10, -66], [8, -94], [24, -64], [52, -86], [50, -54], [80, -60], [70, -30], [84, -14], [56, -24], [20, -40], [-20, -40], [-50, -24]]);
    case 'bun':
      return <g><circle cx={0} cy={-84} r={22} fill={INK} />{fill([[-70, -4], [-64, -50], [-30, -70], [30, -70], [64, -50], [70, -4], [44, -34], [0, -42], [-44, -34]])}</g>;
    case 'cap':
      return <g>{fill([[-70, -18], [-62, -56], [-26, -78], [26, -78], [62, -56], [70, -18]], SUDS.blue)}{fill([[-70, -22], [-118, -14], [-112, -2], [-66, -6]], SUDS.blue)}</g>;
    case 'beret':
      return <g>{fill([[-66, -18], [-60, -48], [-20, -64], [30, -60], [60, -44], [62, -20], [30, -30], [-30, -30]])}{fill([[-74, -34], [-56, -82], [0, -96], [62, -80], [84, -50], [40, -56], [-20, -58]], '#1B1A2E')}<circle cx={46} cy={-74} r={8} fill="#fff" stroke={INK} strokeWidth={3} /></g>;
    case 'long':
      return fill([[-74, 40], [-80, -10], [-70, -60], [-36, -86], [20, -88], [62, -68], [80, -20], [76, 44], [56, 30], [58, -18], [30, -44], [-10, -50], [-44, -40], [-56, -10], [-54, 34]]);
    case 'bald':
      return <path d={line([[-30, -52], [-18, -60]], f, seed + 60)} stroke="#fff" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.8} />;
  }
};

const HAIRS: Hair[] = ['swoop', 'spiky', 'messy', 'beanie', 'cap', 'buzz', 'bun', 'bald'];

const LABELS: [Mood, string, string][] = [
  ['smug', 'smug', SUDS.yellow],
  ['shock', 'shook', SUDS.mint],
  ['rage', 'tilted', SUDS.pink],
  ['cry', 'rinsed', SUDS.blue],
  ['scheme', 'scheming', SUDS.mint],
  ['downbad', 'down bad', SUDS.yellow],
  ['galaxy', 'galaxy brain', SUDS.pink],
  ['dead', 'dead inside', SUDS.blue],
];

export const StickSheet = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: SUDS.paper }}>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {Array.from({ length: 24 }, (_, i) => <line key={i} x1={0} x2={W} y1={60 + i * 44} y2={60 + i * 44} stroke="#B9D4F5" strokeWidth={2} />)}
        <line x1={110} x2={110} y1={0} y2={H} stroke="#F7A6B7" strokeWidth={3} />
      </svg>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <text x={960} y={96} textAnchor="middle" fontFamily="Impact,sans-serif" fontSize={76} fill="#fff" stroke={INK} strokeWidth={13} paintOrder="stroke">SUDS STICKMEN</text>
        {LABELS.map(([mood, label, shirt], i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const cx = 330 + col * 420, cy = 250 + row * 440;
          return (
            <g key={mood}>
              <Stickman mood={mood} f={f} x={cx} y={cy} shirt={shirt} seed={i * 5} hair={HAIRS[i]} scale={0.92} />
              <text x={cx + 4} y={cy + 300} textAnchor="middle" fontFamily="'Comic Sans MS','Chalkboard SE',cursive" fontWeight={700} fontSize={36} fill={INK} transform={`rotate(${(i % 2 ? 2 : -2)} ${cx} ${cy + 300})`}>{label}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
