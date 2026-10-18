// Google Play icon (512×512) and feature graphic (1024×500), per language.
import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const icon = 'data:image/png;base64,' + fs.readFileSync(new URL('../../assets/icon.png', import.meta.url)).toString('base64');
const TAG = { en: ['Blackjack Trainer', 'Basic strategy · Card counting · Casino-ready'], es: ['Blackjack y Conteo', 'Estrategia básica · Conteo de cartas · Listo para el casino'] };
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.setContent(`<body style="margin:0"><img src="${icon}" width="512" height="512" style="display:block">`);
await p.screenshot({ path: path.join(OUT, 'icon-512.png') });
await p.setViewportSize({ width: 1024, height: 500 });
for (const [lang, [title, sub]] of Object.entries(TAG)) {
  await p.setContent(`<body style="margin:0;width:1024px;height:500px;overflow:hidden;display:flex;align-items:center;gap:56px;padding:0 70px;box-sizing:border-box;
    background:radial-gradient(90% 120% at 25% 40%,#127A4F 0%,#0B5D3B 55%,#073F28 100%);font-family:-apple-system,'SF Pro Display','Helvetica Neue',sans-serif">
    <img src="${icon}" style="width:300px;height:300px;border-radius:66px;box-shadow:0 24px 60px rgba(0,0,0,.45)">
    <div><div style="color:#F4F1E8;font-size:84px;font-weight:800;letter-spacing:-2px;line-height:1">ShoeSharp</div>
      <div style="color:#E8C547;font-size:44px;font-weight:800;margin-top:14px">${title}</div>
      <div style="color:#B7C9BE;font-size:24px;font-weight:600;margin-top:18px;line-height:1.3">${sub}</div></div></body>`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(OUT, `feature-graphic-${lang}.png`) });
}
await b.close(); console.log('ok');
