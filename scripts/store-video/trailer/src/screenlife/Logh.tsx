// 16:9 screenlife edit: "Corrupt democracy vs benevolent dictator", using Legend of the Galactic Heroes
// as the reference. Original visuals only (no footage from the show): faction dossiers, a poll and a
// script window over a painted-space wallpaper.
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import { Character } from './Characters';
import { Grain, Win } from './Test';

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const DURATION = 840;

const FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const SERIF = "'Baskerville', 'Times New Roman', serif";
const MONO = "'SF Mono', Menlo, monospace";
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.inOut(Easing.cubic);
const GOLD = '#E3B54A';
const BLUE = '#6FA8FF';

/** Camera keyframes [frame, x, y, zoom]. */
const CAM: [number, number, number, number][] = [
  [0, 0, 0, 1.0], [110, 0, 0, 1.05],
  [140, -360, -20, 1.55], [230, -380, -10, 1.6],
  [260, 360, -20, 1.55], [350, 380, -10, 1.6],
  [380, 0, 40, 1.15], [470, 0, 40, 1.2],
  [500, 0, 170, 1.6], [560, 0, 170, 1.65],
  [600, 120, -230, 1.6], [680, 130, -230, 1.7],
  [710, 0, 0, 1.0], [840, 0, 0, 1.03],
];
const cam = (f: number) => {
  const t = CAM.map((k) => k[0]);
  const at = (i: number) => interpolate(f, t, CAM.map((k) => k[i]), { ...clamp, easing: ease });
  return { x: at(1), y: at(2), z: at(3) };
};

export const LoghEdit = () => {
  const f = useCurrentFrame();
  const c = cam(f);
  const blur = interpolate(c.z, [1, 1.8], [0, 5], clamp);
  const endFade = interpolate(f, [690, 720], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: '#05060d', overflow: 'hidden', fontFamily: FONT }}>
      <AbsoluteFill style={{ transform: `scale(${c.z}) translate(${-c.x / c.z}px, ${-c.y / c.z}px)`, opacity: endFade }}>
        <Space blur={blur} f={f} />
        <Dossier f={f} at={20} x={170} side="empire" blur={f > 260 && f < 360 ? blur : 0} />
        <Dossier f={f} at={44} x={1010} side="alliance" blur={f > 140 && f < 240 ? blur : 0} />
        <Poll f={f} />
        <Script f={f} />
      </AbsoluteFill>
      <EndCard f={f} />
      <Grain f={f} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 280px rgba(0,0,0,.75)', pointerEvents: 'none' }} />
      <Captions f={f} />
    </AbsoluteFill>
  );
};

/** A painted nebula with slowly drifting stars. */
const Space = ({ blur, f }: { blur: number; f: number }) => (
  <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <filter id="neb">
          <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.004" numOctaves={5} seed={11} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={260} />
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <radialGradient id="deep" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#1B2350" />
          <stop offset="1" stopColor="#04050B" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#deep)" />
      <g filter="url(#neb)" opacity={0.75}>
        <ellipse cx={420} cy={360} rx={520} ry={260} fill="#7A4FA8" />
        <ellipse cx={1500} cy={720} rx={560} ry={280} fill="#2C6E9E" />
        <ellipse cx={1100} cy={240} rx={300} ry={160} fill="#C9924A" />
      </g>
      {Array.from({ length: 180 }, (_, i) => {
        const x = (i * 733) % W; const y = (i * 409) % H;
        const tw = 0.5 + 0.5 * Math.sin(f / 9 + i);
        return <circle key={i} cx={(x + f * 0.15 * ((i % 3) + 1)) % W} cy={y} r={i % 7 === 0 ? 2.2 : 1.2} fill="#fff" opacity={0.35 + 0.5 * tw} />;
      })}
    </svg>
  </AbsoluteFill>
);

const SIDES = {
  empire: {
    title: 'GALACTIC EMPIRE', color: GOLD, file: 'empire_dossier.pdf',
    leader: 'Autocracy · led by Reinhard von Lohengramm',
    rows: [['Decisions', 'Instant'], ['Corruption', 'Crushed'], ['Your vote', 'None'], ['If he dies', '???']],
  },
  alliance: {
    title: 'FREE PLANETS ALLIANCE', color: BLUE, file: 'alliance_dossier.pdf',
    leader: 'Democracy · defended by Yang Wen-li',
    rows: [['Decisions', 'Slow'], ['Corruption', 'Everywhere'], ['Your vote', 'Yes'], ['Bad leader?', 'Vote them out']],
  },
} as const;

const Dossier = ({ f, at, x, side, blur }: { f: number; at: number; x: number; side: keyof typeof SIDES; blur: number }) => {
  const s = SIDES[side];
  return (
    <Win x={x} y={150} w={740} h={520} title={s.file} at={at} f={f} z={side === 'empire' ? -1.5 : 1.5} blur={blur}>
      <div style={{ height: '100%', display: 'flex', background: 'linear-gradient(160deg,#16161c,#0d0d12)', color: '#e8e6f0' }}>
        {/* Portrait: the faction's leader, talking while the camera is on this dossier. */}
        <div style={{ width: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: `radial-gradient(circle at 50% 40%, ${s.color}55, ${s.color}11 70%)`, borderRight: `2px solid ${s.color}44` }}>
          <Character kind={side === 'empire' ? 'emperor' : 'admiral'} f={f} talking={side === 'empire' ? f > 150 && f < 245 : f > 270 && f < 365} size={230} />
        </div>
        <div style={{ flex: 1, padding: '28px 30px' }}>
          <div style={{ fontFamily: SERIF, fontSize: 40, letterSpacing: 2, color: s.color, fontWeight: 700, lineHeight: 1.1 }}>{s.title}</div>
          <div style={{ marginTop: 8, fontSize: 19, color: '#a9a6b8' }}>{s.leader}</div>
          <div style={{ marginTop: 20, borderTop: `2px solid ${s.color}55` }}>
            {s.rows.map(([k, v], i) => {
              const p = spring({ frame: f - at - 20 - i * 8, fps: FPS, config: { damping: 18 } });
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 2px', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 26, opacity: p, transform: `translateX(${(1 - p) * 30}px)` }}>
                  <span style={{ color: '#a9a6b8' }}>{k}</span>
                  <span style={{ fontWeight: 800, color: v === '???' ? '#FF6B6B' : '#fff' }}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Win>
  );
};

/** "Which would you live under?" A poll that swings, then flips at the twist. */
const Poll = ({ f }: { f: number }) => {
  if (f < 370) return null;
  const empire = interpolate(f, [390, 440, 520, 560], [50, 71, 71, 34], { ...clamp, easing: ease });
  return (
    <Win x={560} y={560} w={800} h={300} title="poll — which would you live under?" at={370} f={f}>
      <div style={{ padding: '26px 34px', background: '#111117', height: '100%', color: '#fff' }}>
        {[['Benevolent dictator', empire, GOLD], ['Corrupt democracy', 100 - empire, BLUE]].map(([label, v, col]) => (
          <div key={label as string} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700 }}>
              <span>{label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(v as number)}%</span>
            </div>
            <div style={{ marginTop: 10, height: 26, borderRadius: 13, background: 'rgba(255,255,255,.08)' }}>
              <div style={{ width: `${v}%`, height: '100%', borderRadius: 13, background: col as string }} />
            </div>
          </div>
        ))}
      </div>
    </Win>
  );
};

const SCRIPT = [
  'notes.txt',
  '- a perfect dictator is a great bet',
  '- ...with a terrible succession plan',
  '- the genius always dies eventually',
  '- democracy: ugly, slow, but it can fire',
  '  its leaders. that is the whole point.',
];

const Script = ({ f }: { f: number }) => {
  if (f < 540) return null;
  return (
    <Win x={700} y={130} w={760} h={360} title="script.txt — 9in1shampoo" at={540} f={f} z={-0.8}>
      <div style={{ padding: '22px 26px', fontFamily: MONO, fontSize: 25, lineHeight: '42px', background: '#1b1b20', height: '100%', color: '#d7dae0' }}>
        {SCRIPT.slice(1).map((l, i) => {
          const chars = Math.floor(interpolate(f, [556 + i * 16, 572 + i * 16], [0, l.length], clamp));
          return <div key={i} style={{ whiteSpace: 'pre', color: i === 1 ? '#FF8A8A' : undefined }}>{l.slice(0, chars)}</div>;
        })}
      </div>
    </Win>
  );
};

const EndCard = ({ f }: { f: number }) => {
  if (f < 710) return null;
  const p = spring({ frame: f - 715, fps: FPS, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'absolute', left: 90, bottom: 40, opacity: p, transform: `translateX(${(1 - p) * -120}px)` }}>
        <Character kind="emperor" f={f} size={420} talking={f > 730 && f < 770} />
      </div>
      <div style={{ position: 'absolute', right: 90, bottom: 40, opacity: p, transform: `translateX(${(1 - p) * 120}px)` }}>
        <Character kind="admiral" f={f} size={420} flip talking={f > 775 && f < 815} />
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 84, color: '#fff', letterSpacing: 2, opacity: p, transform: `scale(${0.92 + 0.08 * p})` }}>
        Corrupt Democracy <span style={{ color: '#888' }}>vs</span> Benevolent Dictator
      </div>
      <div style={{ marginTop: 24, fontSize: 30, color: GOLD, letterSpacing: 8, opacity: p }}>9IN1SHAMPOO</div>
    </AbsoluteFill>
  );
};

const LINES: [number, number, string][] = [
  [10, 130, 'In Legend of the Galactic Heroes, two systems go to war.'],
  [140, 250, 'One is run by a genius who is actually fair.'],
  [260, 370, 'The other is a democracy rotting from the inside.'],
  [380, 520, 'So which would you live under?'],
  [530, 600, 'Then ask: what happens when the genius dies?'],
  [600, 700, 'Great ruler. Terrible succession plan.'],
];

const Captions = ({ f }: { f: number }) => {
  const line = LINES.find(([a, b]) => f >= a && f < b);
  if (!line) return null;
  const p = interpolate(f, [line[0], line[0] + 6], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', bottom: 64, left: 0, right: 0, textAlign: 'center', opacity: p }}>
      <span style={{ background: 'rgba(0,0,0,.72)', color: '#fff', fontSize: 40, fontWeight: 600, padding: '8px 20px', borderRadius: 6, lineHeight: 1.6 }}>{line[2]}</span>
    </div>
  );
};
