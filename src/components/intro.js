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
 * Con música configurada: el botón "Encendé la música" (o el primer toque en la
 * portada) hace sonar el adelanto y "Entrar a la fiesta" salta a la parte más fuerte.
 * El navegador no deja sonar nada antes de ese primer toque.
 */
export function initIntro({ model, audio, onEnter }) {
  const intro = $("#intro");
  const blockers = [$("#contenido"), $(".dock")].filter(Boolean);

  if (shouldSkip()) {
    onEnter({ withMusic: false, skipped: true });
    return { open: false };
  }

  setValue($("[data-bind=nombre]", intro), model.name || model.cfg.nombre, { fallback: "[NOMBRE]" });
  setValue($("[data-bind='textos.portada']", intro), model.cfg.textos?.portada || "Una noche para brillar.");

  const actions = $("[data-intro-actions]", intro);
  const hasMusic = audio.available;
  let musicOff = false; // la apagó a propósito: se respeta al entrar
  let listen = null;
  if (hasMusic) {
    listen = document.createElement("button");
    listen.type = "button";
    listen.className = "intro__listen";
    actions.after(listen);
  }

  intro.hidden = false;
  document.documentElement.classList.add("is-locked");
  blockers.forEach((el) => (el.inert = true));

  const ball = new DiscoBall($("canvas[data-ball=intro]"), { rows: 24, lowRows: 18, speed: 0.4, tilt: -0.12, seed: 3, startAngle: 2.2 });

  // Botón "Encendé la música" y primer toque en cualquier parte de la portada
  const syncListen = () => {
    if (!listen) return;
    const on = audio.playing && !musicOff;
    listen.classList.toggle("is-on", on);
    listen.setAttribute("aria-pressed", String(on));
    listen.innerHTML = on
      ? `<span class="intro__eq" aria-hidden="true"><i></i><i></i><i></i></span><span>Apagá la música</span>`
      : `${icon("music")}<span>Encendé la música</span>`;
  };
  const unsub = audio.subscribe(syncListen);
  syncListen();
  if (hasMusic) {
    intro.addEventListener("click", (e) => {
      if (done || e.target.closest("[data-enter]")) return;
      if (e.target.closest(".intro__listen")) {
        if (audio.playing && !musicOff) { musicOff = true; audio.pause(); }
        else { musicOff = false; audio.playPreview(); }
        syncListen();
        return;
      }
      if (!musicOff && !audio.playing) audio.playPreview();
    });
  }

  let done = false;
  function enter(withMusic) {
    if (done) return;
    done = true;
    unsub();
    if (withMusic) audio.playParty(); // dentro del gesto del visitante
    else audio.pause();
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
    if (btn) enter(hasMusic && !musicOff); // "Entrar a la fiesta" entra con la parte fuerte de la canción
  });
  document.addEventListener("keydown", onKey);
  requestAnimationFrame(() => actions.querySelector("button")?.focus({ preventScroll: true }));

  return { open: true };
}
