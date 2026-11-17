/**
 * Detalles que dan vida a la invitación:
 *  - destellos donde el invitado toca la pantalla
 *  - lluvia de brillos (al entrar a la fiesta y en la sorpresa)
 *  - sorpresa: 5 toques seguidos sobre la bola activan unos segundos de "modo fiesta"
 * El festejo al confirmar asistencia está en celebration.js.
 * Todo se apaga solo con "reducir movimiento" y anima solo transform y opacity.
 */
import { motion, quality } from "../lib/motion.js";
import { toast } from "./ui.js";

const html = document.documentElement;
const off = () => html.dataset.motion === "off";
const rand = (a, b) => a + Math.random() * (b - a);
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.5c.7 5.4 3.4 8.6 10.5 10.5-7.1 1.9-9.8 5.1-10.5 10.5C11.3 17.1 8.6 13.9 1.5 12 8.6 10.1 11.3 6.9 12 1.5z"/></svg>';
const COLORS = ["#ffffff", "#ff2d95", "#ff85c1", "#8b3dff", "#bb9bff", "#dcd8e8"];

function layer(cls) {
  let el = document.querySelector(`.${cls}`);
  if (!el) {
    el = document.createElement("div");
    el.className = cls;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

/* ── Destellos al tocar ── */
export function initTapSparkles() {
  const root = layer("taps");
  let active = 0;
  document.addEventListener("pointerdown", (e) => {
    if (off() || !e.isPrimary || active >= 5) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const b = document.createElement("span");
    b.className = "tap";
    b.style.left = `${e.clientX}px`;
    b.style.top = `${e.clientY}px`;
    const n = quality.low ? 5 : 8;
    let inner = '<i class="tap__ring"></i>';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      const d = rand(26, 52);
      inner += `<i class="tap__star" style="--tx:${(Math.cos(a) * d).toFixed(1)}px;--ty:${(Math.sin(a) * d).toFixed(1)}px;--s:${rand(7, 13).toFixed(0)}px;--c:${COLORS[i % COLORS.length]}">${STAR}</i>`;
    }
    b.innerHTML = inner;
    root.appendChild(b);
    active++;
    setTimeout(() => { b.remove(); active--; }, 800);
  }, { passive: true });
}

/* ── Lluvia de brillos ── */
export function confetti(count) {
  if (off()) return;
  const root = layer("confetti");
  const n = count ?? (quality.low ? 30 : window.innerWidth < 700 ? 48 : 72);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    const dur = rand(2.2, 3.8);
    const shape = Math.random();
    p.className = shape < 0.25 ? "confetti__star" : "confetti__bit";
    if (shape < 0.25) p.innerHTML = STAR;
    p.style.cssText = `left:${rand(0, 100).toFixed(1)}%;--c:${COLORS[(Math.random() * COLORS.length) | 0]};--w:${rand(6, 12).toFixed(0)}px;--dx:${rand(-60, 60).toFixed(0)}px;--r:${rand(-540, 540).toFixed(0)}deg;--dur:${dur.toFixed(2)}s;--d:${rand(0, 0.6).toFixed(2)}s`;
    frag.appendChild(p);
  }
  root.appendChild(frag);
  setTimeout(() => {
    // se borran solo las piezas de esta tanda
    Array.from(root.children).slice(0, n).forEach((c) => c.remove());
  }, 4600);
}

/* ── Modo fiesta: al entrar a la invitación y como sorpresa (5 toques en la bola) ── */
export function initPartyMode({ audio, balls }) {
  let taps = [];
  let timer = 0;
  const DURATION = 9000;

  /**
   * @param {object} o music: enciende la música si no sonaba (solo dentro de un toque del visitante);
   *                   notice: muestra el aviso "¡Modo fiesta!";
   *                   boost: cuánto más rápido gira la bola (la sorpresa de los 5 toques gira bien rápido)
   */
  function start({ music = true, notice = true, boost = 4 } = {}) {
    if (off() || html.classList.contains("is-party")) return;
    html.classList.add("is-party");
    balls.forEach((b) => b.ball.setBoost(boost));
    if (music && audio.available) audio.start(); // el toque habilita el audio; si ya suena, sigue igual
    if (notice) toast("¡Modo fiesta!", { type: "info", ms: 2600 });
    confetti();
    clearTimeout(timer);
    timer = setTimeout(stop, DURATION);
  }
  function stop() {
    html.classList.remove("is-party");
    balls.forEach((b) => b.ball.setBoost(1));
  }
  motion.subscribe(() => { if (!motion.enabled) stop(); });

  balls.forEach(({ el }) => {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", () => {
      if (off()) return;
      const now = performance.now();
      taps = taps.filter((t) => now - t < 2500);
      taps.push(now);
      el.classList.remove("is-tapped");
      void el.offsetWidth; // reinicia el pequeño rebote
      el.classList.add("is-tapped");
      if (taps.length >= 5) { taps = []; start(); }
    });
  });

  return { start };
}
