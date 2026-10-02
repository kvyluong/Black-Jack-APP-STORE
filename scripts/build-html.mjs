// Builds html/blackjack-coach.html: a single self-contained file you can open by
// double-clicking (no server or install needed). Usage: npm run build:html
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [resolve(root, 'web-html/main.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  write: false,
  logLevel: 'warning',
  loader: { '.wav': 'binary' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const fragment = readFileSync(resolve(root, 'web-html/template.html'), 'utf8').replace('/*__APP_JS__*/', () => js);
const split = fragment.indexOf('<header');
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${fragment.slice(0, split)}</head>
<body>
${fragment.slice(split)}</body>
</html>
`;

mkdirSync(resolve(root, 'html'), { recursive: true });
writeFileSync(resolve(root, 'html/blackjack-coach.html'), page);
// Without the document wrapper, for hosts that add their own (e.g. a claude.ai artifact).
if (process.argv[2]) writeFileSync(resolve(process.argv[2]), fragment);
console.log(`Built html/blackjack-coach.html (${Math.round(page.length / 1024)} KB)`);
