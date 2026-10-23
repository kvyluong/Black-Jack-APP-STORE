// 16:9 "screenlife" test: the story told on a desktop. Floating macOS-style windows over a painterly
// wallpaper, a slow camera with depth blur, film grain, vignette and burned-in captions.
import { AbsoluteFill, Easing, Img, Loop, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const DURATION = 600;

const FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const MONO = "'SF Mono', Menlo, monospace";
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.inOut(Easing.cubic);

/** Camera keyframes: [frame, x, y, zoom]. The whole desktop moves; it never sits still. */
const CAM: [number, number, number, number][] = [
  [0, 0, 0, 1.0], [140, 0, 0, 1.04],
  [170, -300, 60, 1.9], [290, -270, 70, 2.05],
  [330, -180, -40, 1.25], [450, -160, -30, 1.3],
  [490, -430, 40, 1.75], [600, -450, 50, 1.85],
];
const cam = (f: number) => {
  const t = CAM.map((k) => k[0]);
  const at = (i: number) => interpolate(f, t, CAM.map((k) => k[i]), { ...clamp, easing: ease });
  return { x: at(1), y: at(2), z: at(3) };
};

export const ScreenlifeTest = () => {
  const f = useCurrentFrame();
  const c = cam(f);
  // Focus pulls: the background goes soft when the camera is pushed in.
  const blur = interpolate(c.z, [1, 2], [0, 6], clamp);
  return (
    <AbsoluteFill style={{ background: '#1a1410', overflow: 'hidden', fontFamily: FONT }}>
      <AbsoluteFill style={{ transform: `scale(${c.z}) translate(${-c.x / c.z}px, ${-c.y / c.z}px)`, transformOrigin: '50% 50%' }}>
        <Painting blur={blur * 0.8} />
        <CodeWindow f={f} />
        <AppWindow f={f} blur={f > 160 && f < 300 ? blur : 0} />
        <ReviewWindow f={f} />
        <WebcamWindow f={f} blur={f > 160 && f < 300 ? blur : 0} />
      </AbsoluteFill>
      <Grain f={f} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 260px rgba(0,0,0,.65)', pointerEvents: 'none' }} />
      <Captions f={f} />
    </AbsoluteFill>
  );
};

/** A painterly wallpaper made with SVG turbulence, standing in for a classical oil painting. */
const Painting = ({ blur }: { blur: number }) => (
  <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <filter id="oil">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.007" numOctaves={4} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={180} />
        </filter>
        <filter id="canvas">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.18 0" />
        </filter>
        <radialGradient id="sky" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#E9C98E" />
          <stop offset="0.45" stopColor="#B07A45" />
          <stop offset="1" stopColor="#3A2416" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      <g filter="url(#oil)" opacity={0.9}>
        <ellipse cx={520} cy={420} rx={420} ry={260} fill="#F3E2B8" />
        <ellipse cx={1380} cy={760} rx={560} ry={300} fill="#5B3A22" />
        <ellipse cx={1500} cy={300} rx={300} ry={180} fill="#8FA3A8" />
        <ellipse cx={300} cy={900} rx={380} ry={220} fill="#2E1D12" />
        <ellipse cx={960} cy={520} rx={260} ry={200} fill="#C99A63" />
      </g>
      <rect width={W} height={H} filter="url(#canvas)" />
    </svg>
  </AbsoluteFill>
);

/** macOS-style window chrome. Slides and settles in at `at`. */
const Win = ({ x, y, w, h, title, at, f, z = 0, blur = 0, children }: {
  x: number; y: number; w: number; h: number; title: string; at: number; f: number; z?: number; blur?: number; children: React.ReactNode;
}) => {
  const p = spring({ frame: f - at, fps: FPS, config: { damping: 18, stiffness: 110 } });
  if (f < at) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 14, overflow: 'hidden',
      background: '#1E1E22', boxShadow: '0 40px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)',
      opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.94 + 0.06 * p}) rotate(${z}deg)`,
      filter: blur ? `blur(${blur}px)` : undefined,
    }}>
      <div style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', background: '#2A2A2F', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((col) => <span key={col} style={{ width: 13, height: 13, borderRadius: 7, background: col }} />)}
        <span style={{ marginLeft: 12, color: '#CFCFD6', fontSize: 15, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ position: 'absolute', top: 38, left: 0, right: 0, bottom: 0 }}>{children}</div>
    </div>
  );
};

// Real code from ShoeSharp (src/engine/progress.ts).
const CODE = [
  'export function claimGoal(goals, id, today, dayGoalIds) {',
  '  if (goals.claimed.includes(id)) return goals;',
  '  const claimed = [...goals.claimed, id];',
  '  const next = { ...goals, claimed };',
  '  if (goals.lastCompleteDay !== today) {',
  '    next.streak = goals.lastCompleteDay === previousDay(today)',
  '      ? goals.streak + 1 : 1;',
  '    next.lastCompleteDay = today;',
  '  }',
  '  // claiming all three goals banks a streak freeze',
  '  if (dayGoalIds.every((g) => claimed.includes(g))) {',
  '    next.freezes = Math.min(MAX_FREEZES, (goals.freezes ?? 0) + 1);',
  '  }',
  '  return next;',
  '}',
];
const KW = /\b(export|function|if|return|const|Math)\b/g;

const CodeLine = ({ line, n, hi }: { line: string; n: number; hi: boolean }) => {
  const isComment = line.trim().startsWith('//');
  const parts: React.ReactNode[] = [];
  let last = 0;
  if (!isComment) {
    for (const m of line.matchAll(KW)) {
      parts.push(line.slice(last, m.index));
      parts.push(<span key={m.index} style={{ color: '#C792EA' }}>{m[0]}</span>);
      last = (m.index ?? 0) + m[0].length;
    }
  }
  parts.push(line.slice(last));
  return (
    <div style={{ display: 'flex', background: hi ? 'rgba(232,197,71,.14)' : 'transparent', borderLeft: hi ? '3px solid #E8C547' : '3px solid transparent' }}>
      <span style={{ width: 46, textAlign: 'right', paddingRight: 16, color: '#5C6370' }}>{n}</span>
      <span style={{ color: isComment ? '#7F848E' : '#D7DAE0', whiteSpace: 'pre' }}>{parts}</span>
    </div>
  );
};

const CodeWindow = ({ f }: { f: number }) => (
  <Win x={140} y={170} w={900} h={560} title="progress.ts — ShoeSharp" at={6} f={f} z={-1.2}>
    <div style={{ padding: '18px 10px', fontFamily: MONO, fontSize: 21, lineHeight: '33px' }}>
      {CODE.map((l, i) => {
        // Lines type in one by one.
        const shown = interpolate(f, [12 + i * 5, 16 + i * 5], [0, 1], clamp);
        return <div key={i} style={{ opacity: shown }}><CodeLine line={l} n={i + 120} hi={f > 170 && (i === 10 || i === 11)} /></div>;
      })}
    </div>
  </Win>
);

const AppWindow = ({ f, blur }: { f: number; blur: number }) => (
  <Win x={1110} y={110} w={420} h={840} title="Simulator — ShoeSharp" at={36} f={f} z={1.5} blur={blur}>
    <Loop durationInFrames={84}>
      <OffthreadVideo src={staticFile('en-table-1.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </Loop>
  </Win>
);

const WebcamWindow = ({ f, blur }: { f: number; blur: number }) => (
  <Win x={1560} y={640} w={320} h={250} title="Web Cam Feed" at={60} f={f} z={-2} blur={blur}>
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      background: 'radial-gradient(circle at 50% 40%, #3b3550, #121018)', color: '#bdb6d6', fontSize: 16, fontWeight: 600,
    }}>
      <div style={{ width: 90, height: 90, borderRadius: 45, background: '#5a4f80', boxShadow: '0 0 40px rgba(140,120,220,.5)' }} />
      your face here
    </div>
  </Win>
);

const ReviewWindow = ({ f }: { f: number }) => {
  if (f < 300) return null;
  return (
    <Win x={560} y={250} w={820} h={520} title="App Review — Messages" at={300} f={f} z={0.6}>
      <div style={{ padding: 32, background: '#F5F5F7', height: '100%', color: '#1d1d1f' }}>
        <div style={{ fontSize: 15, color: '#6e6e73', fontWeight: 600, letterSpacing: 1 }}>SUBMISSION · iOS 1.0.0 (11)</div>
        <div style={{ marginTop: 14, display: 'inline-block', background: '#FFE5E5', color: '#C4141B', fontWeight: 700, fontSize: 17, padding: '6px 14px', borderRadius: 8 }}>
          Guideline 2.1 · Information Needed
        </div>
        <div style={{ marginTop: 22, fontSize: 24, lineHeight: 1.45 }}>
          We need additional information to better understand the app and complete the review.
        </div>
        <div style={{ marginTop: 18, fontSize: 24, lineHeight: 1.45, background: interpolate(f, [380, 400], [0, 1], clamp) > 0.5 ? 'rgba(255,230,0,.45)' : 'transparent', display: 'inline' }}>
          1. A screen recording captured on a physical device…
        </div>
      </div>
    </Win>
  );
};

/** Animated film grain. */
const Grain = ({ f }: { f: number }) => (
  <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: 0.35, pointerEvents: 'none' }}>
    <svg width={W} height={H}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 30} /></filter>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

const LINES: [number, number, string][] = [
  [8, 150, "I'm 9in1shampoo, and I built a blackjack app with AI."],
  [160, 296, 'Thirty builds. Two simulators. One very tired Mac.'],
  [310, 470, 'Then Apple sent me this.'],
  [480, 600, 'So now I have to prove my app is real.'],
];

const Captions = ({ f }: { f: number }) => {
  const line = LINES.find(([a, b]) => f >= a && f < b);
  if (!line) return null;
  const p = interpolate(f, [line[0], line[0] + 6], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', opacity: p }}>
      <span style={{ background: 'rgba(0,0,0,.72)', color: '#fff', fontSize: 40, fontWeight: 600, padding: '8px 20px', borderRadius: 6, lineHeight: 1.6 }}>
        {line[2]}
      </span>
    </div>
  );
};

// Unused for now; kept so the icon can appear on an end card later.
export const Icon = () => <Img src={staticFile('icon.png')} />;
