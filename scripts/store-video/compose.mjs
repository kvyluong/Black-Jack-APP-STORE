// App Store app previews from simulator recordings (the 16:9 trailer is in trailer/, built with Remotion).
// Each shot: a caption frame drawn in Chrome (felt, caption, rounded window), the recording
// placed in the window, then the shots joined with short crossfades. Cut list: cuts.json.
// Usage: node compose.mjs <out dir>
import { chromium } from 'playwright-core'; import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';

const OUT = process.argv[2]; const FADE = 0.35; const FPS = 30;
const CUTS = JSON.parse(fs.readFileSync('cuts.json', 'utf8'));
const CAP = {
  en: { level: 'Start at your level', table: 'A coach at every decision', count: 'Count cards like a pro', exam: 'Pass the casino test', ready: "Know when you're ready" },
  es: { level: 'Empieza a tu nivel', table: 'Un coach en cada decisión', count: 'Cuenta cartas como un pro', exam: 'Aprueba el examen de casino', ready: 'Sabe cuándo estás listo' },
};
// The recording sits under the caption band (`top` px), `winW` px wide; its height follows its shape.
const FORMATS = {
  iphone: { w: 886, h: 1920, src: 'iphone', top: 300, winW: 700, font: 64, radius: 44, file: 'iphone-6.9' },
  ipad: { w: 1200, h: 1600, src: 'ipad', top: 230, winW: 1000, font: 66, radius: 28, file: 'ipad-13' },
};
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });
const probe = (f) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);

// The simulator only writes a frame when the screen changes, so a still screen has no frames
// to cut into. A constant-rate copy repeats the last frame through every still moment, and
// holds the final frame 10 s (a recording of a screen that never changes is under a second).
function cfr(file) {
  const out = path.join('work', `cfr-${file.replace(/\.\w+$/, '')}.mp4`);
  if (!fs.existsSync(out)) sh('ffmpeg', ['-y', '-i', path.join('raw', file), '-vf', `fps=${FPS},tpad=stop_mode=clone:stop_duration=10`, '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', out]);
  return out;
}

const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
fs.mkdirSync('work', { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
// ONLY=iphone-en (or any part of "<format>-<lang>") renders just that one.
const ONLY = process.env.ONLY ?? '';
for (const [name, f] of Object.entries(FORMATS)) {
  const p = await b.newPage({ viewport: { width: f.w, height: f.h } });
  for (const lang of ['en', 'es']) {
    const shots = CUTS[f.src]?.[lang]; const parts = [];
    if (!shots || !`${name}-${lang}`.includes(ONLY)) continue;
    for (const [i, s] of shots.entries()) {
      const src = cfr(s.file); const [rw, rh] = probe(src);
      const win = { w: f.winW, h: Math.round((f.winW * rh) / rw / 2) * 2, x: (f.w - f.winW) / 2, y: f.top };
      const cap = CAP[lang][s.caption].replace(/^(\S+\s\S+)/, '<span style="color:#E8C547">$1</span>');
      const capBox = `left:0;right:0;top:0;height:${f.top}px;justify-content:center;text-align:center;padding:0 60px`;
      // The felt is drawn with a rounded hole for the recording, which is layered underneath.
      await p.setContent(`<html><body style="margin:0;width:${f.w}px;height:${f.h}px;overflow:hidden;background:transparent;font-family:-apple-system,'SF Pro Display','Helvetica Neue',sans-serif">
        <svg width="${f.w}" height="${f.h}" style="position:absolute;inset:0"><defs>
          <radialGradient id="g" cx="50%" cy="0%" r="120%"><stop offset="0" stop-color="#127A4F"/><stop offset=".55" stop-color="#0B5D3B"/><stop offset="1" stop-color="#073F28"/></radialGradient>
          <mask id="m"><rect width="100%" height="100%" fill="#fff"/><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="${f.radius}" fill="#000"/></mask></defs>
          <rect width="100%" height="100%" fill="url(#g)" mask="url(#m)"/>
          <rect x="${win.x - 3}" y="${win.y - 3}" width="${win.w + 6}" height="${win.h + 6}" rx="${f.radius + 3}" fill="none" stroke="rgba(232,197,71,.6)" stroke-width="6"/></svg>
        <div style="position:absolute;${capBox};display:flex;align-items:center;box-sizing:border-box">
          <div style="color:#F4F1E8;font-weight:800;font-size:${f.font}px;line-height:1.08;letter-spacing:-1px;text-wrap:balance">${cap}</div></div></body></html>`);
      const frame = path.resolve('work', `${name}-${lang}-${i}.png`);
      await p.screenshot({ path: frame, omitBackground: true });
      const part = path.resolve('work', `${name}-${lang}-${i}.mp4`); parts.push({ part, dur: s.dur });
      sh('ffmpeg', ['-y', '-ss', String(s.start), '-t', String(s.dur), '-i', src, '-loop', '1', '-t', String(s.dur), '-i', frame,
        '-filter_complex', `color=c=#073F28:s=${f.w}x${f.h}:r=${FPS}:d=${s.dur}[bg];[0:v]fps=${FPS},${s.reverse ? 'reverse,' : ''}scale=${win.w}:${win.h}:flags=lanczos,setsar=1[v];[bg][v]overlay=${win.x}:${win.y}[a];[a][1:v]overlay=0:0,format=yuv420p[out]`,
        '-map', '[out]', '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', part]);
    }
    // Crossfade the shots together, then add the silent stereo track App Store Connect expects.
    let chain = '', last = '[0:v]', t = 0;
    for (let i = 1; i < parts.length; i++) {
      t += parts[i - 1].dur - FADE;
      chain += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${t.toFixed(2)}[x${i}];`; last = `[x${i}]`;
    }
    const total = t + parts.at(-1).dur;
    const out = path.join(OUT, `${f.file}-${lang}.mp4`);
    sh('ffmpeg', ['-y', ...parts.flatMap((x) => ['-i', x.part]), '-f', 'lavfi', '-t', total.toFixed(2), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-filter_complex', chain + `${last}fps=${FPS},format=yuv420p[v]`, '-map', '[v]', '-map', `${parts.length}:a`,
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-crf', '18', '-preset', 'slow', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]);
    console.log(out, total.toFixed(1) + 's');
  }
}
await b.close();
