// Raw app screens for the store, per language and device. Composed into captioned frames by compose.mjs.
import { chromium } from 'playwright-core'; import { seed } from './seed.mjs';
const URL = 'http://127.0.0.1:8765/';
const DEVICES = { iphone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 }, ipad: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2 } };
const L = { en: { coach: /Ask the coach/i, deal: 'Deal', noIns: 'No insurance' }, es: { coach: /Pregúntale al coach/i, deal: 'Repartir', noIns: 'Sin seguro' } };
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const only = process.argv[2];
async function ctxFor(dev, lang, seeded) {
  const ctx = await b.newContext({ ...DEVICES[dev], locale: lang === 'es' ? 'es-MX' : 'en-US' });
  if (seeded) await ctx.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('blackjack-coach/v1', v); sessionStorage.setItem('seeded', '1'); } }, seed(lang));
  return ctx;
}
const shot = (p, name) => p.screenshot({ path: `raw/${name}.png` });
for (const dev of Object.keys(DEVICES)) for (const lang of ['en', 'es']) {
  const tag = `${dev}-${lang}`; if (only && !tag.includes(only)) continue;
  let ctx = await ctxFor(dev, lang, true); let p = await ctx.newPage();
  const go = async (r) => { await p.goto(URL + r); await p.waitForTimeout(2500); };
  const tableOnly = !!process.env.TABLE_ONLY;
  if (!tableOnly) { await go('academy'); await shot(p, `${tag}-1-academy`); }
  // Table: deal until the coach's advice is showing at your turn.
  for (let tries = 0; tries < 6; tries++) {
    await go('play');
    await p.getByText('25', { exact: true }).first().click(); await p.waitForTimeout(200);
    await p.getByText(L[lang].deal, { exact: true }).click();
    // An insurance offer is declined first: the shot should show the coach on a normal decision.
    try { await p.getByText(L[lang].coach).or(p.getByText(L[lang].noIns, { exact: true })).first().waitFor({ timeout: 20000 });
      const noIns = p.getByText(L[lang].noIns, { exact: true });
      if (await noIns.count()) { await noIns.click(); await p.getByText(L[lang].coach).first().waitFor({ timeout: 20000 }); } await p.waitForTimeout(500); const ask = p.getByText(L[lang].coach).first(); if (await ask.count()) { await ask.click(); await p.waitForTimeout(700); } await p.getByText(/Coach:/).first().waitFor({ timeout: 3000 }); break; } catch { console.log('retry deal', tag); }
  }
  await shot(p, `${tag}-2-table`);
  if (tableOnly) { await ctx.close(); console.log('done', tag); continue; }
  await go('exam'); await shot(p, `${tag}-3-exam`);
  await go('leaks'); await shot(p, `${tag}-4-leaks`);
  await go('ready'); await shot(p, `${tag}-5-ready`);
  await ctx.close();
  ctx = await ctxFor(dev, lang, false); p = await ctx.newPage();
  await go(''); await shot(p, `${tag}-6-level`);
  await ctx.close();
  console.log('done', tag);
}
await b.close();
