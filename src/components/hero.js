import { $, setValue } from "../lib/dom.js";
import { motion } from "../lib/motion.js";
import { DiscoBall } from "./discoBall.js";

/**
 * Ajusta el nombre al ancho disponible: prueba 1, 2 o 3 líneas y elige la
 * versión que permite la letra más grande (con preferencia por menos líneas).
 * Nunca desborda: si una palabra es muy larga, la letra se achica lo necesario.
 */
export function layoutName(h1, host, text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font-size:100px;padding:0 0.08em;";
  h1.appendChild(probe);
  const width = (s) => { probe.textContent = s; return probe.getBoundingClientRect().width + 12; };

  const avail = host.getBoundingClientRect().width;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const desktop = vw >= 900;
  const maxPx = desktop ? Math.min(vw * 0.13, 210) : Math.min(vw * 0.26, 150);
  const maxBlock = desktop ? vh * 0.42 : vh * 0.25;

  const cands = [[words.join(" ")]];
  for (let k = 1; k < words.length; k++) cands.push([words.slice(0, k).join(" "), words.slice(k).join(" ")]);
  for (let a = 1; a < words.length - 1; a++) {
    for (let b = a + 1; b < words.length; b++) {
      cands.push([words.slice(0, a).join(" "), words.slice(a, b).join(" "), words.slice(b).join(" ")]);
    }
  }

  let best = null;
  for (const lines of cands) {
    const w = Math.max(...lines.map(width));
    let size = Math.min(maxPx, (avail / w) * 100, maxBlock / (lines.length * 0.92));
    const score = size * (1 - 0.2 * (lines.length - 1));
    if (!best || score > best.score) best = { lines, size, score };
  }
  probe.remove();

  h1.style.setProperty("--name-size", `${Math.floor(best.size)}px`);
  host.replaceChildren(
    ...best.lines.map((line, i) => {
      const outer = document.createElement("span");
      outer.className = "name-line";
      outer.style.setProperty("--li", i);
      const mover = document.createElement("span");
      mover.className = "name-line__mover";
      const inner = document.createElement("span");
      inner.className = "name-line__inner";
      inner.dataset.text = line;
      inner.textContent = line;
      mover.appendChild(inner);
      outer.appendChild(mover);
      return outer;
    })
  );
}

export function initHero(model) {
  const hero = $(".hero");
  const h1 = $("#hero-name");
  const host = $("[data-fit-name]");
  const nameText = model.name || model.cfg.nombre || "[NOMBRE]";
  h1.setAttribute("aria-label", nameText);
  host.setAttribute("aria-hidden", "true");

  const fit = () => layoutName(h1, host, nameText);
  fit();
  document.fonts?.ready.then(fit);
  let lastW = window.innerWidth;
  let timer = 0;
  window.addEventListener("resize", () => {
    if (Math.abs(window.innerWidth - lastW) < 2) return; // la barra del navegador móvil no re-maqueta
    lastW = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(fit, 120);
  });

  setValue($("[data-bind=fechaVisible]", hero), model.datePill, { fallback: "[FECHA_VISIBLE]" });

  const ball = new DiscoBall($("canvas[data-ball=hero]"), { rows: 30, lowRows: 22, speed: 0.26, tilt: -0.2, seed: 7, chain: false });

  // Profundidad que responde al cursor (solo escritorio)
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let raf = 0;
    let nx = 0, ny = 0;
    const apply = () => {
      raf = 0;
      const on = motion.enabled;
      hero.style.setProperty("--px", `${on ? nx * 16 : 0}px`);
      hero.style.setProperty("--py", `${on ? ny * 12 : 0}px`);
      ball.setPointer(on ? nx : 0, on ? ny : 0);
    };
    window.addEventListener("pointermove", (e) => {
      nx = (e.clientX / window.innerWidth) * 2 - 1;
      ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    motion.subscribe(apply);
  }

  return {
    ball,
    play() {
      hero.classList.add("is-played");
      setTimeout(() => hero.classList.add("is-settled"), 3300);
    },
  };
}
