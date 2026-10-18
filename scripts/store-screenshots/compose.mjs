// Captioned App Store frames: felt background, caption on top, the app screen below.
import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2];
const CAP = {
  en: ['Count cards like a pro', 'A coach at every decision', 'Pass the casino test', 'Find your leaks', "Know when you're ready", 'Start at your level'],
  es: ['Cuenta cartas como un pro', 'Un coach en cada decisión', 'Aprueba el examen de casino', 'Encuentra tus fugas', 'Sabe cuándo estás listo', 'Empieza a tu nivel'],
};
const SCREENS = ['1-academy', '2-table', '3-exam', '4-leaks', '5-ready', '6-level'];
const DEV = {
  iphone: { w: 1320, h: 2868, dir: 'iphone-6.9', shotW: 1040, top: 470, font: 104, radius: 72 },
  ipad: { w: 2064, h: 2752, dir: 'ipad-13', shotW: 1640, top: 430, font: 112, radius: 48 },
};
const LOC = { en: 'en-US', es: 'es-MX' };
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const [dev, d] of Object.entries(DEV)) {
  const p = await b.newPage({ viewport: { width: d.w, height: d.h } });
  for (const lang of ['en', 'es']) {
    const dir = path.join(OUT, d.dir, LOC[lang]); fs.mkdirSync(dir, { recursive: true });
    for (const [i, s] of SCREENS.entries()) {
      const img = 'data:image/png;base64,' + fs.readFileSync(`raw/${dev}-${lang}-${s}.png`).toString('base64');
      await p.setContent(`<html><body style="margin:0;width:${d.w}px;height:${d.h}px;overflow:hidden;
        background:radial-gradient(120% 70% at 50% 0%,#127A4F 0%,#0B5D3B 55%,#073F28 100%);font-family:-apple-system,'SF Pro Display','Helvetica Neue',sans-serif">
        <div style="position:absolute;top:0;left:0;right:0;height:${d.top}px;display:flex;align-items:center;justify-content:center;padding:0 90px;box-sizing:border-box">
          <div style="color:#F4F1E8;font-weight:800;font-size:${d.font}px;line-height:1.08;text-align:center;letter-spacing:-1px">
            ${CAP[lang][i].replace(/^(\S+\s\S+)/, '<span style="color:#E8C547">$1</span>')}</div></div>
        <img src="${img}" style="position:absolute;top:${d.top}px;left:${(d.w - d.shotW) / 2}px;width:${d.shotW}px;border-radius:${d.radius}px;
          box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 6px rgba(232,197,71,.55)"></body></html>`);
      await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(dir, `0${i + 1}-${s.slice(2)}.jpg`), type: 'jpeg', quality: 90 });
    }
  }
}
await b.close(); console.log('ok');
