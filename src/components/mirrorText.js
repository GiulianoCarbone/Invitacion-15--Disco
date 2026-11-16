/**
 * Texto de espejos animado (el "15" del hero).
 * Un canvas encima del texto dibuja un mosaico de espejos recortado con la
 * forma de las letras. Cada espejo se enciende cuando le pasan las luces de
 * colores (como la bola al girar) y algunos sueltan un destello en estrella.
 * El texto real queda debajo (transparente) para la maqueta y la accesibilidad.
 */
import { motion, quality, addTask, watchVisibility } from "../lib/motion.js";
import { glintSprite } from "./discoBall.js";

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

/* Luces que barren el texto: color, velocidad (anchos de texto por segundo), altura, radio */
const SPOTS = [
  { c: [255, 255, 255], speed: 0.16, y: 0.3, r: 0.32, p: 0.0, k: 1.15 },
  { c: [255, 45, 149], speed: 0.11, y: 0.7, r: 0.42, p: 0.45, k: 1.0 },
  { c: [139, 61, 255], speed: 0.13, y: 0.45, r: 0.45, p: 0.8, k: 1.0 },
];

export class MirrorText {
  constructor(el, { seed = 15 } = {}) {
    this.el = el;
    this.seed = seed;
    this.t = 2;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "mirror-text__canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.onScreen = false;

    this.task = addTask((t, dt) => {
      if (document.documentElement.classList.contains("is-locked")) return; // tapado por la portada
      this.t += dt;
      this.draw();
    }, { fps: quality.low ? 20 : 30 });
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(el);
    watchVisibility(el, (v) => { this.onScreen = v; this.sync(); });
    motion.subscribe(() => this.sync());
    quality.subscribe(() => this.task.setFps(20));
    document.fonts?.ready.then(() => this.layout());
    // al terminar la animación de entrada se vuelve a medir (por las dudas)
    el.closest(".hero__fifteen-wrap")?.addEventListener("animationend", () => this.layout());
    this.layout();
    el.classList.add("has-mirror-canvas");
  }

  sync() {
    const on = this.onScreen && motion.running;
    this.task.setActive(on);
    if (!on) this.draw();
  }

  /** Mide la posición real de cada letra en el DOM para dibujarla igual en el canvas. */
  layout() {
    const el = this.el;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    // Si el número está en plena animación de entrada (escalado), se deshace la escala:
    // todas las medidas quedan en el tamaño real del texto.
    const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
    const k = scale > 0.05 ? 1 / scale : 1;
    const cs = getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize);
    // las letras pueden asomar un poco fuera de la caja de línea (line-height < 1)
    const pad = Math.round(fontSize * 0.25);
    const dpr = Math.min(window.devicePixelRatio || 1, quality.low ? 1.5 : 2);
    const w = box.width * k + pad * 2;
    const h = box.height * k + pad * 2;
    this.canvas.style.cssText = `left:${-pad}px;top:${-pad}px;width:${w}px;height:${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;

    // posición de cada letra (respeta letter-spacing y la fuente real)
    const node = Array.from(el.childNodes).find((n) => n.nodeType === 3);
    this.glyphs = [];
    if (node) {
      // línea base real: una marca invisible alineada a la base del texto (igual en Safari y Chrome)
      const mark = document.createElement("i");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
      el.insertBefore(mark, node.nextSibling);
      const baseline = (mark.getBoundingClientRect().top - box.top) * k + pad;
      mark.remove();
      const range = document.createRange();
      const text = node.textContent;
      for (let i = 0; i < text.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        this.glyphs.push({ ch: text[i], x: (r.left - box.left) * k + pad, y: baseline });
      }
    }

    // máscara con la forma de todas las letras juntas (se arma una vez)
    this.mask = document.createElement("canvas");
    this.mask.width = this.canvas.width;
    this.mask.height = this.canvas.height;
    const mg = this.mask.getContext("2d");
    mg.setTransform(dpr, 0, 0, dpr, 0, 0);
    mg.font = this.font;
    mg.textBaseline = "alphabetic";
    mg.fillStyle = "#000";
    for (const c of this.glyphs) mg.fillText(c.ch, c.x, c.y);

    // mosaico: espejos cuadrados de ~0.1em con variación propia
    const tile = Math.max(6, fontSize * 0.1);
    const cols = Math.ceil(w / tile) + 1;
    const rows = Math.ceil(h / tile) + 1;
    const rand = rng(this.seed);
    const md = mg.getImageData(0, 0, this.mask.width, this.mask.height).data;
    const inside = (x, y) => {
      const px = Math.min(this.mask.width - 1, Math.round(x * dpr));
      const py = Math.min(this.mask.height - 1, Math.round(y * dpr));
      return md[(py * this.mask.width + px) * 4 + 3] > 128;
    };
    this.tile = tile;
    this.tiles = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = rand();
        this.tiles.push({
          x: x * tile, y: y * tile,
          base: 0.48 + rand() * 0.4,
          tint: k < 0.12 ? [1, 0.7, 0.9] : k < 0.24 ? [0.82, 0.74, 1] : [0.94, 0.93, 1],
          ph: rand() * Math.PI * 2,
          sp: 0.6 + rand() * 1.6,
          spark: rand() < 0.09, // algunos espejos titilan solos
          inside: inside(x * tile + tile / 2, y * tile + tile / 2),
        });
      }
    }
    this.draw();
  }

  draw() {
    const g = this.ctx;
    const { w, h, tile, dpr } = this;
    if (!w || !this.tiles || !this.glyphs?.length || !this.mask) return;
    const t = this.t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, w, h);

    // juntas
    g.fillStyle = "#2a2138";
    g.fillRect(0, 0, w, h);

    // posición de las luces que barren de izquierda a derecha
    const span = w * 1.8;
    const spots = SPOTS.map((s) => ({
      ...s,
      x: (((t * s.speed + s.p) % 1) * span) - w * 0.4,
      yy: h * (s.y + 0.12 * Math.sin(t * 0.7 + s.p * 5)),
      rr: w * s.r,
    }));

    const gap = Math.max(0.75, tile * 0.06);
    const glints = [];
    for (const m of this.tiles) {
      const cx = m.x + tile / 2, cy = m.y + tile / 2;
      // luz ambiente: más clara arriba a la izquierda
      let r = 0.8 * m.base, gg = 0.78 * m.base, b = 0.88 * m.base;
      const diag = 1 - (cx / w + cy / h) * 0.22;
      r *= diag; gg *= diag; b *= diag;
      let peak = 0;
      for (const s of spots) {
        const dx = (cx - s.x) / s.rr, dy = (cy - s.yy) / (s.rr * 0.8);
        const f = Math.exp(-(dx * dx + dy * dy) * 2.2) * s.k * (0.5 + 0.5 * m.base) * 0.85;
        r += (s.c[0] / 255) * f; gg += (s.c[1] / 255) * f; b += (s.c[2] / 255) * f;
        if (f > peak) peak = f;
      }
      // titileo propio de algunos espejos
      if (m.spark) {
        const tw = Math.pow(Math.max(0, Math.sin(t * m.sp + m.ph)), 18);
        r += tw; gg += tw; b += tw;
        if (tw > 0.6 && m.inside) glints.push({ x: cx, y: cy, s: tw });
      }
      if (peak > 0.8 && m.base > 0.78 && m.inside) glints.push({ x: cx, y: cy, s: peak * 0.8 });
      const R = Math.min(255, 255 * r * m.tint[0]) | 0;
      const G = Math.min(255, 255 * gg * m.tint[1]) | 0;
      const B = Math.min(255, 255 * b * m.tint[2]) | 0;
      const gr = g.createLinearGradient(m.x, m.y, m.x + tile, m.y + tile);
      gr.addColorStop(0, `rgb(${Math.min(255, R * 1.15) | 0},${Math.min(255, G * 1.15) | 0},${Math.min(255, B * 1.15) | 0})`);
      gr.addColorStop(1, `rgb(${(R * 0.72) | 0},${(G * 0.72) | 0},${(B * 0.72) | 0})`);
      g.fillStyle = gr;
      g.fillRect(m.x + gap, m.y + gap, tile - gap * 2, tile - gap * 2);
    }

    // volumen: brillo arriba, sombra abajo
    const sh = g.createLinearGradient(0, 0, 0, h);
    sh.addColorStop(0.2, "rgba(255,255,255,0.32)");
    sh.addColorStop(0.45, "rgba(255,255,255,0)");
    sh.addColorStop(0.65, "rgba(30,6,50,0)");
    sh.addColorStop(0.85, "rgba(30,6,50,0.38)");
    g.fillStyle = sh;
    g.fillRect(0, 0, w, h);

    // recorte con la forma de las letras (una sola máscara: recortar letra por letra borraría todo)
    g.globalCompositeOperation = "destination-in";
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.mask, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // destellos encima (pueden asomar fuera de la letra, como en la bola)
    if (glints.length) {
      glints.sort((a, b) => b.s - a.s);
      const sprite = glintSprite();
      const max = quality.low ? 2 : 4;
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < Math.min(max, glints.length); i++) {
        const q = glints[i];
        const sz = tile * (3.2 + 2.6 * Math.min(1, q.s));
        g.globalAlpha = Math.min(1, q.s);
        g.drawImage(sprite, q.x - sz / 2, q.y - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = "source-over";
  }
}
