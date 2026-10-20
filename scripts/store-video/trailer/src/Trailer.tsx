// The 16:9 trailer (YouTube / Google Play): one phone stays on screen the whole time, tilted
// in 3D and drifting, while its screen moves through the app; the headline beside it changes
// with each scene. Footage is the simulator recordings cut by prep.mjs (src/clips.json).
import { AbsoluteFill, Easing, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import CLIPS from './clips.json';

export const FPS = 30;
type Lang = 'en' | 'es';
type Scene = 'level' | 'table' | 'count' | 'exam' | 'ready';
const SCENES: Scene[] = ['level', 'table', 'count', 'exam', 'ready'];

const C = { felt: '#0B5D3B', feltLight: '#127A4F', feltDark: '#062F1F', cream: '#F4F1E8', gold: '#E8C547' };
const FONT = "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif";
/** Frames: the opening line, the end card, and the crossfade between clips on the phone. */
const HOOK = 64; const END = 100; const XF = 8;

const TEXT: Record<Lang, { hook: string; scenes: Record<Scene, [string, string]>; end: [string, string, string] }> = {
  en: {
    hook: 'Blackjack, the way the pros learn it.',
    scenes: {
      level: ['Any level', 'Start at your level'],
      table: ['Basic strategy coach', 'A coach at every decision'],
      count: ['Hi-Lo counting', 'Count cards like a pro'],
      exam: ['Casino conditions', 'Pass the casino test'],
      ready: ['Casino-ready score', "Know when you're ready"],
    },
    end: ['ShoeSharp', 'Blackjack Trainer', 'Free on iPhone, iPad and Android'],
  },
  es: {
    hook: 'Blackjack, como lo aprenden los pros.',
    scenes: {
      level: ['Cualquier nivel', 'Empieza a tu nivel'],
      table: ['Coach de estrategia básica', 'Un coach en cada decisión'],
      count: ['Conteo Hi-Lo', 'Cuenta cartas como un pro'],
      exam: ['Condiciones de casino', 'Aprueba el examen de casino'],
      ready: ['Puntaje para el casino', 'Sabe cuándo estás listo'],
    },
    end: ['ShoeSharp', 'Entrenador de blackjack', 'Gratis en iPhone, iPad y Android'],
  },
};

type Clip = { file: string; start: number; dur: number };
const clipsOf = (lang: Lang, s: Scene) => (CLIPS as Record<Lang, Record<Scene, Clip[]>>)[lang][s];
const frames = (c: Clip) => Math.round(c.dur * FPS);

/** When each scene's footage starts and how long it runs; scenes overlap by XF for the crossfade. */
function timeline(lang: Lang) {
  let t = HOOK; const out = {} as Record<Scene, { from: number; len: number }>;
  for (const s of SCENES) {
    const len = clipsOf(lang, s).reduce((n, c) => n + frames(c), 0) - XF * (clipsOf(lang, s).length - 1);
    out[s] = { from: t, len }; t += len - XF;
  }
  return { scenes: out, endFrom: t - 4 };
}
export const totalFrames = (lang: Lang) => timeline(lang).endFrom + END;

export const Trailer = ({ lang }: { lang: Lang }) => {
  const frame = useCurrentFrame(); const tl = timeline(lang);
  // The whole stage pushes in slowly, so the camera never sits still.
  const push = interpolate(frame, [0, totalFrames(lang)], [1, 1.07]);
  return (
    <AbsoluteFill style={{ background: C.feltDark, fontFamily: FONT, overflow: 'hidden' }}>
      <Felt />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <Hook text={TEXT[lang].hook} />
        {SCENES.map((s, i) => (
          <Headline key={s} kicker={TEXT[lang].scenes[s][0]} text={TEXT[lang].scenes[s][1]}
            from={s === 'level' ? HOOK - 8 : tl.scenes[s].from + 4}
            to={i < SCENES.length - 1 ? tl.scenes[SCENES[i + 1]].from + 4 : tl.endFrom} />
        ))}
        <Phone lang={lang} tl={tl} />
      </AbsoluteFill>
      <EndCard lines={TEXT[lang].end} from={tl.endFrom} />
    </AbsoluteFill>
  );
};

/** Felt background with a soft light that drifts across it. */
const Felt = () => {
  const f = useCurrentFrame();
  const x = 30 + 25 * Math.sin(f / 140); const y = 20 + 12 * Math.cos(f / 110);
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(70% 90% at ${x}% ${y}%, ${C.feltLight} 0%, ${C.felt} 45%, ${C.feltDark} 100%)`,
    }}>
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 260px rgba(0,0,0,.55)' }} />
    </AbsoluteFill>
  );
};

/** Words rise in one after another; the whole line lifts away just before the next. */
const Words = ({ text, from, to, size, gold = 2 }: { text: string; from: number; to: number; size: number; gold?: number }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [to - 10, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  return (
    <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, color: C.cream, textWrap: 'balance' }}>
      {text.split(' ').map((w, i) => {
        const p = spring({ frame: f - from - i * 3, fps: FPS, config: { damping: 18, stiffness: 140 } });
        return (
          <span key={i} style={{
            display: 'inline-block', marginRight: size * 0.24, color: i < gold ? C.gold : C.cream,
            opacity: p * (1 - out), transform: `translateY(${(1 - p) * 46 - out * 34}px)`,
          }}>{w}</span>
        );
      })}
    </div>
  );
};

const Hook = ({ text }: { text: string }) => {
  const f = useCurrentFrame(); if (f > HOOK) return null;
  // Centred, then it drifts back and lifts away as the phone rises in.
  const back = interpolate(f, [0, HOOK], [1.04, 0.96]);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 260px', transform: `scale(${back})` }}>
      <div style={{ textAlign: 'center', maxWidth: 1250 }}><Words text={text} from={4} to={44} size={112} gold={1} /></div>
    </AbsoluteFill>
  );
};

const Headline = ({ kicker, text, from, to }: { kicker: string; text: string; from: number; to: number }) => {
  const f = useCurrentFrame(); if (f < from - 2 || f > to + 2) return null;
  const k = spring({ frame: f - from, fps: FPS, config: { damping: 20 } });
  const out = interpolate(f, [to - 10, to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 200, width: 1110 }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 7, textTransform: 'uppercase', color: C.gold,
        opacity: 0.9 * k * out, marginBottom: 26, transform: `translateX(${(1 - k) * -30}px)` }}>{kicker}</div>
      <Words text={text} from={from + 4} to={to} size={92} />
    </AbsoluteFill>
  );
};

/** The phone: rises in during the hook, drifts and swings a little at every scene change, flies off at the end. */
const Phone = ({ lang, tl }: { lang: Lang; tl: ReturnType<typeof timeline> }) => {
  const f = useCurrentFrame();
  const W = 392; const H = Math.round((W * 2868) / 1320);
  const rise = spring({ frame: f - 38, fps: FPS, config: { damping: 22, stiffness: 80 } });
  const leave = interpolate(f, [tl.endFrom - 6, tl.endFrom + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  let swing = 0;
  for (const s of SCENES.slice(1)) {
    const p = f - tl.scenes[s].from;
    if (p > -XF && p < 40) swing += 7 * Math.sin(Math.min(1, Math.max(0, (p + XF) / 34)) * Math.PI);
  }
  const ry = -17 + 3.5 * Math.sin(f / 85) + swing - leave * 30;
  const rx = 4 + 1.6 * Math.sin(f / 67);
  const y = (1 - rise) * 1150 + 10 * Math.sin(f / 53);
  const x = 1330 + leave * 950;
  return (
    <div style={{ position: 'absolute', left: x - W / 2, top: 540 - H / 2 - 4, width: W, height: H, perspective: 1800 }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 64, position: 'relative', overflow: 'hidden',
        transform: `translateY(${y}px) rotateY(${ry}deg) rotateX(${rx}deg)`,
        boxShadow: `0 60px 120px rgba(0,0,0,.55), 0 0 0 10px #0B0F0D, 0 0 0 14px rgba(232,197,71,.55)`,
      }}>
        <Sequence from={0} durationInFrames={HOOK}><Freeze frame={0}><Footage src={`${lang}-level-0.mp4`} /></Freeze></Sequence>
        {SCENES.flatMap((s) => {
          let t = tl.scenes[s].from;
          return clipsOf(lang, s).map((c, i) => {
            const from = t; t += frames(c) - XF;
            return (
              <Sequence key={`${s}${i}`} from={from} durationInFrames={frames(c)}>
                <FadeIn first={s === 'level' && i === 0}><Footage src={`${lang}-${s}-${i}.mp4`} /></FadeIn>
              </Sequence>
            );
          });
        })}
        {/* The last frame of the ready scene holds until the phone has gone. */}
        <Sequence from={tl.scenes.ready.from + tl.scenes.ready.len - 1}>
          <Freeze frame={frames(clipsOf(lang, 'ready')[0]) - 2}><Footage src={`${lang}-ready-0.mp4`} /></Freeze>
        </Sequence>
        <AbsoluteFill style={{ background: 'linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 38%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
};

const Footage = ({ src }: { src: string }) => (
  <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
);

const FadeIn = ({ first, children }: { first: boolean; children: React.ReactNode }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: first ? 1 : interpolate(f, [0, XF], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>;
};

const EndCard = ({ lines, from }: { lines: [string, string, string]; from: number }) => {
  const f = useCurrentFrame() - from; if (f < 0) return null;
  const icon = spring({ frame: f - 8, fps: FPS, config: { damping: 14, stiffness: 120 } });
  const t = (d: number) => spring({ frame: f - d, fps: FPS, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 0 }}>
      <Img src={staticFile('icon.png')} style={{ width: 220, height: 220, borderRadius: 50, marginBottom: 40,
        transform: `scale(${0.6 + 0.4 * icon}) rotate(${(1 - icon) * -8}deg)`, opacity: icon,
        boxShadow: '0 30px 80px rgba(0,0,0,.5), 0 0 0 4px rgba(232,197,71,.6)' }} />
      <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -3, color: C.cream, opacity: t(16), transform: `translateY(${(1 - t(16)) * 30}px)` }}>{lines[0]}</div>
      <div style={{ fontSize: 44, fontWeight: 700, color: C.gold, marginTop: 6, opacity: t(22), transform: `translateY(${(1 - t(22)) * 24}px)` }}>{lines[1]}</div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: C.cream, marginTop: 46, opacity: 0.8 * t(32) }}>{lines[2]}</div>
    </AbsoluteFill>
  );
};
