/**
 * Escena de impacto de la bola (portada y hero), inspirada en la referencia del cliente:
 *  - rayBurst: estallido de rayos de luz detrás de la bola. Se dibuja UNA vez en un canvas
 *    y después solo gira con CSS (transform), así no cuesta nada por cuadro.
 *  - stageFloor: textura de la pista de baile en perspectiva (la animación es CSS).
 *  - BurstParticles: brillitos que salen volando desde la bola hacia la pantalla.
 */
import { motion, quality, addTask, watchVisibility } from "../lib/motion.js";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Celestes (como la referencia) con algo de fucsia, violeta y blanco de la invitación */
const RAY_COLORS = [
  [80, 210, 255], [80, 210, 255], [120, 230, 255], [70, 150, 255], [70, 150, 255],
  [190, 245, 255], [255, 255, 255], [255, 70, 170], [160, 100, 255],
];

/**
 * Dibuja los rayos en `canvas` (cuadrado). `seed` cambia el reparto; `count` la cantidad.
 * Se vuelve a dibujar solo si cambia el tamaño.
 */
export function rayBurst(canvas, { seed = 11, count = 96, core = true } = {}) {
  const draw = () => {
    // offsetWidth: el tamaño real, sin la rotación ni el pulso que le aplica el CSS
    const css = Math.round(Math.max(canvas.offsetWidth, canvas.offsetHeight));
    if (!css) return;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.low ? 1 : 1.5);
    const S = Math.round(css * dpr);
    if (canvas.width === S) return;
    canvas.width = canvas.height = S;
    const g = canvas.getContext("2d");
    const c = S / 2;
    const rand = rng(seed);
    g.clearRect(0, 0, S, S);
    g.globalCompositeOperation = "lighter";
    const n = quality.low ? Math.round(count * 0.6) : count;
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const w = (0.25 + rand() * 1.6) * (Math.PI / 180); // ancho angular del rayo
      const len = c * (0.42 + rand() * 0.58);
      const col = RAY_COLORS[(rand() * RAY_COLORS.length) | 0];
      const alpha = 0.18 + rand() * 0.5;
      const gr = g.createRadialGradient(c, c, c * 0.06, c, c, len);
      gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha})`);
      gr.addColorStop(0.55, `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.45})`);
      gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, len, a - w / 2, a + w / 2);
      g.closePath();
      g.fill();
    }
    if (core) {
      // núcleo luminoso detrás de la bola
      const glow = g.createRadialGradient(c, c, 0, c, c, c * 0.62);
      glow.addColorStop(0, "rgba(170,240,255,0.75)");
      glow.addColorStop(0.32, "rgba(60,170,255,0.38)");
      glow.addColorStop(0.62, "rgba(120,70,255,0.12)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, S, S);
    }
  };
  draw();
  new ResizeObserver(draw).observe(canvas);
  quality.subscribe(() => { canvas.width = 0; draw(); });
}

/** Textura de baldosas para la pista (rosa, celeste, lila), como data URL en --floor-tex. */
export function stageFloor(el) {
  try {
    const cols = 6, rows = 6, t = 64, gap = 3;
    const c = document.createElement("canvas");
    c.width = cols * t;
    c.height = rows * t;
    const g = c.getContext("2d");
    g.fillStyle = "#1a1040";
    g.fillRect(0, 0, c.width, c.height);
    const rand = rng(29);
    const tones = [
      ["#ff8fd0", "#ff3d9a"], ["#ffc6ec", "#ff7cc4"], ["#7fd8ff", "#3a8dff"], ["#b9e9ff", "#5fb6ff"],
      ["#c8a8ff", "#7a4dff"], ["#ffffff", "#c9c2ff"], ["#ff6fb5", "#b0207a"], ["#5c7dff", "#2a3fd0"],
    ];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const [a, b] = tones[(rand() * tones.length) | 0];
        const gr = g.createLinearGradient(x * t, y * t, x * t + t, y * t + t);
        gr.addColorStop(0, a);
        gr.addColorStop(1, b);
        g.fillStyle = gr;
        g.fillRect(x * t + gap, y * t + gap, t - gap * 2, t - gap * 2);
        // brillo en la esquina de cada baldosa
        g.fillStyle = "rgba(255,255,255,0.22)";
        g.fillRect(x * t + gap, y * t + gap, t - gap * 2, (t - gap * 2) * 0.18);
      }
    }
    el.style.setProperty("--floor-tex", `url(${c.toDataURL("image/png")})`);
  } catch { /* sin textura: queda el degradado de respaldo */ }
}

/**
 * Brillitos que salen volando desde un punto (la bola) hacia afuera, como un túnel de luz.
 * `origin()` devuelve el centro en px relativos al canvas.
 */
export class BurstParticles {
  constructor(canvas, { origin, count = 90 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.origin = origin;
    this.count = count;
    this.parts = [];
    this.onScreen = true;
    this.suspended = false;
    this.task = addTask((t, dt) => this.tick(dt), { fps: quality.low ? 24 : 40 });
    new ResizeObserver(() => this.resize()).observe(canvas);
    watchVisibility(canvas, (v) => { this.onScreen = v; this.sync(); });
    motion.subscribe(() => this.sync());
    quality.subscribe(() => { this.task.setFps(24); this.seed(); });
    this.resize();
    this.seed();
    this.sync();
  }
  setSuspended(v) { this.suspended = v; this.sync(); }
  sync() {
    const on = this.onScreen && !this.suspended && motion.running;
    this.task.setActive(on);
    if (!on) this.draw();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, quality.low ? 1 : 1.5);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    this.draw();
  }
  spawn(p, fresh) {
    p.a = Math.random() * Math.PI * 2;
    p.d = fresh ? Math.random() * Math.max(this.w, this.h) * 0.7 : Math.random() * 30; // distancia al centro
    p.v = 30 + Math.random() * 90; // px/s, acelera al alejarse
    p.s = 0.6 + Math.random() * 1.8;
    const k = Math.random();
    p.c = k < 0.35 ? "120,225,255" : k < 0.55 ? "255,90,185" : k < 0.7 ? "255,230,140" : k < 0.82 ? "175,130,255" : "255,255,255";
    return p;
  }
  seed() {
    const n = quality.low ? Math.round(this.count * 0.5) : window.innerWidth < 700 ? Math.round(this.count * 0.75) : this.count;
    this.parts = Array.from({ length: n }, () => this.spawn({}, true));
  }
  tick(dt) {
    const max = Math.hypot(this.w, this.h) * 0.75;
    for (const p of this.parts) {
      p.v *= 1 + dt * 0.9;
      p.d += p.v * dt;
      if (p.d > max) this.spawn(p, false);
    }
    this.draw();
  }
  draw() {
    const g = this.ctx;
    if (!this.w) return;
    const o = this.origin();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    g.globalCompositeOperation = "lighter";
    const max = Math.hypot(this.w, this.h) * 0.75;
    for (const p of this.parts) {
      const k = p.d / max; // 0 cerca de la bola → 1 en el borde
      const x = o.x + Math.cos(p.a) * p.d;
      const y = o.y + Math.sin(p.a) * p.d;
      const alpha = Math.min(1, k * 3) * (1 - k * 0.4);
      const size = p.s * (0.5 + k * 2.4);
      const tail = Math.min(26, p.v * 0.05) * k;
      g.strokeStyle = `rgba(${p.c},${(alpha * 0.85).toFixed(3)})`;
      g.lineWidth = size;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x - Math.cos(p.a) * tail, y - Math.sin(p.a) * tail);
      g.lineTo(x, y);
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
  }
}
