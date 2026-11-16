import { $, setValue, icon } from "../lib/dom.js";
import { DiscoBall } from "./discoBall.js";
import { rayBurst, stageFloor, BurstParticles } from "./stage.js";

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
 * portada) hace sonar la canción desde el principio; "Entrar a la fiesta" la deja
 * seguir sin saltar (o la enciende, si todavía no sonaba).
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

  // Escena de la bola (referencia del cliente): rayos, pista de baile y brillitos
  rayBurst($(".rays__a", intro), { seed: 11, count: 110 });
  rayBurst($(".rays__b", intro), { seed: 47, count: 46, core: false });
  stageFloor($(".stage__plane", intro));
  const ballEl = $(".intro__ball", intro);
  const particlesEl = $(".stage__particles", intro);
  const particles = new BurstParticles(particlesEl, {
    count: 110,
    origin: () => {
      const b = ballEl.getBoundingClientRect();
      const c = particlesEl.getBoundingClientRect();
      return { x: b.left + b.width / 2 - c.left, y: b.top + b.height / 2 - c.top };
    },
  });

  const ball = new DiscoBall($("canvas[data-ball=intro]"), {
    rows: 24, lowRows: 18, speed: 0.5, tilt: -0.12, seed: 3, startAngle: 2.2, chain: false,
    vivid: true, sweep: true, sweepEvery: 4.6, sweepDelay: 2.2,
  });

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
        else { musicOff = false; audio.start(); }
        syncListen();
        return;
      }
      if (!musicOff && !audio.playing) audio.start();
    });
  }

  let done = false;
  function enter(withMusic) {
    if (done) return;
    done = true;
    unsub();
    if (withMusic) audio.start(); // dentro del gesto del visitante; si ya sonaba, sigue sin saltar
    else audio.pause();
    try { sessionStorage.setItem(KEY, "1"); } catch { /* sin almacenamiento */ }
    document.documentElement.classList.remove("is-locked");
    blockers.forEach((el) => (el.inert = false));
    intro.classList.add("is-leaving");
    document.removeEventListener("keydown", onKey);
    onEnter({ withMusic, skipped: false });
    setTimeout(() => {
      intro.hidden = true;
      ball.setSuspended(true);
      particles.setSuspended(true);
    }, 950);
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
