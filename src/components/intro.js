import { $, setValue, icon } from "../lib/dom.js";
import { DiscoBall } from "./discoBall.js";

const KEY = "xv15:entered";

function shouldSkip() {
  const params = new URLSearchParams(location.search);
  if (params.has("sinportada")) return true;
  if (location.hash && location.hash !== "#inicio") return true; // links directos (#confirmar)
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

/**
 * Portada breve: "Una noche para brillar" + botón para entrar.
 * Con música configurada ofrece entrar con o sin música; el audio arranca
 * solo dentro del click del visitante.
 */
export function initIntro({ model, audio, onEnter }) {
  const intro = $("#intro");
  const blockers = [$("#contenido"), $(".footer"), $(".dock")].filter(Boolean);

  if (shouldSkip()) {
    onEnter({ withMusic: false, skipped: true });
    return { open: false };
  }

  setValue($("[data-bind=nombre]", intro), model.name || model.cfg.nombre, { fallback: "[NOMBRE]" });
  setValue($("[data-bind='textos.portada']", intro), model.cfg.textos?.portada || "Una noche para brillar.");

  const actions = $("[data-intro-actions]", intro);
  if (audio.available) {
    actions.innerHTML = `
      <button type="button" class="btn btn--primary btn--xl" data-enter="music">${icon("music")}<span>Entrar con música</span></button>
      <button type="button" class="btn btn--ghost" data-enter="silent">${icon("music-off")}<span>Entrar sin música</span></button>`;
  }

  intro.hidden = false;
  document.documentElement.classList.add("is-locked");
  blockers.forEach((el) => (el.inert = true));

  const ball = new DiscoBall($("canvas[data-ball=intro]"), { rows: 24, lowRows: 18, speed: 0.4, tilt: -0.12, seed: 3, startAngle: 2.2 });

  let done = false;
  function enter(withMusic) {
    if (done) return;
    done = true;
    if (withMusic) audio.play(); // dentro del gesto del visitante
    try { sessionStorage.setItem(KEY, "1"); } catch { /* sin almacenamiento */ }
    document.documentElement.classList.remove("is-locked");
    blockers.forEach((el) => (el.inert = false));
    intro.classList.add("is-leaving");
    document.removeEventListener("keydown", onKey);
    onEnter({ withMusic, skipped: false });
    setTimeout(() => { intro.hidden = true; ball.setSuspended(true); }, 950);
  }
  function onKey(e) { if (e.key === "Escape") enter(false); }

  actions.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-enter]");
    if (btn) enter(btn.dataset.enter === "music");
  });
  document.addEventListener("keydown", onKey);
  requestAnimationFrame(() => actions.querySelector("button")?.focus({ preventScroll: true }));

  return { open: true };
}
