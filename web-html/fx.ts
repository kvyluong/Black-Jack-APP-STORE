// "Game feel" effects for the HTML build: chip bursts, score pop-ups, screen
// shake and card hover tilt. They live outside #app so re-renders don't cut them off.
import type { Fanfare, FanfareTier } from '../src/engine/juice';

const canvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
const popup = document.getElementById('fx-popup') as HTMLDivElement;
const ctx2d = canvas.getContext('2d');

const CHIP_COLORS = ['#e8c547', '#e5484d', '#f4f1e8', '#3e9bff', '#4ade80'];
const TIER_CLASS: Record<FanfareTier, string> = {
  blackjack: 'gold big',
  bigWin: 'gold big',
  win: 'good',
  push: 'plain',
  surrender: 'muted',
  bust: 'bad big',
  lose: 'bad',
};

interface Chip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  r: number;
  color: string;
  life: number;
}

let chips: Chip[] = [];
let raf = 0;

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function burst(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 260 + Math.random() * 420;
    chips.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 14,
      angle: Math.random() * Math.PI,
      r: 5 + Math.random() * 5,
      color: CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)],
      life: 1.4,
    });
  }
  if (!raf) {
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      raf = chips.length ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);
  }
}

function step(dt: number) {
  if (!ctx2d) return;
  ctx2d.clearRect(0, 0, innerWidth, innerHeight);
  chips = chips.filter((c) => (c.life -= dt) > 0 && c.y < innerHeight + 40);
  for (const c of chips) {
    c.vy += 1100 * dt; // gravity
    c.vx *= 0.99;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.angle += c.spin * dt;
    // A chip seen edge-on as it tumbles: an ellipse that narrows and widens.
    const squash = Math.abs(Math.cos(c.angle));
    ctx2d.globalAlpha = Math.min(1, c.life * 2);
    ctx2d.save();
    ctx2d.translate(c.x, c.y);
    ctx2d.scale(1, 0.25 + squash * 0.75);
    ctx2d.beginPath();
    ctx2d.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx2d.fillStyle = c.color;
    ctx2d.fill();
    ctx2d.setLineDash([2.5, 2.5]);
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx2d.stroke();
    ctx2d.restore();
  }
  ctx2d.globalAlpha = 1;
}

/** Shakes the page content; strength 0–1. */
export function shake(strength: number) {
  if (strength <= 0 || reducedMotion()) return;
  const app = document.getElementById('app')!;
  app.style.setProperty('--shake', `${4 + strength * 14}px`);
  app.classList.remove('shaking');
  void app.offsetWidth; // restart the animation
  app.classList.add('shaking');
}

/** Pop-up text, chip burst and shake for a finished round, centered on `anchor`. */
export function playFanfare(f: Fanfare, anchor: Element | null, effects: boolean) {
  const rect = anchor?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : innerHeight / 2;
  popup.textContent = f.label;
  popup.className = `fx-popup ${TIER_CLASS[f.tier]}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  void popup.offsetWidth;
  popup.classList.add('show');
  if (effects && !reducedMotion()) {
    if (f.particles) burst(x, y, f.particles);
    shake(f.shake);
  }
}

export function clearFanfare() {
  popup.classList.remove('show');
}

/** Cards on the table lean toward the mouse pointer (desktop only). */
export function enableCardTilt(root: HTMLElement) {
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('.hand .card, .drill .card');
    root.querySelectorAll<HTMLElement>('.card.tilt').forEach((c) => c !== card && resetTilt(c));
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add('tilt');
    card.style.setProperty('--ry', `${px * 24}deg`);
    card.style.setProperty('--rx', `${-py * 24}deg`);
    card.style.setProperty('--shine-x', `${(px + 0.5) * 100}%`);
    card.style.setProperty('--shine-y', `${(py + 0.5) * 100}%`);
  });
  root.addEventListener('pointerleave', () => root.querySelectorAll<HTMLElement>('.card.tilt').forEach(resetTilt));
}

function resetTilt(c: HTMLElement) {
  c.classList.remove('tilt');
  c.style.removeProperty('--rx');
  c.style.removeProperty('--ry');
}
