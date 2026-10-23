// Character style exploration for 9in1shampoo: three directions, each with the shampoo-bottle mascot
// and a generic person, so a house style can be picked.
import { AbsoluteFill } from 'remotion';

export const W = 1920;
export const H = 1080;
const INK = '#141414';

// ---------- A. Scribble: wobbly MS-Paint marker lines, Comic Sans, matches the banner ----------

/** A slightly jittered path so lines look hand-drawn. */
const wob = (pts: [number, number][], seed: number) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x + Math.sin(seed + i * 1.7) * 2.5} ${y + Math.cos(seed + i * 2.3) * 2.5}`).join(' ') + ' Z';
const circle = (cx: number, cy: number, r: number, n = 18): [number, number][] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);

const ScribbleBottle = () => (
  <svg width={220} height={300} viewBox="0 0 220 300">
    <g stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
      <path d={wob([[88, 20], [132, 20], [134, 60], [86, 60]], 1)} fill="#FF4FD8" />
      <path d={wob([[60, 60], [160, 60], [176, 110], [176, 270], [44, 270], [44, 110]], 2)} fill="#7FB2FF" />
      <path d={wob([[64, 150], [156, 150], [156, 210], [64, 210]], 3)} fill="#FFF" />
    </g>
    <text x={110} y={190} textAnchor="middle" fontFamily="'Comic Sans MS','Chalkboard SE',cursive" fontWeight={700} fontSize={26} fill={INK}>9in1</text>
    {/* Mismatched googly eyes and a smug grin */}
    <circle cx={88} cy={112} r={17} fill="#fff" stroke={INK} strokeWidth={5} /><circle cx={93} cy={116} r={7} fill={INK} />
    <circle cx={134} cy={110} r={12} fill="#fff" stroke={INK} strokeWidth={5} /><circle cx={131} cy={112} r={5} fill={INK} />
    <path d="M92 138 q22 14 40 -4" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    {/* Stick arms */}
    <path d="M44 170 l-30 -30 M176 170 l30 -40 l14 6" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
  </svg>
);

const ScribblePerson = () => (
  <svg width={220} height={300} viewBox="0 0 220 300">
    <g stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
      <path d={wob([[60, 170], [160, 170], [180, 290], [40, 290]], 4)} fill="#FFE600" />
      <path d={wob(circle(110, 105, 62), 5)} fill="#F2C9A0" />
    </g>
    <circle cx={88} cy={100} r={6} fill={INK} /><circle cx={132} cy={100} r={6} fill={INK} />
    <path d="M86 132 q24 -10 48 4" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    <path d="M58 70 q20 -40 50 -26 q20 -30 52 4" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
    <text x={168} y={60} fontFamily="'Comic Sans MS',cursive" fontSize={30} fill="#FF1A1A" fontWeight={700}>?!</text>
  </svg>
);

// ---------- B. Beans: smooth pill bodies, no necks, thick outlines, huge eyes, one accent color each ----------

const Eyes = ({ y = 120, gap = 46, r = 20, look = 4 }: { y?: number; gap?: number; r?: number; look?: number }) => (
  <g>
    {[-1, 1].map((s) => (
      <g key={s}>
        <ellipse cx={110 + s * gap / 2} cy={y} rx={r} ry={r * 1.15} fill="#fff" stroke={INK} strokeWidth={5} />
        <circle cx={110 + s * gap / 2 + look} cy={y + 4} r={r * 0.5} fill={INK} />
        <circle cx={110 + s * gap / 2 + look + 4} cy={y - 2} r={r * 0.17} fill="#fff" />
      </g>
    ))}
  </g>
);

const BeanBottle = () => (
  <svg width={220} height={300} viewBox="0 0 220 300">
    <rect x={88} y={22} width={44} height={36} rx={10} fill="#1A1A1A" stroke={INK} strokeWidth={7} />
    <rect x={44} y={54} width={132} height={226} rx={64} fill="#5B8CFF" stroke={INK} strokeWidth={7} />
    <path d="M60 110 q10 -40 40 -46" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={0.55} />
    <Eyes y={128} />
    <path d="M94 176 q16 14 32 0" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <rect x={70} y={206} width={80} height={36} rx={10} fill="#fff" stroke={INK} strokeWidth={5} />
    <text x={110} y={232} textAnchor="middle" fontFamily="'Arial Rounded MT Bold','Helvetica Neue',sans-serif" fontWeight={900} fontSize={22} fill={INK}>9in1</text>
  </svg>
);

const BeanPerson = () => (
  <svg width={220} height={300} viewBox="0 0 220 300">
    <rect x={40} y={40} width={140} height={250} rx={70} fill="#FFB547" stroke={INK} strokeWidth={7} />
    <path d="M44 106 Q60 30 110 34 Q160 30 176 106 Q150 80 110 84 Q70 80 44 106 Z" fill="#3A2A20" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <Eyes y={140} look={-4} />
    <ellipse cx={110} cy={196} rx={14} ry={10} fill="#7A2E2E" stroke={INK} strokeWidth={5} />
  </svg>
);

// ---------- C. Pixel: chunky 16-bit sprites on a pixel grid ----------

const PixelArt = ({ map, palette, px = 14 }: { map: string[]; palette: Record<string, string>; px?: number }) => (
  <svg width={map[0].length * px} height={map.length * px} style={{ imageRendering: 'pixelated' }}>
    {map.flatMap((row, y) => row.split('').map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={palette[c]} />)))}
  </svg>
);

const PIXEL_BOTTLE = [
  '......kkkk......',
  '......kppk......',
  '......kppk......',
  '....kkkkkkkk....',
  '...kbbbbbbbbk...',
  '..kbbwwbbwwbbk..',
  '..kbbwkbbwkbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbkkkkbbbk..',
  '..kbbbbbbbbbbk..',
  '..kbwwwwwwwwbk..',
  '..kbwkwkkwkwbk..',
  '..kbwwwwwwwwbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbk..',
  '...kkkkkkkkkk...',
];
const PIXEL_PERSON = [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '...hhssssssh....',
  '...hsskssks.....',
  '...ssssssss.....',
  '....sskkkss.....',
  '.....ssss.......',
  '...yyyyyyyy.....',
  '..yyyyyyyyyy....',
  '..ysyyyyyysy....',
  '..ysyyyyyysy....',
  '....yyyyyy......',
  '....kk..kk......',
  '....kk..kk......',
  '...kkk..kkk.....',
];

// ---------- Layout ----------

const Panel = ({ x, title, sub, bg, dark = false, children }: { x: number; title: string; sub: string; bg: string; dark?: boolean; children: React.ReactNode }) => (
  <div style={{ position: 'absolute', left: x, top: 140, width: 560, height: 820, borderRadius: 28, background: bg, boxShadow: '0 30px 70px rgba(0,0,0,.35)', overflow: 'hidden' }}>
    <div style={{ padding: '30px 34px 0', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
      <div style={{ fontSize: 46, fontWeight: 900, color: dark ? '#fff' : INK }}>{title}</div>
      <div style={{ fontSize: 22, color: dark ? '#d8d2f5' : '#333', marginTop: 8, lineHeight: 1.35 }}>{sub}</div>
    </div>
    <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 30 }}>{children}</div>
  </div>
);

export const StyleSheet = () => (
  <AbsoluteFill style={{ background: '#20222A' }}>
    <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', color: '#fff', fontFamily: "-apple-system,sans-serif", fontSize: 50, fontWeight: 800 }}>
      9in1shampoo character styles: pick one
    </div>
    <Panel x={80} title="A · Scribble" sub="Wobbly MS-Paint marker lines, googly mismatched eyes, Comic Sans. Matches the meme banner. Chaotic and funny." bg="linear-gradient(135deg,#bfe9ff,#fff6a8)">
      <ScribbleBottle /><ScribblePerson />
    </Panel>
    <Panel x={680} title="B · Beans" sub="Smooth pill bodies, no necks, thick outlines, big shiny eyes, one bold color each. Clean, cute and very readable." bg="linear-gradient(135deg,#ffe0f3,#d9e4ff)">
      <BeanBottle /><BeanPerson />
    </Panel>
    <Panel x={1280} title="C · Pixel" sub="Chunky 16-bit sprites. Gamer-coded, retro, and great for gaming and trading videos." bg="linear-gradient(135deg,#2b2350,#4a3a8a)" dark>
      <PixelArt map={PIXEL_BOTTLE} px={15} palette={{ k: INK, p: '#FF4FD8', b: '#5B8CFF', w: '#FFFFFF' }} />
      <PixelArt map={PIXEL_PERSON} px={15} palette={{ k: INK, h: '#2A1E18', s: '#F2C9A0', y: '#FFD23F' }} />
    </Panel>
  </AbsoluteFill>
);
