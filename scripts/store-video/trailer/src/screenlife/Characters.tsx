// Flat explainer-style cartoon characters (big round heads, dot eyes, outlined shapes, flat colors),
// with idle breathing, blinking and a talking mouth. Original designs.

const INK = '#2B2420';
const SKIN = '#F6D2B0';
const STROKE = { stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export type Kind = 'emperor' | 'admiral';

/** Mouth openness for the frame: chatters while talking, closed otherwise. */
const mouthOpen = (f: number, talking: boolean) => (talking ? Math.abs(Math.sin(f * 0.55)) * (0.6 + 0.4 * Math.sin(f * 0.13)) : 0);
/** Blink every ~3 s for a few frames. */
const blinking = (f: number, offset: number) => (f + offset) % 96 < 4;

export const Character = ({ kind, f, talking = false, size = 300, flip = false }: { kind: Kind; f: number; talking?: boolean; size?: number; flip?: boolean }) => {
  const breathe = 1 + 0.012 * Math.sin(f / 14);
  const tilt = (talking ? 2.5 : 1) * Math.sin(f / 22);
  const open = mouthOpen(f, talking);
  const blink = blinking(f, kind === 'emperor' ? 0 : 40);
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 240 300" style={{ transform: flip ? 'scaleX(-1)' : undefined, overflow: 'visible' }}>
      <g transform={`translate(120 300) scale(1 ${breathe}) translate(-120 -300)`}>
        {kind === 'emperor' ? <EmperorBody /> : <AdmiralBody f={f} />}
        <g transform={`rotate(${tilt} 120 150)`}>
          {kind === 'emperor' ? <EmperorHead open={open} blink={blink} /> : <AdmiralHead open={open} blink={blink} />}
        </g>
      </g>
    </svg>
  );
};

const Face = ({ open, blink, brow }: { open: number; blink: boolean; brow: 'stern' | 'soft' }) => (
  <g>
    {/* Eyes */}
    {[96, 144].map((x) => (
      <g key={x}>
        {blink ? (
          <path d={`M${x - 9} 118 q9 5 18 0`} fill="none" {...STROKE} strokeWidth={4} />
        ) : (
          <>
            <ellipse cx={x} cy={117} rx={10} ry={12} fill="#fff" {...STROKE} strokeWidth={3.5} />
            <circle cx={x + 2} cy={119} r={5} fill={INK} />
          </>
        )}
      </g>
    ))}
    {/* Brows */}
    {brow === 'stern' ? (
      <>
        <path d="M82 98 L108 104" fill="none" {...STROKE} strokeWidth={5} />
        <path d="M158 98 L132 104" fill="none" {...STROKE} strokeWidth={5} />
      </>
    ) : (
      <>
        <path d="M84 102 q12 -6 24 -2" fill="none" {...STROKE} strokeWidth={4.5} />
        <path d="M132 100 q12 -4 24 2" fill="none" {...STROKE} strokeWidth={4.5} />
      </>
    )}
    {/* Nose */}
    <path d="M120 126 q-5 9 2 11" fill="none" {...STROKE} strokeWidth={3} />
    {/* Mouth */}
    {open > 0.08 ? (
      <ellipse cx={120} cy={152} rx={12} ry={3 + 9 * open} fill="#7A2E2E" {...STROKE} strokeWidth={3.5} />
    ) : (
      <path d={brow === 'stern' ? 'M108 152 L132 152' : 'M106 149 q14 9 28 0'} fill="none" {...STROKE} strokeWidth={4} />
    )}
  </g>
);

// ---------- The Emperor: blond, black-and-silver uniform, white cape ----------

const EmperorBody = () => (
  <g>
    {/* Cape */}
    <path d="M52 205 Q40 270 30 300 L210 300 Q200 270 188 205 Z" fill="#F4F2F8" {...STROKE} />
    {/* Jacket */}
    <path d="M70 200 Q120 185 170 200 L182 300 L58 300 Z" fill="#1E1E26" {...STROKE} />
    {/* Silver trim and buttons */}
    <path d="M120 196 L120 300" stroke="#C9CDD6" strokeWidth={6} />
    {[222, 248, 274].map((y) => <circle key={y} cx={132} cy={y} r={4.5} fill="#E3B54A" stroke={INK} strokeWidth={2} />)}
    <path d="M70 212 L98 220 M170 212 L142 220" stroke="#C9CDD6" strokeWidth={6} strokeLinecap="round" />
    {/* High collar */}
    <path d="M96 186 L120 204 L144 186" fill="#1E1E26" {...STROKE} />
  </g>
);

const EmperorHead = ({ open, blink }: { open: number; blink: boolean }) => (
  <g>
    {/* Back hair */}
    <path d="M46 120 Q40 36 120 30 Q200 36 194 120 Q206 170 188 206 Q178 196 172 210 Q160 196 150 206 L90 206 Q80 196 68 210 Q62 196 52 206 Q34 170 46 120 Z" fill="#F2C94C" {...STROKE} />
    {/* Head */}
    <ellipse cx={120} cy={125} rx={62} ry={66} fill={SKIN} {...STROKE} />
    <Face open={open} blink={blink} brow="stern" />
    {/* Bangs: sweeping golden locks over the forehead */}
    <path d="M58 112 Q62 54 120 50 Q178 54 182 112 Q168 84 148 92 Q138 70 120 88 Q104 68 92 92 Q74 82 58 112 Z" fill="#F2C94C" {...STROKE} />
    <path d="M58 112 Q50 150 60 186" fill="none" stroke="#F2C94C" strokeWidth={16} strokeLinecap="round" />
    <path d="M182 112 Q190 150 180 186" fill="none" stroke="#F2C94C" strokeWidth={16} strokeLinecap="round" />
    <path d="M70 100 q14 -10 24 4 M146 104 q12 -14 26 -4" fill="none" stroke="#D9A92C" strokeWidth={3} strokeLinecap="round" />
  </g>
);

// ---------- The Admiral: messy black hair, black beret, olive jacket, teacup ----------

const AdmiralBody = ({ f }: { f: number }) => {
  const sip = Math.sin(f / 30) * 4;
  return (
    <g>
      {/* Jacket */}
      <path d="M64 200 Q120 186 176 200 L188 300 L52 300 Z" fill="#6B7A4E" {...STROKE} />
      {/* Neckerchief */}
      <path d="M100 192 L120 222 L140 192 Z" fill="#F4F2E8" {...STROKE} strokeWidth={4} />
      {/* Arm with teacup */}
      <path d="M170 222 Q196 246 172 268" fill="none" stroke="#5E6B44" strokeWidth={26} strokeLinecap="round" />
      <path d="M170 222 Q196 246 172 268" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
      <g transform={`translate(0 ${sip})`}>
        <path d="M150 248 L182 248 L178 272 Q166 280 154 272 Z" fill="#FFFFFF" {...STROKE} strokeWidth={4} />
        <path d="M182 254 q12 4 0 12" fill="none" {...STROKE} strokeWidth={4} />
        <path d="M160 238 q4 -8 0 -14 M170 238 q4 -8 0 -14" fill="none" stroke="#B8B8B8" strokeWidth={3} strokeLinecap="round" />
      </g>
    </g>
  );
};

const AdmiralHead = ({ open, blink }: { open: number; blink: boolean }) => (
  <g>
    {/* Messy hair */}
    <path d="M56 130 Q44 70 92 52 Q120 40 150 52 Q198 70 184 130 Q180 102 166 96 L74 96 Q60 102 56 130 Z" fill="#2A2A30" {...STROKE} />
    <ellipse cx={120} cy={128} rx={60} ry={64} fill={SKIN} {...STROKE} />
    <Face open={open} blink={blink} brow="soft" />
    {/* Fringe */}
    <path d="M62 104 Q78 80 96 94 Q108 78 122 92 Q136 78 150 94 Q166 82 180 104 Q170 74 120 70 Q70 74 62 104 Z" fill="#2A2A30" {...STROKE} />
    {/* Beret with a star */}
    <path d="M62 82 Q60 40 124 38 Q186 40 182 78 Q150 66 120 70 Q88 66 62 82 Z" fill="#1A1A1F" {...STROKE} />
    <circle cx={160} cy={58} r={9} fill="#F4F2E8" stroke={INK} strokeWidth={3} />
  </g>
);
