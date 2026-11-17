/**
 * Un efecto distinto al llegar a cada sección (pedido del cliente, referencia en
 * fuentes/referencias/efectos-por-seccion.mp4). Cada uno se ve una sola vez.
 *
 *  - Se elige por id de sección: ocultar una sección no cambia el efecto de las demás.
 *  - Una sola capa compartida: nunca se pisan dos efectos.
 *  - Solo se dispara si la sección queda un momento en pantalla: al saltar con
 *    "Confirmar asistencia" las secciones que pasan de largo no disparan nada.
 *  - La capa nunca tapa ni bloquea el contenido (pointer-events: none) y anima
 *    solo transform y opacity. Con "reducir movimiento" no hay efectos.
 */
import { quality } from "../lib/motion.js";

const EFFECTS = {
  "dress-code": "kaleido", // caleidoscopio
  info: "rings", // túnel de anillos de neón
  confirmar: "warp", // velocidad luz
  regalos: "flash", // flash de cámara con visor
  participa: "eq", // ecualizador
  cierre: "lasers", // láseres
};
// ms hasta que termina cada efecto (incluye los retardos escalonados); deben coincidir con fx.css
const DURATION = { kaleido: 3000, rings: 3000, warp: 3000, flash: 3000, eq: 3000, lasers: 3000 };
const DWELL = 320; // ms que la sección tiene que quedar en pantalla

const html = document.documentElement;
const off = () => html.dataset.motion === "off";
const rand = (a, b) => a + Math.random() * (b - a);
const COLORS = ["#ff2d95", "#ff85c1", "#8b3dff", "#bb9bff", "#50d2ff", "#9ef0ff", "#ffe680", "#ffffff"];

function build(kind) {
  const low = quality.low;
  const el = document.createElement("div");
  el.className = `sfx sfx--${kind}`;
  el.setAttribute("aria-hidden", "true");
  let inner = "";
  if (kind === "kaleido") inner = "<i></i><i></i><b></b>";
  if (kind === "rings") for (let i = 0; i < (low ? 5 : 7); i++) inner += `<i style="--k:${i}"></i>`;
  if (kind === "warp") inner = "<i></i><i></i><b></b>";
  if (kind === "flash") inner = '<b></b><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><span class="sfx__rec">REC</span>';
  if (kind === "eq") {
    const n = low ? 10 : window.innerWidth < 700 ? 12 : 20;
    for (let i = 0; i < n; i++) {
      inner += `<i style="--x:${((i + 0.5) / n) * 100}%;--w:${(100 / n) * 0.62}%;--h:${rand(0.35, 0.95).toFixed(2)};--h2:${rand(0.2, 0.7).toFixed(2)};--h3:${rand(0.3, 0.9).toFixed(2)};--h4:${rand(0.25, 0.8).toFixed(2)};--c:${COLORS[i % 6]};--d:${Math.min(250, Math.abs(i - n / 2) * 25).toFixed(0)}ms"></i>`;
    }
  }
  if (kind === "lasers") {
    const n = low ? 6 : 10;
    for (let i = 0; i < n; i++) {
      const a = -70 + (140 / (n - 1)) * i;
      inner += `<i style="--a:${a.toFixed(1)}deg;--a2:${(-a * 0.55).toFixed(1)}deg;--c:${["#50d2ff", "#ff2d95", "#bb9bff", "#ffffff", "#9ef0ff"][i % 5]};--d:${(i % 3) * 60}ms"></i>`;
    }
    inner += "<b></b>";
  }
  el.innerHTML = inner;
  return el;
}

let player = null;
let holder = null;
/** Reproduce un efecto puntual (por ejemplo, los láseres al entrar a la fiesta). */
export function playFx(kind) {
  if (!player || !DURATION[kind] || off()) return;
  player(kind);
}

/**
 * El festejo de la confirmación toma la pantalla `ms` milisegundos: corta el efecto
 * que esté en curso y el de la próxima sección espera a que termine.
 */
export function holdFx(ms) {
  holder?.(ms);
}

export function initSectionFx() {
  const root = document.createElement("div");
  root.className = "sfx-layer";
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);

  let busy = false;
  let endTimer = 0;
  const played = new Set();
  const timers = new Map();
  const inView = new Set();

  function tryPlay(id) {
    if (played.has(id) || busy || off() || html.classList.contains("is-locked")) return;
    played.add(id);
    play(EFFECTS[id]);
  }
  function finish() {
    root.replaceChildren();
    busy = false;
    // si mientras tanto llegó otra sección y sigue en pantalla, ahora le toca a ella
    const next = [...inView].find((id) => !played.has(id));
    if (next) {
      clearTimeout(timers.get(next));
      timers.set(next, setTimeout(() => { if (inView.has(next)) tryPlay(next); }, DWELL));
    }
  }
  function play(kind) {
    busy = true;
    root.replaceChildren(build(kind));
    clearTimeout(endTimer);
    endTimer = setTimeout(finish, DURATION[kind] + 60);
  }

  player = (kind) => { if (!busy) play(kind); };
  holder = (ms) => {
    root.replaceChildren();
    busy = true;
    clearTimeout(endTimer);
    endTimer = setTimeout(finish, ms);
  };

  const sections = Object.keys(EFFECTS).map((id) => document.getElementById(id)).filter((s) => s && !s.hidden);
  sections.forEach((s) => s.setAttribute("data-fx", EFFECTS[s.id]));
  if (!("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const id = e.target.id;
      if (e.isIntersecting) inView.add(id); else inView.delete(id);
      if (played.has(id)) continue;
      clearTimeout(timers.get(id));
      if (e.isIntersecting) timers.set(id, setTimeout(() => { if (inView.has(id)) tryPlay(id); }, DWELL));
    }
  }, { rootMargin: "-38% 0px -38% 0px" }); // franja central de la pantalla
  sections.forEach((s) => io.observe(s));
}
