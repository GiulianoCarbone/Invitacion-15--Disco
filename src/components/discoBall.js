/**
 * Bola disco en canvas 2D.
 * Esfera de espejos (bandas de latitud con espejos casi cuadrados), cada espejo
 * levemente desalineado. Se ilumina por reflexión: un espejo brilla cuando refleja
 * hacia la cámara alguna de las luces de colores. Como la bola gira, los destellos
 * se encienden y se apagan de forma continua (sin flashes bruscos).
 */
import { motion, quality, addTask, watchVisibility } from "../lib/motion.js";

const TAU = Math.PI * 2;

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

/* Destello en forma de estrella: se pre-renderiza una vez */
let glintCache = null;
export function glintSprite() {
  if (glintCache) return glintCache;
  const s = 128;
  const h = s / 2;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const core = g.createRadialGradient(h, h, 0, h, h, h * 0.5);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.16, "rgba(255,238,250,0.9)");
  core.addColorStop(0.45, "rgba(255,150,210,0.25)");
  core.addColorStop(1, "rgba(255,130,200,0)");
  g.fillStyle = core;
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = "lighter";
  const rays = [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.42], [-Math.PI / 4, 0.42]];
  for (const [rot, k] of rays) {
    g.save();
    g.translate(h, h);
    g.rotate(rot);
    const len = h * k;
    const lg = g.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, k === 1 ? "rgba(255,255,255,0.95)" : "rgba(255,215,240,0.55)");
    lg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(0, 0, len, k === 1 ? 1.7 : 1.2, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  glintCache = c;
  return c;
}

/* Luces del salón: dirección desde la que llegan (espacio de cámara: x→der, y↑, z→espectador) */
const LIGHTS = [
  { dir: [-0.52, 0.6, 0.6], color: [1, 0.97, 1], power: 1.9, sharp: 110, wob: 0.3, spd: 0.16, ph: 0, key: true },
  { dir: [0.8, 0.22, 0.56], color: [1, 0.16, 0.56], power: 1.9, sharp: 70, wob: 0.75, spd: 0.29, ph: 1.3 },
  { dir: [-0.74, -0.34, 0.58], color: [0.55, 0.22, 1], power: 1.8, sharp: 70, wob: 0.7, spd: 0.23, ph: 2.6 },
  { dir: [0.3, -0.8, 0.52], color: [0.85, 0.82, 1], power: 0.8, sharp: 40, wob: 0.8, spd: 0.33, ph: 4.1 },
  { dir: [0.05, 0.85, 0.5], color: [1, 0.45, 0.8], power: 1.1, sharp: 90, wob: 0.9, spd: 0.41, ph: 5.2 },
];

export class DiscoBall {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts rows, lowRows, speed (rad/s), tilt, seed, fps, chain (false si el cable lo dibuja el CSS)
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.o = { rows: 30, lowRows: 22, speed: 0.24, tilt: -0.2, seed: 7, fps: 60, lowFps: 30, chain: true, ...opts };
    this.angle = opts.startAngle ?? 0.7;
    this.time = opts.startTime ?? 3;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.boost = 1; // multiplicador de giro (modo fiesta), con transición suave
    this.boostTarget = 1;
    this.onScreen = false;
    this.suspended = false;
    this.size = 0;

    this.build();
    this.task = addTask((t, dt) => this.tick(dt), { fps: quality.low ? this.o.lowFps : this.o.fps });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    watchVisibility(canvas, (v) => { this.onScreen = v; this.sync(); });
    motion.subscribe(() => this.sync());
    quality.subscribe(() => {
      this.task.setFps(this.o.lowFps);
      this.build();
      this.resize();
    });
    this.resize();
  }

  /** Geometría: espejos por banda de latitud, con junta (grout) entre ellos. */
  build() {
    const rows = quality.low ? this.o.lowRows : this.o.rows;
    const rand = rng(this.o.seed);
    const corners = [];
    const normals = [];
    const centers = [];
    const tint = [];
    const dLat = Math.PI / rows;
    const gap = 0.085;
    const vec = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];

    for (let i = 0; i < rows; i++) {
      const lat0 = -Math.PI / 2 + i * dLat;
      const lat1 = lat0 + dLat;
      const latM = (lat0 + lat1) / 2;
      const n = Math.max(4, Math.round(rows * 2 * Math.cos(latM)));
      const dLon = TAU / n;
      const offset = rand() * dLon; // bandas desfasadas, como en una bola real
      for (let j = 0; j < n; j++) {
        const lon0 = offset + j * dLon;
        const lon1 = lon0 + dLon;
        const gl = dLat * gap;
        const go = dLon * gap;
        const c = [vec(lat0 + gl, lon0 + go), vec(lat0 + gl, lon1 - go), vec(lat1 - gl, lon1 - go), vec(lat1 - gl, lon0 + go)];
        for (const p of c) corners.push(p[0], p[1], p[2]);
        const lonM = (lon0 + lon1) / 2;
        const ctr = vec(latM, lonM);
        centers.push(ctr[0], ctr[1], ctr[2]);
        // espejo levemente desalineado
        const jx = (rand() - 0.5) * 0.16;
        const jy = (rand() - 0.5) * 0.16;
        const jz = (rand() - 0.5) * 0.16;
        const nx = ctr[0] + jx, ny = ctr[1] + jy, nz = ctr[2] + jz;
        const len = Math.hypot(nx, ny, nz);
        normals.push(nx / len, ny / len, nz / len);
        // variación de cada espejo: ganancia + leve tinte
        const r = rand();
        const gain = r < 0.04 ? 0.3 : r < 0.1 ? 1.5 : 0.55 + rand() * 0.75;
        const k = rand();
        const t = k < 0.08 ? [1, 0.82, 0.95] : k < 0.16 ? [0.88, 0.85, 1] : [1, 1, 1];
        tint.push(gain * t[0], gain * t[1], gain * t[2]);
      }
    }
    this.count = centers.length / 3;
    this.corners = new Float32Array(corners);
    this.normals = new Float32Array(normals);
    this.centers = new Float32Array(centers);
    this.tint = new Float32Array(tint);
    this.glints = [];
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const css = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
    const dpr = Math.min(window.devicePixelRatio || 1, quality.low ? 1.5 : 2);
    const px = Math.round(css * dpr);
    if (px !== this.size) {
      this.size = px;
      this.canvas.width = this.canvas.height = px;
      this.prepareLayers();
    }
    this.draw();
  }

  /** Capas fijas (cadena, base, volumen, borde, casquillo) pre-renderizadas una sola vez. */
  prepareLayers() {
    const s = this.size;
    this.cx = s / 2;
    this.cy = s / 2;
    this.R = s * 0.4;
    const { cx, cy, R } = this;
    const ct = Math.cos(this.o.tilt);
    const poleY = cy - R * ct;
    const layer = () => {
      const c = document.createElement("canvas");
      c.width = c.height = s;
      return [c, c.getContext("2d")];
    };

    // debajo de los espejos: cadena + juntas
    const [under, u] = layer();
    if (this.o.chain) {
      u.strokeStyle = "rgba(217,212,230,0.9)";
      u.lineWidth = Math.max(1, s * 0.004);
      u.beginPath();
      u.moveTo(cx, 0);
      u.lineTo(cx, poleY - R * 0.06);
      u.stroke();
    }
    const grout = u.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 0, cx, cy, R);
    grout.addColorStop(0, "#2a2238");
    grout.addColorStop(1, "#08060d");
    u.fillStyle = grout;
    u.beginPath();
    u.arc(cx, cy, R, 0, TAU);
    u.fill();

    // encima: volumen, borde de color y casquillo
    const [over, o] = layer();
    const shade = o.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.05, cx, cy, R * 1.02);
    shade.addColorStop(0, "rgba(255,255,255,0.16)");
    shade.addColorStop(0.35, "rgba(255,255,255,0)");
    shade.addColorStop(0.72, "rgba(10,4,22,0.05)");
    shade.addColorStop(1, "rgba(10,4,22,0.62)");
    o.fillStyle = shade;
    o.beginPath();
    o.arc(cx, cy, R, 0, TAU);
    o.fill();
    const rim = o.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0, "rgba(139,61,255,0)");
    rim.addColorStop(0.55, "rgba(139,61,255,0)");
    rim.addColorStop(1, "rgba(255,45,149,0.55)");
    o.fillStyle = rim;
    o.beginPath();
    o.arc(cx, cy, R, 0, TAU);
    o.arc(cx, cy, R * 0.9, 0, TAU, true);
    o.fill();
    const capW = R * 0.17, capH = R * 0.085;
    const capY = poleY - capH * 0.75;
    const cg = o.createLinearGradient(cx - capW / 2, 0, cx + capW / 2, 0);
    cg.addColorStop(0, "#5d566c");
    cg.addColorStop(0.35, "#f4f1fb");
    cg.addColorStop(0.6, "#a59fb8");
    cg.addColorStop(1, "#3c364a");
    o.fillStyle = cg;
    o.beginPath();
    o.ellipse(cx, capY + capH, capW / 2, capH * 0.35, 0, 0, TAU);
    o.fill();
    o.fillRect(cx - capW / 2, capY, capW, capH);
    o.beginPath();
    o.ellipse(cx, capY, capW / 2, capH * 0.35, 0, 0, TAU);
    o.fill();

    this.under = under;
    this.over = over;
  }

  setPointer(x, y) { this.pointer.tx = x; this.pointer.ty = y; }
  setSuspended(v) { this.suspended = v; this.sync(); }
  setBoost(k) { this.boostTarget = k; }

  sync() {
    const active = this.onScreen && !this.suspended && motion.running;
    this.task.setActive(active);
    if (!active) this.draw(); // cuadro fijo, nunca en blanco
  }

  tick(dt) {
    this.boost += (this.boostTarget - this.boost) * Math.min(1, dt * 1.5);
    this.angle = (this.angle + this.o.speed * this.boost * dt) % TAU;
    this.time += dt * (1 + (this.boost - 1) * 0.6);
    const p = this.pointer;
    const k = Math.min(1, dt * 3);
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;
    this.draw();
  }

  lightDirs() {
    const t = this.time;
    return LIGHTS.map((L) => {
      const a = Math.sin(t * L.spd + L.ph) * L.wob;
      const b = Math.cos(t * L.spd * 0.7 + L.ph) * L.wob * 0.35;
      let [x, y, z] = L.dir;
      if (L.key) { x += this.pointer.x * 0.55; y -= this.pointer.y * 0.55; }
      const ca = Math.cos(a), sa = Math.sin(a);
      [x, z] = [x * ca + z * sa, -x * sa + z * ca];
      const cb = Math.cos(b), sb = Math.sin(b);
      [y, z] = [y * cb - z * sb, y * sb + z * cb];
      const len = Math.hypot(x, y, z) || 1;
      return { x: x / len, y: y / len, z: z / len, c: L.color, p: L.power, s: L.sharp };
    });
  }

  draw() {
    const g = this.ctx;
    const { size: S, cx, cy, R } = this;
    if (!S || !R || !this.under) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, S, S);
    g.drawImage(this.under, 0, 0);

    const ca = Math.cos(this.angle), sa = Math.sin(this.angle);
    const ct = Math.cos(this.o.tilt), st = Math.sin(this.o.tilt);
    const lights = this.lightDirs();
    const nL = lights.length;

    const C = this.corners, N = this.normals, M = this.centers, T = this.tint;
    const glints = this.glints;
    glints.length = 0;
    // Espejos agrupados por color (cuantizado): pocas operaciones de relleno por cuadro
    const buckets = new Map();

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      // visibilidad por el centro del espejo
      const mx = M[i3], my = M[i3 + 1], mz = M[i3 + 2];
      const mz1 = -mx * sa + mz * ca;
      const mzz = my * st + mz1 * ct;
      if (mzz < 0.02) continue;

      // normal girada
      const nx0 = N[i3], ny0 = N[i3 + 1], nz0 = N[i3 + 2];
      const nx = nx0 * ca + nz0 * sa;
      const nz1 = -nx0 * sa + nz0 * ca;
      const ny = ny0 * ct - nz1 * st;
      const nz = ny0 * st + nz1 * ct;

      // reflejo de la vista: r = 2(n·v)n - v, con v = (0,0,1)
      const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1;

      // entorno: salón oscuro con brillo lila arriba y una línea de horizonte plateada
      const up = ry * 0.5 + 0.5;
      const hd = (ry - 0.08) / 0.2;
      const hz = Math.exp(-(hd * hd)) * 0.32;
      const back = 0.5 + 0.5 * Math.min(1, Math.max(0, (rz + 1) / 1.4));
      let r = (0.15 + 0.46 * up + hz * 1.3) * back;
      let gg = (0.14 + 0.44 * up + hz * 1.28) * back;
      let b = (0.2 + 0.5 * up + hz * 1.35) * back;

      let spec = 0;
      for (let l = 0; l < nL; l++) {
        const L = lights[l];
        const d = rx * L.x + ry * L.y + rz * L.z;
        if (d <= 0.55) continue; // por debajo de esto el aporte es despreciable
        const d7 = d * d * d * d * d * d * d;
        const sharp = Math.pow(d, L.s) * L.p;
        const v = sharp + d7 * 0.16 * L.p;
        r += L.c[0] * v; gg += L.c[1] * v; b += L.c[2] * v;
        if (sharp > spec) spec = sharp;
      }

      // tono final, cuantizado a 16 niveles por canal (imperceptible en espejos)
      const qr = Math.min(15, (16 * (1 - Math.exp(-r * T[i3] * 1.45))) | 0);
      const qg = Math.min(15, (16 * (1 - Math.exp(-gg * T[i3 + 1] * 1.45))) | 0);
      const qb = Math.min(15, (16 * (1 - Math.exp(-b * T[i3 + 2] * 1.45))) | 0);
      const key = (qr << 8) | (qg << 4) | qb;
      let path = buckets.get(key);
      if (!path) { path = new Path2D(); buckets.set(key, path); }

      // esquinas proyectadas (ortográfica)
      for (let k = 0; k < 4; k++) {
        const o = i * 12 + k * 3;
        const x0 = C[o], y0 = C[o + 1], z0 = C[o + 2];
        const px = cx + R * (x0 * ca + z0 * sa);
        const py = cy - R * (y0 * ct - (-x0 * sa + z0 * ca) * st);
        if (k === 0) path.moveTo(px, py); else path.lineTo(px, py);
      }
      path.closePath();

      if (spec > 0.3) {
        glints.push({ x: cx + R * (mx * ca + mz * sa), y: cy - R * (my * ct - mz1 * st), s: spec * Math.min(1, mzz * 2.2) });
      }
    }

    for (const [key, path] of buckets) {
      g.fillStyle = `rgb(${((key >> 8) & 15) * 17},${((key >> 4) & 15) * 17},${(key & 15) * 17})`;
      g.fill(path);
    }

    g.drawImage(this.over, 0, 0);

    // destellos: los espejos más alineados con una luz
    if (glints.length) {
      glints.sort((a, b) => b.s - a.s);
      const sprite = glintSprite();
      const max = quality.low ? 5 : 10;
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < Math.min(max, glints.length); i++) {
        const q = glints[i];
        const a = Math.min(1, Math.max(0, (q.s - 0.3) / 1.1));
        if (a <= 0.01) continue;
        const sz = R * (0.32 + 0.6 * Math.min(1, q.s / 1.6));
        g.globalAlpha = a;
        g.drawImage(sprite, q.x - sz / 2, q.y - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  }
}
