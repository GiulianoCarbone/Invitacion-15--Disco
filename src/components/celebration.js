/**
 * Festejo al confirmar asistencia: "¡Estás en la lista!", con la estética de la bola.
 *  - Desde el botón: un destello, dos ondas de neón y rayos de luz que salen disparados.
 *  - Arriba: el cartel con el mismo estallido de rayos de la portada detrás.
 *  - Desde las esquinas de abajo: dos cañones de espejitos que giran, brillan cuando
 *    les da la luz (como la bola) y caen flotando.
 * Una sola capa encima de todo y sin bloquear nada (pointer-events: none). El CSS anima
 * solo transform y opacity; las partículas van en un canvas con el loop compartido.
 * Mientras dura, los efectos de las secciones esperan su turno. Con "reducir movimiento"
 * no hay festejo: alcanza con el mensaje de confirmación.
 */
import { motion, quality, addTask } from "../lib/motion.js";
import { rayBurst } from "./stage.js";
import { glintSprite } from "./discoBall.js";
import { holdFx } from "./sectionFx.js";

const html = document.documentElement;
const off = () => html.dataset.motion === "off";
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const TAU = Math.PI * 2;

const TOTAL = 4600; // ms que dura todo (hasta que caen los últimos espejitos)
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.5c.7 5.4 3.4 8.6 10.5 10.5-7.1 1.9-9.8 5.1-10.5 10.5C11.3 17.1 8.6 13.9 1.5 12 8.6 10.1 11.3 6.9 12 1.5z"/></svg>';

// Espejitos: plata con reflejos de la paleta. Tiras de neón y luces: los colores de la bola.
const TILES = [[228, 224, 242], [228, 224, 242], [214, 208, 232], [255, 133, 193], [158, 240, 255], [187, 155, 255], [255, 228, 150]];
const NEON = [[80, 210, 255], [255, 45, 149], [139, 61, 255], [158, 240, 255], [255, 133, 193]];
const LIGHT = ["120,225,255", "120,225,255", "255,90,185", "255,255,255", "190,245,255", "175,130,255", "255,230,140"];

let layer = null;
let canvas = null;
let ctx = null;
let task = null;
let parts = [];
let streaks = [];
let glints = [];
let pops = [];
let W = 0, H = 0, dpr = 1, S = 1, clock = 0, endTimer = 0;
let origin = { x: 0, y: 0 };

function build() {
  layer = document.createElement("div");
  layer.className = "cele";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
    <div class="cele__flash"></div>
    <i class="cele__ring"></i><i class="cele__ring cele__ring--b"></i>
    <canvas class="cele__parts"></canvas>
    <div class="cele__emblem">
      <canvas class="cele__rays"></canvas>
      <div class="cele__center">
        <div class="cele__stamp">
          <span class="cele__kicker">¡Estás en</span>
          <span class="cele__big" data-text="la lista!">la lista!</span>
          <i class="cele__star cele__star--a">${STAR}</i><i class="cele__star cele__star--b">${STAR}</i>
        </div>
      </div>
    </div>`; // los espejitos pasan por detrás del cartel: se lee siempre
  document.body.appendChild(layer);
  canvas = layer.querySelector(".cele__parts");
  canvas.width = canvas.height = 0; // sin memoria hasta que haga falta
  ctx = canvas.getContext("2d");
  // los rayos se dibujan una sola vez; después solo giran y escalan con CSS
  rayBurst(layer.querySelector(".cele__rays"), { seed: 31, count: 120 });
  task = addTask((t, dt) => tick(dt), { fps: quality.low ? 30 : 60 });
  quality.subscribe(() => task.setFps(30));
  motion.subscribe(() => { if (!motion.enabled) stop(); });
}

/** Arma la capa con tiempo (cuando el navegador está libre), así el festejo arranca sin tirones. */
export function initCelebration() {
  const ready = () => { if (!layer && !off()) build(); }; // con "reducir movimiento" no se arma
  if ("requestIdleCallback" in window) requestIdleCallback(ready, { timeout: 4000 });
  else setTimeout(ready, 1500);
}

/** Festejo completo. `from`: el botón que se tocó (si no está en pantalla, sale del centro). */
export function celebrate(from) {
  if (off()) return;
  if (!layer) build();
  stop(); // si vuelven a confirmar, arranca de cero

  W = layer.clientWidth;
  H = layer.clientHeight;
  if (!W || !H) return;
  dpr = Math.min(window.devicePixelRatio || 1, quality.low ? 1 : 1.5);
  if (W * H * dpr * dpr > 2.4e6) dpr = Math.max(1, Math.sqrt(2.4e6 / (W * H))); // pantallas grandes: tope de memoria
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  S = Math.min(1.45, Math.max(1, Math.min(W, H) / 390));

  // se mide ahora (al llegar la respuesta), no al tocar: pudo haber scrolleado
  const r = from?.getBoundingClientRect?.();
  origin = r && r.width && r.bottom > 0 && r.top < H
    ? { x: r.left + r.width / 2, y: Math.min(H - 8, Math.max(8, r.top + r.height / 2)) }
    : { x: W / 2, y: H * 0.62 };
  layer.style.setProperty("--ox", `${origin.x.toFixed(0)}px`);
  layer.style.setProperty("--oy", `${origin.y.toFixed(0)}px`);
  // el cartel va lejos del botón para no tapar el mensaje de confirmación
  layer.style.setProperty("--ey", origin.y > H * 0.45 ? "31%" : "70%");

  void layer.offsetWidth; // reinicia las animaciones CSS
  layer.classList.add("is-on");

  const area = Math.min(1.6, Math.max(0.85, Math.sqrt((W * H) / (390 * 844))));
  const low = quality.low;
  clock = 0;
  pops = [
    { at: 0, run: () => fromButton(low ? 16 : 30, low ? 14 : 26) },
    { at: 0.1, run: () => cannons(Math.round((low ? 24 : 46) * area)) },
    { at: 0.52, run: () => cannons(Math.round((low ? 12 : 24) * area)) },
  ];
  task.setActive(true);
  holdFx(TOTAL); // el efecto de la próxima sección espera a que termine el festejo
  endTimer = setTimeout(stop, TOTAL);
}

function stop() {
  clearTimeout(endTimer);
  parts = [];
  streaks = [];
  glints = [];
  pops = [];
  if (!layer) return;
  task.setActive(false);
  canvas.width = canvas.height = 0; // libera la memoria del canvas
  layer.classList.remove("is-on");
}

/* ── Partículas ── */

function addPiece(x, y, vx, vy, neon) {
  parts.push({
    x, y, vx, vy, neon,
    w: neon ? rand(2.2, 3.2) * S : rand(7, 11.5) * S,
    h: 0,
    c: neon ? pick(NEON) : pick(TILES),
    a: rand(0, TAU), va: rand(-7, 7), // giro en el plano
    f: rand(0, TAU), vf: rand(5, 12) * (Math.random() < 0.5 ? -1 : 1), // vuelta de frente a canto
    sw: rand(0, TAU), sws: rand(2, 4.5), swa: rand(24, 64) * S, // vaivén al caer
    k: neon ? rand(2.8, 3.6) : rand(3, 4.2), // resistencia del aire
    age: 0, life: rand(3.2, 4.1), lit: false,
  });
  const p = parts[parts.length - 1];
  p.h = neon ? p.w * rand(3.6, 5.2) : p.w;
}

/** Velocidad inicial para que, con la resistencia del aire, la pieza suba `rise` px. */
function launchSpeed(rise, k, g) {
  let v = k * (rise + (g / (k * k)) * 2.4);
  for (let i = 0; i < 3; i++) v = k * (rise + (g / (k * k)) * Math.log(1 + (k * v) / g));
  return v;
}

function cannons(n) {
  const g = 900 * (H / 844);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -6 : W + 6;
    for (let i = 0; i < n; i++) {
      const neon = Math.random() < 0.24;
      const k = neon ? 3.2 : 3.6;
      const reach = rand(0.16, 0.78) * W; // hasta dónde llega hacia el centro
      const rise = rand(0.42, 0.9) * H;
      addPiece(x0, H + 6, -side * (reach * k) / 0.86 * rand(0.9, 1.1), -launchSpeed(rise, k, g) * rand(0.94, 1.04), neon);
    }
  }
}

function fromButton(nStreaks, nPieces) {
  const { x, y } = origin;
  for (let i = 0; i < nStreaks; i++) {
    const a = (i / nStreaks) * TAU + rand(-0.12, 0.12);
    const v = rand(950, 1750) * S;
    streaks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rand(0.42, 0.72), w: rand(1.6, 3.2) * S, c: pick(LIGHT) });
  }
  for (let i = 0; i < nPieces; i++) {
    const a = rand(-Math.PI * 0.95, -Math.PI * 0.05); // hacia arriba y a los costados
    const v = rand(320, 980) * S;
    addPiece(x + rand(-30, 30), y, Math.cos(a) * v, Math.sin(a) * v, Math.random() < 0.3);
  }
  for (let i = 0; i < 3; i++) glints.push({ x: x + rand(-60, 60) * S, y: y + rand(-16, 10), age: -i * 0.07, life: 0.5, s: rand(34, 52) * S });
}

function tick(dt) {
  clock += dt;
  while (pops.length && pops[0].at <= clock) pops.shift().run();

  const g = 900 * (H / 844);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += dt;
    const e = Math.exp(-p.k * dt);
    p.vx *= e;
    p.vy = p.vy * e + (g / p.k) * (1 - e); // gravedad con resistencia: cae flotando
    const fall = Math.min(1, Math.max(0, p.vy / 140)); // el vaivén aparece al caer
    p.x += (p.vx + Math.sin(p.sw + p.age * p.sws) * p.swa * fall) * dt;
    p.y += p.vy * dt;
    p.a += p.va * dt;
    p.f += p.vf * dt;
    // un espejito que queda de frente refleja la luz: a veces suelta un destello
    const facing = Math.abs(Math.cos(p.f)) > 0.97;
    if (facing && !p.lit && !p.neon && glints.length < (quality.low ? 4 : 9) && Math.random() < 0.3) {
      glints.push({ x: p.x, y: p.y, age: 0, life: 0.36, s: rand(18, 30) * S });
    }
    p.lit = facing;
    if (p.age > p.life || p.y > H + 40 || p.x < -80 || p.x > W + 80) parts.splice(i, 1);
  }
  for (let i = streaks.length - 1; i >= 0; i--) {
    const s = streaks[i];
    s.age += dt;
    const e = Math.exp(-4.2 * dt);
    s.vx *= e;
    s.vy *= e;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.age > s.life) streaks.splice(i, 1);
  }
  for (let i = glints.length - 1; i >= 0; i--) {
    glints[i].age += dt;
    if (glints[i].age > glints[i].life) glints.splice(i, 1);
  }
  draw();
  if (!pops.length && !parts.length && !streaks.length && !glints.length) task.setActive(false);
}

function draw() {
  const g = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.clearRect(0, 0, canvas.width, canvas.height);

  // espejitos y tiras de neón: giran y dan vuelta (de frente se ven enteros y brillan)
  for (const p of parts) {
    const cf = Math.cos(p.f);
    const face = Math.abs(cf);
    const lum = 0.42 + 0.58 * face;
    const hot = Math.max(0, (face - 0.8) / 0.2) * (p.neon ? 0.35 : 0.9);
    const [r0, g0, b0] = p.c;
    const r = r0 * lum + (255 - r0 * lum) * hot;
    const gg = g0 * lum + (255 - g0 * lum) * hot;
    const b = b0 * lum + (255 - b0 * lum) * hot;
    g.globalAlpha = Math.min(1, p.age * 14, (p.life - p.age) / 0.5);
    g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
    const ca = Math.cos(p.a) * dpr;
    const sa = Math.sin(p.a) * dpr;
    const fl = Math.max(0.08, face) * Math.sign(cf || 1);
    g.setTransform(ca, sa, -sa * fl, ca * fl, p.x * dpr, p.y * dpr);
    g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalCompositeOperation = "lighter";
  // rayos de luz que salen disparados del botón
  g.lineCap = "round";
  for (const s of streaks) {
    const k = s.age / s.life;
    const v = Math.hypot(s.vx, s.vy);
    const len = Math.min(110 * S, v * 0.07);
    g.globalAlpha = Math.max(0, 1 - k) ** 1.3;
    g.strokeStyle = `rgb(${s.c})`;
    g.lineWidth = s.w;
    g.beginPath();
    g.moveTo(s.x - (s.vx / (v || 1)) * len, s.y - (s.vy / (v || 1)) * len);
    g.lineTo(s.x, s.y);
    g.stroke();
  }
  // destellos en estrella (los mismos de la bola)
  if (glints.length) {
    const sprite = glintSprite();
    for (const q of glints) {
      if (q.age < 0) continue;
      const k = Math.sin(Math.PI * Math.min(1, q.age / q.life));
      const sz = q.s * (0.55 + 0.45 * k);
      g.globalAlpha = k;
      g.drawImage(sprite, q.x - sz / 2, q.y - sz / 2, sz, sz);
    }
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}
