// "Suds" — 9in1shampoo's house character style. Built on the scribble look, with four signatures:
//  1. Misprint: the color fill is printed slightly off the outline (risograph style), in a fixed palette.
//  2. Line boil: outlines are redrawn every 3 frames, so drawings feel alive even when still.
//  3. Sticker cut-out: every character has a thick white border and a hard drop shadow, like a sticker.
//  4. Suds: every character carries shampoo foam somewhere (hair, hat, cloud, speech bubbles).
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const W = 1920;
export const H = 1080;
export const LOOP = 90;

export const SUDS = {
  ink: '#1B1A2E',
  pink: '#FF4FA3',
  blue: '#3D7BFF',
  yellow: '#FFD23F',
  mint: '#3DDC97',
  paper: '#FFF8EC',
  skin: '#F6C8A4',
};

type Pt = [number, number];

/** Boiling hand-drawn closed path: jitter changes every 3 frames. */
const boil = (pts: Pt[], f: number, seed: number, amt = 3) => {
  const k = Math.floor(f / 3) * 7.13 + seed;
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + Math.sin(k + i * 1.9) * amt).toFixed(1)} ${(y + Math.cos(k * 1.3 + i * 2.7) * amt).toFixed(1)}`).join(' ') + ' Z';
};
const ring = (cx: number, cy: number, rx: number, ry = rx, n = 20): Pt[] =>
  Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * Math.PI * 2), cy + ry * Math.sin((i / n) * Math.PI * 2)]);

/**
 * One drawn shape in the house style: a sticker border, the misprinted fill, then the boiling outline.
 * Stacked as layers so many shapes make one sticker.
 */
const Shape = ({ pts, fill, f, seed, layer }: { pts: Pt[]; fill: string; f: number; seed: number; layer: 'sticker' | 'fill' | 'line' }) => {
  if (layer === 'sticker') return <path d={boil(pts, f, seed, 2)} fill="#fff" stroke="#fff" strokeWidth={26} strokeLinejoin="round" />;
  if (layer === 'fill') return <path d={boil(pts, f, seed + 40, 1.5)} fill={fill} transform="translate(11 9)" />;
  return <path d={boil(pts, f, seed)} fill="none" stroke={SUDS.ink} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />;
};

/** Renders shapes as a sticker: all borders, then a drop shadow, then misprinted fills, then outlines. */
const Sticker = ({ shapes, f, extra }: { shapes: { pts: Pt[]; fill: string; seed: number }[]; f: number; extra?: React.ReactNode }) => (
  <g>
    <g transform="translate(14 16)" opacity={0.9} style={{ filter: 'brightness(0)' }}>{shapes.map((s, i) => <Shape key={i} {...s} f={f} layer="sticker" />)}</g>
    <g style={{ filter: 'none' }}>{shapes.map((s, i) => <Shape key={i} {...s} f={f} layer="sticker" />)}</g>
    {shapes.map((s, i) => <Shape key={i} {...s} f={f} layer="fill" />)}
    {shapes.map((s, i) => <Shape key={i} {...s} f={f} layer="line" />)}
    {extra}
  </g>
);

/** A cluster of foam bubbles that bob slightly. */
const Foam = ({ x, y, f, n = 6, size = 22, seed = 0 }: { x: number; y: number; f: number; n?: number; size?: number; seed?: number }) => (
  <g>
    {Array.from({ length: n * 2 }, (_, i) => {
      const row = i % 2;
      const j = Math.floor(i / 2);
      const cx = x + (j - (n - 1) / 2) * size * 1.25 + row * size * 0.6 + Math.sin(seed + i) * 4;
      const cy = y - row * size * 1.1 + Math.sin(f / 10 + i) * 3;
      const r = size * (0.85 + (((i + seed) * 37) % 10) / 22);
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r + 9} fill="#fff" />
          <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={SUDS.ink} strokeWidth={4} />
          <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.22} fill={SUDS.blue} opacity={0.35} />
        </g>
      );
    })}
  </g>
);

/** Dot eyes far apart with a tiny highlight, the house face. Blinks now and then. */
const Face = ({ x, y, f, gap = 54, mood = 'smug' as 'smug' | 'shock' | 'flat', seed = 0 }: { x: number; y: number; f: number; gap?: number; mood?: 'smug' | 'shock' | 'flat'; seed?: number }) => {
  const blink = (f + seed * 13) % 75 < 4;
  return (
    <g>
      {[-1, 1].map((s) => (blink ? (
        <path key={s} d={`M${x + (s * gap) / 2 - 9} ${y} h18`} stroke={SUDS.ink} strokeWidth={6} strokeLinecap="round" />
      ) : (
        <g key={s}>
          <circle cx={x + (s * gap) / 2} cy={y} r={mood === 'shock' ? 11 : 8} fill={SUDS.ink} />
          <circle cx={x + (s * gap) / 2 + 3} cy={y - 3} r={2.5} fill="#fff" />
        </g>
      )))}
      {mood === 'smug' && <path d={`M${x - 20} ${y + 32} q24 14 44 -6`} fill="none" stroke={SUDS.ink} strokeWidth={6} strokeLinecap="round" />}
      {mood === 'shock' && <ellipse cx={x} cy={y + 38} rx={12} ry={16} fill={SUDS.ink} />}
      {mood === 'flat' && <path d={`M${x - 16} ${y + 34} h32`} stroke={SUDS.ink} strokeWidth={6} strokeLinecap="round" />}
      {/* Blush marks: two short slashes, a house detail */}
      {[-1, 1].map((s) => <path key={`b${s}`} d={`M${x + s * (gap / 2 + 16) - 8} ${y + 18} l8 -6 M${x + s * (gap / 2 + 16)} ${y + 20} l8 -6`} stroke={SUDS.pink} strokeWidth={4} strokeLinecap="round" />)}
    </g>
  );
};

// ---------- Characters ----------

/** Suddy: the 9in1shampoo bottle mascot. Foam spills out of the cap. */
export const Suddy = ({ f, x = 0, y = 0, mood = 'smug' }: { f: number; x?: number; y?: number; mood?: 'smug' | 'shock' | 'flat' }) => (
  <g transform={`translate(${x} ${y + Math.sin(f / 14) * 3})`}>
    <Sticker f={f} shapes={[
      { pts: [[100, 40], [150, 40], [152, 86], [98, 86]], fill: SUDS.pink, seed: 1 },
      { pts: [[64, 86], [186, 86], [206, 140], [206, 330], [44, 330], [44, 140]], fill: SUDS.blue, seed: 2 },
      { pts: [[70, 220], [180, 220], [180, 290], [70, 290]], fill: SUDS.paper, seed: 3 },
    ]} extra={
      <>
        <text x={125} y={268} textAnchor="middle" fontFamily="'Comic Sans MS','Chalkboard SE',cursive" fontWeight={700} fontSize={34} fill={SUDS.ink} transform="rotate(-4 125 268)">9in1</text>
        <Face x={125} y={160} f={f} mood={mood} />
        <Foam x={125} y={40} f={f} n={4} size={24} seed={1} />
      </>
    } />
  </g>
);

/** A generic person: round head, pill body, foam hair (everyone in the world has suds). */
export const Person = ({ f, x = 0, y = 0, shirt = SUDS.yellow, mood = 'flat', seed = 0 }: { f: number; x?: number; y?: number; shirt?: string; mood?: 'smug' | 'shock' | 'flat'; seed?: number }) => (
  <g transform={`translate(${x} ${y + Math.sin(f / 16 + seed) * 3})`}>
    <Sticker f={f} shapes={[
      { pts: [[60, 200], [190, 200], [210, 340], [40, 340]], fill: shirt, seed: 4 + seed },
      { pts: ring(125, 130, 74, 70), fill: SUDS.skin, seed: 5 + seed },
    ]} extra={
      <>
        <Face x={125} y={128} f={f} mood={mood} seed={seed} />
        <Foam x={125} y={74} f={f} n={5} size={22} seed={seed + 3} />
      </>
    } />
  </g>
);

/** The dealer: green visor, bow tie, foam peeking out of the visor. */
export const Dealer = ({ f, x = 0, y = 0, mood = 'smug' }: { f: number; x?: number; y?: number; mood?: 'smug' | 'shock' | 'flat' }) => (
  <g transform={`translate(${x} ${y + Math.sin(f / 15 + 2) * 3})`}>
    <Sticker f={f} shapes={[
      { pts: [[56, 200], [194, 200], [214, 340], [36, 340]], fill: SUDS.paper, seed: 7 },
      { pts: [[100, 210], [125, 226], [150, 210], [150, 244], [125, 228], [100, 244]], fill: SUDS.pink, seed: 8 },
      { pts: ring(125, 130, 72, 68), fill: SUDS.skin, seed: 9 },
      { pts: [[40, 92], [210, 92], [184, 118], [66, 118]], fill: SUDS.mint, seed: 10 },
    ]} extra={
      <>
        <Face x={125} y={146} f={f} mood={mood} seed={2} />
        <Foam x={125} y={84} f={f} n={4} size={18} seed={6} />
      </>
    } />
  </g>
);

// ---------- Style sheet ----------

const Label = ({ x, y, text, rot = 0 }: { x: number; y: number; text: string; rot?: number }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="'Comic Sans MS','Chalkboard SE',cursive" fontWeight={700} fontSize={34} fill={SUDS.ink} transform={`rotate(${rot} ${x} ${y})`}>{text}</text>
);

export const SudsSheet = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: SUDS.paper }}>
      {/* Notebook paper */}
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        {Array.from({ length: 24 }, (_, i) => <line key={i} x1={0} x2={W} y1={60 + i * 44} y2={60 + i * 44} stroke="#B9D4F5" strokeWidth={2} />)}
        <line x1={150} x2={150} y1={0} y2={H} stroke="#F7A6B7" strokeWidth={3} />
      </svg>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <text x={960} y={110} textAnchor="middle" fontFamily="Impact,sans-serif" fontSize={84} fill="#fff" stroke={SUDS.ink} strokeWidth={14} paintOrder="stroke">SUDS STYLE</text>
        <Label x={960} y={160} text="the 9in1shampoo house style" rot={-1} />

        <Suddy f={f} x={210} y={260} />
        <Label x={335} y={660} text="Suddy (mascot)" rot={-3} />
        <Person f={f} x={620} y={290} mood="smug" />
        <Label x={745} y={690} text="you, probably" rot={2} />
        <Dealer f={f} x={1010} y={290} mood="smug" />
        <Label x={1135} y={690} text="the dealer" rot={-2} />
        <Person f={f} x={1400} y={290} shirt={SUDS.mint} mood="shock" seed={3} />
        <Label x={1525} y={690} text="after the house edge" rot={3} />

        {/* The four rules */}
        {[
          ['misprinted color', 330],
          ['boiling lines', 760],
          ['sticker cut-outs', 1180],
          ['suds on everyone', 1600],
        ].map(([t, x], i) => (
          <g key={t as string}>
            <circle cx={(x as number) - 150} cy={860} r={26} fill={[SUDS.pink, SUDS.blue, SUDS.yellow, SUDS.mint][i]} stroke={SUDS.ink} strokeWidth={5} />
            <text x={(x as number) - 150} y={872} textAnchor="middle" fontFamily="Impact,sans-serif" fontSize={34} fill={SUDS.ink}>{i + 1}</text>
            <text x={(x as number) - 112} y={872} fontFamily="'Comic Sans MS','Chalkboard SE',cursive" fontWeight={700} fontSize={32} fill={SUDS.ink}>{t as string}</text>
          </g>
        ))}
        <Label x={960} y={980} text="palette: pink · blue · yellow · mint on notebook paper" rot={0} />
      </svg>
    </AbsoluteFill>
  );
};
