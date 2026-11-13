/**
 * Ambientación continua (capa fija detrás del contenido):
 *  - aurora: gradientes luminosos en un canvas diminuto que el navegador escala
 *  - reflejos de la bola que cruzan la pantalla
 *  - destellos y partículas de brillo
 *  - grano fino para evitar bandas en los gradientes
 */
import { motion, quality, addTask } from "../lib/motion.js";

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.7 5.4 3.4 8.6 10.5 10.5-7.1 1.9-9.8 5.1-10.5 10.5C11.3 17.1 8.6 13.9 1.5 12 8.6 10.1 11.3 6.9 12 1.5z"/></svg>';

function cssColor(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

class Aurora {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.t = 12;
    this.readColors();
    this.task = addTask((t, dt) => { this.t += dt; this.draw(); }, { fps: quality.low ? 15 : 24 });
    this.resize();
    let timer = 0;
    window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(() => this.resize(), 150); });
    motion.subscribe(() => this.sync());
    quality.subscribe(() => { this.task.setFps(15); this.resize(); });
    this.sync();
  }
  readColors() {
    const f = hexToRgb(cssColor("--c-fuchsia", "#ff2d95")) || [255, 45, 149];
    const v = hexToRgb(cssColor("--c-violet", "#8b3dff")) || [139, 61, 255];
    this.bg = cssColor("--c-bg", "#07040d");
    this.blobs = [
      { c: f, a: 0.36, x: 0.12, y: 0.22, ax: 0.18, ay: 0.12, sx: 0.031, sy: 0.023, r: 0.62, p: 0 },
      { c: v, a: 0.46, x: 0.88, y: 0.32, ax: 0.16, ay: 0.18, sx: 0.025, sy: 0.034, r: 0.68, p: 2.1 },
      { c: [52, 18, 150], a: 0.5, x: 0.45, y: 0.86, ax: 0.3, ay: 0.1, sx: 0.019, sy: 0.027, r: 0.75, p: 4.2 },
      { c: [255, 92, 190], a: 0.16, x: 0.62, y: 0.06, ax: 0.25, ay: 0.08, sx: 0.037, sy: 0.029, r: 0.5, p: 1.1 },
    ];
  }
  resize() {
    const div = quality.low ? 16 : 10;
    this.w = Math.max(8, Math.ceil(window.innerWidth / div));
    this.h = Math.max(8, Math.ceil(window.innerHeight / div));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.draw();
  }
  sync() {
    this.task.setActive(motion.running);
    if (!motion.running) this.draw();
  }
  draw() {
    const { ctx, w, h, t } = this;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const m = Math.max(w, h);
    for (const b of this.blobs) {
      const x = w * (b.x + b.ax * Math.sin(t * b.sx * 6.283 + b.p));
      const y = h * (b.y + b.ay * Math.cos(t * b.sy * 6.283 + b.p));
      const r = m * b.r * (1 + 0.1 * Math.sin(t * 0.21 + b.p));
      const a = b.a * (0.82 + 0.18 * Math.sin(t * 0.13 + b.p * 1.7));
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${a})`);
      gr.addColorStop(0.55, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${a * 0.32})`);
      gr.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
    }
    // viñeta para dar profundidad y contraste al texto
    ctx.globalCompositeOperation = "source-over";
    const vg = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h * 0.5, m * 0.85);
    vg.addColorStop(0, "rgba(7,4,13,0)");
    vg.addColorStop(1, "rgba(7,4,13,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }

function buildReflections(root, n) {
  const palette = ["255,255,255", "255,255,255", "255,130,205", "190,150,255", "255,210,240"];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const depth = Math.random(); // 0 lejos → 1 cerca
    const w = 6 + depth * 18;
    const dur = 46 - depth * 16 + rand(-3, 3);
    const orb = document.createElement("span");
    orb.className = "orb";
    orb.style.cssText = [
      `--y:${rand(-2, 100).toFixed(1)}vh`,
      `--dur:${dur.toFixed(1)}s`,
      `--d:${(-Math.random() * dur).toFixed(2)}s`,
      `--w:${w.toFixed(1)}px`,
      `--tilt:${rand(-14, 14).toFixed(0)}deg`,
      `--rgb:${palette[(Math.random() * palette.length) | 0]}`,
      `--o:${(0.25 + depth * 0.5).toFixed(2)}`,
      `--tw:${rand(2.6, 6).toFixed(2)}s`,
      `--twd:${(-Math.random() * 6).toFixed(2)}s`,
    ].join(";");
    orb.appendChild(document.createElement("i"));
    frag.appendChild(orb);
  }
  root.replaceChildren(frag);
}

function buildSparkles(root, stars, glitter) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < stars; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    const dur = rand(5, 9);
    s.style.cssText = `--x:${rand(3, 95).toFixed(1)}%;--y:${rand(3, 95).toFixed(1)}%;--s:${rand(9, 20).toFixed(0)}px;--dur:${dur.toFixed(1)}s;--d:${(-Math.random() * dur).toFixed(2)}s;--o:${rand(0.45, 0.85).toFixed(2)}`;
    s.innerHTML = STAR;
    frag.appendChild(s);
  }
  for (let i = 0; i < glitter; i++) {
    const g = document.createElement("span");
    g.className = "glitter";
    const dur = rand(18, 34);
    g.style.cssText = `--x:${rand(0, 100).toFixed(1)}%;--s:${rand(1.5, 3.5).toFixed(1)}px;--dur:${dur.toFixed(1)}s;--d:${(-Math.random() * dur).toFixed(2)}s;--dx:${rand(-8, 8).toFixed(1)}vw;--o:${rand(0.3, 0.7).toFixed(2)}`;
    frag.appendChild(g);
  }
  root.replaceChildren(frag);
}

function grainTexture() {
  const s = 160;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const img = g.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export function initAmbient() {
  const fx = document.querySelector(".fx");
  if (!fx) return;
  new Aurora(fx.querySelector(".fx__aurora"));

  const refl = fx.querySelector(".fx__reflections");
  const sparkles = fx.querySelector(".fx__sparkles");
  const small = window.innerWidth < 700;
  const build = () => {
    const low = quality.low;
    buildReflections(refl, low ? 14 : small ? 26 : 40);
    buildSparkles(sparkles, low ? 5 : small ? 9 : 14, low ? 6 : small ? 12 : 20);
  };
  build();
  quality.subscribe(build);

  try {
    fx.querySelector(".fx__grain").style.setProperty("--grain", `url(${grainTexture()})`);
  } catch { /* sin grano: no es esencial */ }
}
