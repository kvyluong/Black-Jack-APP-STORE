// Cuts the trailer's clips (src/clips.json) out of the constant-rate recordings that
// ../compose.mjs leaves in ../work/, into public/ where Remotion can load them.
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';

const CLIPS = JSON.parse(fs.readFileSync('src/clips.json', 'utf8'));
fs.mkdirSync('public', { recursive: true });
for (const [lang, scenes] of Object.entries(CLIPS))
  for (const [scene, clips] of Object.entries(scenes))
    clips.forEach((c, i) => {
      const out = `public/${lang}-${scene}-${i}.mp4`;
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(c.start), '-t', String(c.dur), '-i', `../work/cfr-${c.file}.mp4`,
        '-vf', `${c.reverse ? 'reverse,' : ''}scale=880:-2`, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-g', '1', out]);
    });
fs.copyFileSync('../../../assets/icon.png', 'public/icon.png');
console.log('ok');
