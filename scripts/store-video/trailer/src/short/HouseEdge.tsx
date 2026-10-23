// 9:16 Short: "Why the house always wins at blackjack". See BRIEF.md for the story and rules.
import { AbsoluteFill, Easing, Img, Loop, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { Mood, Stickman } from '../screenlife/Stick';
import { SUDS } from '../screenlife/Suds';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

const C = {
  felt: '#0B5D3B', feltLight: '#127A4F', feltDark: '#062F1F', cream: '#F4F1E8', gold: '#E8C547',
  red: '#FF6B6B', green: '#5BE38F', ink: '#14110F',
};
const FONT = "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif";

/** Scene start frames; each scene runs until the next one starts. */
const S = { hook: 0, first: 96, bust: 300, odds: 486, edge: 666, sixFive: 936, grid: 1116, end: 1314 };
export const DURATION = 1500;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const sp = (f: number, damping = 18, stiffness = 140) => spring({ frame: f, fps: FPS, config: { damping, stiffness } });

export const HouseEdge = () => {
  const f = useCurrentFrame();
  // The camera never sits still: a slow push-in across the whole Short.
  const push = interpolate(f, [0, DURATION], [1, 1.06]);
  return (
    <AbsoluteFill style={{ background: C.feltDark, fontFamily: FONT, overflow: 'hidden' }}>
      <Felt />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <Hook />
        <FirstToAct />
        <Odds />
        <EdgeMeter />
        <Grid />
        <Cast />
      </AbsoluteFill>
      <EndCard />
      <Disclaimer />
    </AbsoluteFill>
  );
};

/** Felt with a soft light drifting across it, and a vignette. */
const Felt = () => {
  const f = useCurrentFrame();
  const x = 50 + 30 * Math.sin(f / 150);
  const y = 30 + 15 * Math.cos(f / 120);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(80% 60% at ${x}% ${y}%, ${C.feltLight} 0%, ${C.felt} 45%, ${C.feltDark} 100%)` }}>
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 300px rgba(0,0,0,.6)' }} />
    </AbsoluteFill>
  );
};

/** A line of words that rise in one after another and lift away before `to`. */
const Words = ({ text, from, to, size, highlight = [] as number[], color = C.cream, hi = C.gold }: {
  text: string; from: number; to: number; size: number; highlight?: number[]; color?: string; hi?: string;
}) => {
  const f = useCurrentFrame();
  if (f < from - 1 || f > to + 1) return null;
  const out = interpolate(f, [to - 10, to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5, textAlign: 'center', textWrap: 'balance' }}>
      {text.split(' ').map((w, i) => {
        const p = sp(f - from - i * 3);
        return (
          <span key={i} style={{
            display: 'inline-block', margin: `0 ${size * 0.12}px`, color: highlight.includes(i) ? hi : color,
            opacity: p * (1 - out), transform: `translateY(${(1 - p) * 50 - out * 40}px)`,
            textShadow: '0 6px 24px rgba(0,0,0,.35)',
          }}>{w}</span>
        );
      })}
    </div>
  );
};

/** A caption block placed in the upper part of the frame (clear of the Shorts UI). */
const Caption = ({ top = 300, children }: { top?: number; children: React.ReactNode }) => (
  <div style={{ position: 'absolute', top, left: 70, right: 70 }}>{children}</div>
);

// ---------- 1. Hook ----------

const Hook = () => {
  const f = useCurrentFrame();
  if (f > S.first + 2) return null;
  const back = interpolate(f, [0, S.first], [1.05, 0.97]);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 80px', transform: `scale(${back})` }}>
      <Words text="Why does the house ALWAYS win at blackjack?" from={4} to={S.first} size={118} highlight={[4]} />
    </AbsoluteFill>
  );
};

// ---------- 2–3. Who plays first ----------

type Card = { r: string; s: '♠' | '♥' | '♦' | '♣' };

/** A playing card that deals in on an arc. `flip`: the frame it turns face up (hole card). */
const PlayingCard = ({ card, x, y, at, flip, tilt = 0 }: { card: Card; x: number; y: number; at: number; flip?: number; tilt?: number }) => {
  const f = useCurrentFrame();
  const p = sp(f - at, 16, 120);
  if (f < at) return null;
  const faceUp = flip === undefined || f >= flip;
  const turn = flip === undefined ? 1 : interpolate(f, [flip - 6, flip + 6], [0, 1], clamp);
  const sx = Math.abs(Math.cos(turn * Math.PI));
  const red = card.s === '♥' || card.s === '♦';
  const w = 220; const h = 308;
  return (
    <div style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h,
      transform: `translate(${(1 - p) * 420}px, ${(1 - p) * -520}px) rotate(${(1 - p) * 30 + tilt}deg) scaleX(${flip === undefined ? 1 : Math.max(0.02, sx)})`,
      opacity: p,
    }}>
      {faceUp && turn > 0.5 ? (
        <div style={{ width: '100%', height: '100%', background: '#FFFDF8', borderRadius: 22, boxShadow: '0 22px 50px rgba(0,0,0,.45)', position: 'relative', color: red ? '#C8102E' : C.ink }}>
          <div style={{ position: 'absolute', top: 14, left: 20, fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{card.r}</div>
          <div style={{ position: 'absolute', top: 70, left: 22, fontSize: 40 }}>{card.s}</div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 130 }}>{card.s}</div>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', borderRadius: 22, background: '#8E1B2C', boxShadow: '0 22px 50px rgba(0,0,0,.45), inset 0 0 0 10px #FFFDF8, inset 0 0 0 14px #E8C547' }} />
      )}
    </div>
  );
};

const Chip = ({ x, y, color }: { x: number; y: number; color: string }) => (
  <div style={{
    position: 'absolute', left: x - 55, top: y - 55, width: 110, height: 110, borderRadius: 55, background: color,
    boxShadow: '0 12px 26px rgba(0,0,0,.45), inset 0 0 0 9px rgba(255,255,255,.85), inset 0 0 0 15px ' + color,
  }} />
);

const Pill = ({ text, x, y, color, from }: { text: string; x: number; y: number; color: string; from: number }) => {
  const f = useCurrentFrame();
  if (f < from) return null;
  const p = sp(f - from, 12, 180);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translateX(-50%) scale(${0.6 + 0.4 * p})`, opacity: p,
      background: 'rgba(0,0,0,.55)', color, fontSize: 52, fontWeight: 800, padding: '12px 34px', borderRadius: 999,
      border: `3px solid ${color}`, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

const FirstToAct = () => {
  const f = useCurrentFrame();
  if (f < S.first - 2 || f > S.odds + 2) return null;
  const leave = interpolate(f, [S.odds - 14, S.odds], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  // Your chips slide away to the dealer once you bust.
  const take = interpolate(f, [S.first + 150, S.first + 180], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const shake = f > S.first + 128 && f < S.first + 142 ? Math.sin(f * 2.2) * 14 : 0;
  return (
    <AbsoluteFill style={{ opacity: 1 - leave, transform: `translateY(${leave * -120}px)` }}>
      <Caption top={250}>
        <Words text="It's not luck. It's who plays first." from={S.first + 4} to={S.bust} size={84} highlight={[4, 5, 6]} />
        <Words text="Bust, and you lose right away, even if the dealer busts after." from={S.bust + 2} to={S.odds} size={74} highlight={[0, 3, 4]} />
      </Caption>
      {/* Dealer: 10 up, hole card flips to 6, then draws a 6 for 22. */}
      <div style={{ position: 'absolute', top: 640, left: 0, right: 0, textAlign: 'center', color: C.cream, opacity: 0.75, fontSize: 36, fontWeight: 700, letterSpacing: 6 }}>DEALER</div>
      <PlayingCard card={{ r: '10', s: '♣' }} x={430} y={850} at={S.first + 30} tilt={-4} />
      <PlayingCard card={{ r: '6', s: '♦' }} x={650} y={850} at={S.first + 40} flip={S.bust + 50} tilt={4} />
      <PlayingCard card={{ r: '6', s: '♠' }} x={870} y={860} at={S.bust + 90} tilt={8} />
      <Pill text="Dealer 22 · bust" x={540} y={1030} color={C.green} from={S.bust + 104} />
      <Pill text="Too late." x={540} y={1110} color={C.cream} from={S.bust + 122} />
      {/* You: 10 + 6, hit, King: bust. */}
      <div style={{ position: 'absolute', left: shake, top: 0, width: W, height: H }}>
        <PlayingCard card={{ r: '10', s: '♥' }} x={430} y={1380} at={S.first + 26} tilt={-5} />
        <PlayingCard card={{ r: '6', s: '♣' }} x={650} y={1380} at={S.first + 36} tilt={3} />
        <PlayingCard card={{ r: 'K', s: '♠' }} x={870} y={1390} at={S.first + 110} tilt={9} />
      </div>
      <Pill text="You: BUST 26" x={540} y={1560} color={C.red} from={S.first + 124} />
      <div style={{ opacity: (1 - take) * interpolate(f, [S.first + 26, S.first + 40], [0, 1], clamp), transform: `translate(${take * 380}px, ${take * -620}px) scale(${1 - take * 0.4})` }}>
        <Chip x={190} y={1640} color="#C8102E" />
        <Chip x={205} y={1620} color="#1F7A4D" />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 4. Dealer bust odds ----------

const Odds = () => {
  const f = useCurrentFrame();
  if (f < S.odds - 2 || f > S.edge + 2) return null;
  const n = Math.round(interpolate(f, [S.odds + 20, S.odds + 80], [0, 28], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const p = sp(f - S.odds - 14, 16, 120);
  const leave = interpolate(f, [S.edge - 12, S.edge], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', opacity: 1 - leave }}>
      <Caption top={330}>
        <Words text="The dealer only busts about" from={S.odds + 4} to={S.edge} size={80} />
      </Caption>
      <div style={{ position: 'absolute', top: 500, fontSize: 320, fontWeight: 900, color: C.gold, letterSpacing: -12, opacity: p, transform: `scale(${0.7 + 0.3 * p})`, textShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
        {n}%
      </div>
      <Caption top={1390}>
        <Words text="of the time. You have to survive first." from={S.odds + 50} to={S.edge} size={70} highlight={[5, 6, 7]} />
      </Caption>
      {/* 100 hands: the 28 the dealer busts light up as the number counts. */}
      <div style={{ position: 'absolute', top: 900, left: (W - 10 * 46) / 2, width: 10 * 46, display: 'flex', flexWrap: 'wrap' }}>
        {Array.from({ length: 100 }, (_, i) => {
          const on = i < n;
          const pop = sp(f - S.odds - 10 - i * 0.6, 16, 200);
          return (
            <div key={i} style={{ width: 36, height: 36, margin: 5, borderRadius: 18, opacity: pop,
              background: on ? C.gold : 'rgba(244,241,232,.16)', boxShadow: on ? '0 0 18px rgba(232,197,71,.6)' : 'none' }} />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 5–6. House edge meter ----------

/** The meter's value over time: ~2% typical, ~0.5% with basic strategy, +1.4% at 6:5. */
const edgeAt = (f: number) => {
  const a = interpolate(f, [S.edge + 30, S.edge + 70], [0, 2.0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const b = interpolate(f, [S.edge + 150, S.edge + 190], [0, -1.5], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const c = interpolate(f, [S.sixFive + 40, S.sixFive + 70], [0, 1.4], { ...clamp, easing: Easing.out(Easing.back(2)) });
  return a + b + c;
};

const EdgeMeter = () => {
  const f = useCurrentFrame();
  if (f < S.edge - 2 || f > S.grid + 2) return null;
  const v = edgeAt(f);
  const max = 3;
  const sixFive = f >= S.sixFive + 40;
  const color = sixFive ? C.red : f >= S.edge + 150 ? C.green : C.gold;
  const leave = interpolate(f, [S.grid - 12, S.grid], [0, 1], clamp);
  const label = f < S.edge + 150 ? 'Typical player' : f < S.sixFive ? 'Perfect basic strategy' : 'Same play, 6:5 table';
  return (
    <AbsoluteFill style={{ opacity: 1 - leave, transform: `scale(${1 - leave * 0.1})` }}>
      <Caption top={280}>
        <Words text="House edge on a typical player: 2% or more" from={S.edge + 4} to={S.edge + 148} size={76} highlight={[0, 1]} />
        <Words text="Play perfect basic strategy: about 0.5%" from={S.edge + 150} to={S.sixFive} size={76} highlight={[1, 2, 3]} hi={C.green} />
        <Words text="Sit at a 6:5 table: +1.4% for the house" from={S.sixFive + 4} to={S.grid} size={76} highlight={[3, 4]} hi={C.red} />
      </Caption>
      <div style={{ position: 'absolute', top: 800, left: 120, right: 120 }}>
        <div style={{ color: C.cream, fontSize: 44, fontWeight: 700, marginBottom: 24, opacity: 0.85 }}>{label}</div>
        <div style={{ height: 120, borderRadius: 60, background: 'rgba(0,0,0,.35)', overflow: 'hidden', boxShadow: 'inset 0 4px 14px rgba(0,0,0,.4)' }}>
          <div style={{ width: `${(v / max) * 100}%`, height: '100%', borderRadius: 60, background: `linear-gradient(90deg, ${color}CC, ${color})` }} />
        </div>
        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 220, fontWeight: 900, color, letterSpacing: -6, fontVariantNumeric: 'tabular-nums' }}>
          {v.toFixed(1)}%
        </div>
        <div style={{ textAlign: 'center', fontSize: 40, color: C.cream, opacity: 0.7, fontWeight: 600 }}>of every bet, on average</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 7. Strategy grid ----------

// A simplified slice of the hard-totals chart (rows 8–17 vs dealer 2–A): H hit, S stand, D double.
const ROWS = ['17', '16', '15', '14', '13', '12', '11', '10', '9', '8'];
const UP = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
const CHART = [
  'SSSSSSSSSS', 'SSSSSHHHHH', 'SSSSSHHHHH', 'SSSSSHHHHH', 'SSSSSHHHHH',
  'HHSSSHHHHH', 'DDDDDDDDDD', 'DDDDDDDDHH', 'HDDDDHHHHH', 'HHHHHHHHHH',
];
const CELL = { H: '#E25B5B', S: '#F2C94C', D: '#4FB37A' } as Record<string, string>;

const Grid = () => {
  const f = useCurrentFrame();
  if (f < S.grid - 2 || f > S.end + 16) return null;
  const leave = interpolate(f, [S.end - 6, S.end + 14], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const size = 82;
  return (
    <AbsoluteFill style={{ opacity: 1 - leave, transform: `scale(${1 - leave * 0.25})` }}>
      <Caption top={250}>
        <Words text="So learn the right play for every hand." from={S.grid + 4} to={S.end} size={84} highlight={[3, 4]} />
      </Caption>
      <div style={{ position: 'absolute', top: 640, left: (W - size * 11) / 2 }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: size }} />
          {UP.map((u) => <div key={u} style={{ width: size, textAlign: 'center', color: C.cream, fontSize: 34, fontWeight: 800, opacity: 0.8 }}>{u}</div>)}
        </div>
        {ROWS.map((r, ri) => (
          <div key={r} style={{ display: 'flex', marginTop: 6 }}>
            <div style={{ width: size, color: C.cream, fontSize: 34, fontWeight: 800, textAlign: 'center', lineHeight: `${size - 6}px`, opacity: 0.8 }}>{r}</div>
            {CHART[ri].split('').map((c, ci) => {
              const p = sp(f - S.grid - 18 - (ri + ci) * 2.2, 14, 170);
              return (
                <div key={ci} style={{
                  width: size - 6, height: size - 6, marginRight: 6, borderRadius: 12, background: CELL[c],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink, fontWeight: 900, fontSize: 36,
                  opacity: p, transform: `scale(${0.4 + 0.6 * p})`,
                }}>{c}</div>
              );
            })}
          </div>
        ))}
      </div>
      <Caption top={1560}>
        <Words text="H hit · S stand · D double" from={S.grid + 60} to={S.end} size={46} color="rgba(244,241,232,.75)" />
      </Caption>
    </AbsoluteFill>
  );
};

// ---------- The cast: Suds stickmen reacting through the story ----------

/** One stickman that pops in at `from` and out at `to`. */
const Actor = ({ f, from, to, x, y, scale, mood, hair, shirt, seed, hairColor }: {
  f: number; from: number; to: number; x: number; y: number; scale: number; mood: Mood; hair: 'swoop' | 'cap' | 'spiky'; shirt: string; seed: number; hairColor?: string;
}) => {
  if (f < from || f > to) return null;
  const pin = sp(f - from, 12, 160);
  const out = interpolate(f, [to - 8, to], [1, 0], clamp);
  const s = scale * pin * out;
  return <Stickman f={f} mood={mood} x={x} y={y + (1 - pin) * 40} scale={s} hair={hair} shirt={shirt} seed={seed} hairColor={hairColor} />;
};

const Cast = () => {
  const f = useCurrentFrame();
  const you = { hair: 'swoop' as const, shirt: SUDS.yellow, seed: 2 };
  const dealer = { hair: 'cap' as const, shirt: SUDS.paper, seed: 9, hairColor: SUDS.mint };
  const edgeMood: Mood = f < S.edge + 150 ? 'downbad' : f < S.sixFive + 40 ? 'happy' : 'rage';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {/* Hook: you, already worried */}
      <Actor f={f} from={20} to={S.first} x={540} y={1330} scale={0.8} mood="shock" {...you} />
      {/* Who plays first: the dealer stays smug; you go from smug to rinsed when the King lands */}
      <Actor f={f} from={S.first + 24} to={S.odds - 4} x={165} y={700} scale={0.75} mood={f > S.bust + 100 ? 'scheme' : 'smug'} {...dealer} />
      <Actor f={f} from={S.first + 20} to={S.odds - 4} x={165} y={1300} scale={0.75} mood={f > S.first + 124 ? 'cry' : 'smug'} {...you} />
      {/* House edge: down bad at 2%, happy at 0.5%, tilted at the 6:5 table */}
      <Actor f={f} from={S.edge + 20} to={S.grid - 4} x={880} y={1350} scale={0.72} mood={edgeMood} {...you} />
    </svg>
  );
};

// ---------- 8. End card ----------

const EndCard = () => {
  const f = useCurrentFrame() - S.end;
  if (f < 0) return null;
  const phone = sp(f, 20, 90);
  const t = (d: number) => sp(f - d, 20);
  const pw = 400; const ph = Math.round((pw * 1912) / 880);
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 230, display: 'flex', alignItems: 'center', gap: 26, opacity: t(8), transform: `translateY(${(1 - t(8)) * 30}px)` }}>
        <Img src={staticFile('icon.png')} style={{ width: 120, height: 120, borderRadius: 28, boxShadow: '0 16px 40px rgba(0,0,0,.45)' }} />
        <div>
          <div style={{ fontSize: 92, fontWeight: 900, color: C.cream, letterSpacing: -2, lineHeight: 1 }}>ShoeSharp</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: C.gold }}>Blackjack Trainer</div>
        </div>
      </div>
      <div style={{
        position: 'absolute', top: 470, width: pw, height: ph, borderRadius: 56, overflow: 'hidden',
        transform: `translateY(${(1 - phone) * 900}px) rotate(${(1 - phone) * 6 - 2 + Math.sin(f / 40)}deg)`,
        boxShadow: '0 50px 110px rgba(0,0,0,.6), 0 0 0 10px #0B0F0D, 0 0 0 14px rgba(232,197,71,.6)',
      }}>
        <Loop durationInFrames={75}><OffthreadVideo src={staticFile('en-table-0.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Loop>
      </div>
      <div style={{ position: 'absolute', top: 470 + ph + 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: C.feltDark, background: C.gold, borderRadius: 999, padding: '14px 44px', opacity: t(30), transform: `scale(${0.85 + 0.15 * t(30)})` }}>
          A coach on every hand. Free.
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, color: C.cream, opacity: 0.85 * t(40) }}>Coming soon on iPhone & Android</div>
      </div>
    </AbsoluteFill>
  );
};

/** Always-on small print: practice only. */
const Disclaimer = () => (
  <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center', color: 'rgba(244,241,232,.55)', fontSize: 28, fontWeight: 600 }}>
    Virtual chips only · No real-money gambling · 18+
  </div>
);
