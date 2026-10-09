// Assembles the website into site-dist/: the static pages in website/ plus the
// playable browser version (html/shoesharp.html, from `npm run build:web`) as play.html.
//
//   npm run build:site            (builds the web app first)
//   node scripts/build-site.mjs --strict   (fails if REPLACE_ placeholders remain)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'website');
const out = join(root, 'site-dist');
const game = join(root, 'html', 'shoesharp.html');

if (!existsSync(game)) throw new Error('html/shoesharp.html is missing: run `npm run build:web` first.');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src, out, { recursive: true });
cpSync(game, join(out, 'play.html'));

// Placeholders the developer must fill in before launch (contact email, AdMob ID, ...).
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const todo = walk(out)
  .filter((f) => /\.(html|txt)$/.test(f) && !f.endsWith('play.html'))
  .flatMap((f) => [...new Set(readFileSync(f, 'utf8').match(/REPLACE_WITH_[A-Z_]+/g) ?? [])].map((p) => `${relative(out, f)}: ${p}`));

console.log(`Built site-dist/ (${walk(out).length} files)`);
if (todo.length) {
  console.warn(`\nStill to fill in before launch (in website/):\n  ${todo.join('\n  ')}`);
  if (process.argv.includes('--strict')) process.exit(1);
}
