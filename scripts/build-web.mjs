// Builds the phone app for the web (Expo web export), then folds it into one
// self-contained HTML file: html/blackjack-coach.html. Double-click it to play
// in any desktop browser, no server needed. Sounds and images are inlined.
//
//   npm run build:web
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'html', 'blackjack-coach.html');

if (!process.env.SKIP_EXPORT) execSync('npx expo export --platform web --output-dir dist --clear', { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1' } });

const MIME = { '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const dataUri = (file) => `data:${MIME[extname(file)] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`;

let html = readFileSync(join(dist, 'index.html'), 'utf8');
const src = html.match(/<script src="([^"]+)" defer><\/script>/)?.[1];
if (!src) throw new Error('No bundle <script> found in dist/index.html');
let js = readFileSync(join(dist, src), 'utf8');

// Every bundled asset is referenced as a "/assets/..." string; swap each for a data: URI.
let inlined = 0;
js = js.replace(/"(\/assets\/[^"]+?\.(?:wav|png|jpg|ttf))"/g, (whole, path) => {
  const file = join(dist, path);
  if (!existsSync(file)) return whole;
  inlined++;
  return JSON.stringify(dataUri(file));
});

// The router reads the page path and changes it with history.pushState. A file opened
// from disk can't change its path (browsers block it for file:// pages), so the bundle
// runs with its own `window`, `location` and `history` that keep the route in the
// #hash instead: /tables becomes blackjack-coach.html#/tables. Works the same when hosted.
const shim = `(() => {
  const real = window;
  const route = () => {
    const h = real.location.hash.replace(/^#/, '') || '/';
    const u = new URL(h.startsWith('/') ? h : '/' + h, 'https://blackjack.local');
    return u;
  };
  const toHash = (url) => {
    if (url == null) return undefined;
    const u = new URL(String(url), route());
    return '#' + u.pathname + u.search + u.hash;
  };
  const location = new Proxy({}, {
    get(_, key) {
      const u = route();
      if (key === 'toString' || key === 'valueOf') return () => u.href;
      if (key === 'assign' || key === 'replace') return (url) => real.location[key](toHash(url));
      if (key === 'reload') return () => real.location.reload();
      return u[key];
    },
    set(_, key, value) {
      if (key === 'href' || key === 'pathname') real.location.hash = toHash(value).slice(1);
      return true;
    },
  });
  const history = {
    get length() { return real.history.length; },
    get state() { return real.history.state; },
    get scrollRestoration() { return real.history.scrollRestoration; },
    set scrollRestoration(v) { real.history.scrollRestoration = v; },
    pushState: (state, title, url) => real.history.pushState(state, title, toHash(url)),
    replaceState: (state, title, url) => real.history.replaceState(state, title, toHash(url)),
    go: (n) => real.history.go(n),
    back: () => real.history.back(),
    forward: () => real.history.forward(),
  };
  const bound = new Map();
  const win = new Proxy(real, {
    get(target, key) {
      if (key === 'location') return location;
      if (key === 'history') return history;
      if (key === 'window' || key === 'self' || key === 'globalThis') return win;
      const v = Reflect.get(target, key);
      // Methods like addEventListener must run against the real window.
      if (typeof v !== 'function' || /^[A-Z]/.test(String(key))) return v;
      if (bound.get(key)?.v !== v) bound.set(key, { v, f: v.bind(target) });
      return bound.get(key).f;
    },
    set(target, key, value) {
      return Reflect.set(target, key, value);
    },
  });
  return { win, location, history };
})()`;
const wrapped = `(function (window, location, history, self) {\n${js}\n}).call(__bj.win, __bj.win, __bj.location, __bj.history, __bj.win);`;
const boot = `<script>var __bj = ${shim};</script>`;

html = html
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${dataUri(join(dist, 'favicon.ico'))}"/>`)
  .replace(/<script src="[^"]+" defer><\/script>/, () => `${boot}<script>${wrapped.replace(/<\/script/gi, '<\\/script')}</script>`);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Built ${out.replace(root + '/', '')} (${Math.round(html.length / 1024)} KB, ${inlined} assets inlined)`);
