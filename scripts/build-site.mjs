// Assembles the website into site-dist/: the static pages in website/ plus the
// playable browser version (html/shoesharp.html, from `npm run build:web`) as play.html.
//
//   npm run build:site            (builds the web app first)
//   node scripts/build-site.mjs --strict   (fails if REPLACE_ placeholders remain)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

// ---------- SEO ----------
// The site's address comes from app.json (`extra.website`), so moving to a custom domain is
// a one-line change there. Pages use %SITE% wherever an absolute URL is needed
// (canonical, hreflang, Open Graph), which search engines and link previews require.
const appJson = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const site = String(appJson.expo?.extra?.website ?? '').replace(/\/$/, '');
if (!site) throw new Error('app.json expo.extra.website is missing (the site address).');

const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const stripTags = (t) =>
  t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/** Structured data for Google: the app itself, plus the FAQ built from the page's own <details>. */
function structuredData(html, lang, path) {
  const url = `${site}/${path}`;
  const app = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'ShoeSharp',
    alternateName: lang === 'es' ? 'ShoeSharp: Blackjack y Conteo' : 'ShoeSharp: Blackjack Trainer',
    url,
    inLanguage: ['en', 'es'],
    operatingSystem: 'iOS',
    applicationCategory: 'GameApplication',
    applicationSubCategory: lang === 'es' ? 'Entrenador de blackjack y conteo de cartas' : 'Blackjack and card counting trainer',
    description: stripTags(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
    image: `${site}/img/table-${lang}.jpg`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  const faq = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)].map((m) => ({
    '@type': 'Question',
    name: stripTags(m[1]),
    acceptedAnswer: { '@type': 'Answer', text: stripTags(m[2]) },
  }));
  const blocks = [jsonLd(app)];
  if (faq.length) blocks.push(jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq }));
  return blocks.join('\n');
}

for (const f of walk(out).filter((f) => /\.(html|txt|xml)$/.test(f) && !f.endsWith('play.html'))) {
  let text = readFileSync(f, 'utf8').replaceAll('%SITE%', site);
  const rel = relative(out, f).replace(/\\/g, '/');
  if (rel === 'index.html' || rel === 'es/index.html') {
    const lang = rel.startsWith('es/') ? 'es' : 'en';
    text = text.replace('</head>', `${structuredData(text, lang, lang === 'es' ? 'es/' : '')}\n</head>`);
  }
  writeFileSync(f, text);
}

// The playable browser version: a real title, description and preview instead of the bare
// "ShoeSharp" the web export ships with, plus structured data as a free web app.
{
  const title = 'Play Free Blackjack Trainer Online: Card Counting Practice | ShoeSharp';
  const description =
    'Play blackjack free in your browser with a coach: basic strategy, card counting drills and a casino table. No download, no sign-up, play money only.';
  const head = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${site}/play.html" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${site}/play.html" />`,
    `<meta property="og:image" content="${site}/img/table-en.jpg" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'ShoeSharp (browser version)',
      url: `${site}/play.html`,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }),
  ].join('\n    ');
  const file = join(out, 'play.html');
  const html = readFileSync(file, 'utf8')
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>\n    ${head}`);
  writeFileSync(file, html);
}

// sitemap.xml (with the English/Spanish pairs) and robots.txt.
{
  const pairs = [
    ['', 'es/', '1.0'],
    ['play.html', null, '0.9'],
    ['privacy.html', 'es/privacidad.html', '0.3'],
    ['terms.html', 'es/terminos.html', '0.3'],
  ];
  const urls = pairs.flatMap(([en, es, priority]) => {
    const alts = es
      ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${site}/${en}"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${site}/${es}"/>`
      : '';
    return [en, es].filter((p) => p !== null).map((p) => `  <url>\n    <loc>${site}/${p}</loc>${alts}\n    <priority>${priority}</priority>\n  </url>`);
  });
  writeFileSync(
    join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
  );
  // Crawlers only read robots.txt at the root of a domain, so it takes effect once the site
  // has its own domain; submit the sitemap in Google Search Console either way.
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
}

// Placeholders the developer must fill in before launch (contact email, AdMob ID, ...).
const todo = walk(out)
  .filter((f) => /\.(html|txt)$/.test(f) && !f.endsWith('play.html'))
  .flatMap((f) => [...new Set(readFileSync(f, 'utf8').match(/REPLACE_WITH_[A-Z_]+/g) ?? [])].map((p) => `${relative(out, f)}: ${p}`));

console.log(`Built site-dist/ (${walk(out).length} files)`);
if (todo.length) {
  console.warn(`\nStill to fill in before launch (in website/):\n  ${todo.join('\n  ')}`);
  if (process.argv.includes('--strict')) process.exit(1);
}
