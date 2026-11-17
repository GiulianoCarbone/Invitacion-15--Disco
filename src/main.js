/**
 * Invitación Mis 15 · Disco
 * Los datos vienen de config/evento.js; acá solo se arma la experiencia.
 */
import base from "../config/evento.js";
import demo from "../config/demo.js";
import { resolveConfig, buildModel, has } from "./lib/data.js";
import { $, $$, getPath, setValue } from "./lib/dom.js";
import "./lib/motion.js";
import { initMirrorTexture } from "./components/mirrorTexture.js";
import { initAmbient } from "./components/ambient.js";
import { DiscoBall } from "./components/discoBall.js";
import { initHero } from "./components/hero.js";
import { initIntro } from "./components/intro.js";
import { createAudio } from "./components/audio.js";
import { initModals, initReveal, initOffscreenPause } from "./components/ui.js";
import { initCountdown } from "./components/countdown.js";
import { initCalendar } from "./components/calendar.js";
import { initVenue } from "./components/venue.js";
import { initRsvp } from "./components/rsvp.js";
import { initDress, initGifts, initExtras, initMarquees } from "./components/sections.js";
import { initDock } from "./components/dock.js";
import { initTapSparkles, initPartyMode } from "./components/party.js";
import { initCelebration } from "./components/celebration.js";
import { initSectionFx, playFx } from "./components/sectionFx.js";

const { cfg, isDemo } = resolveConfig(base, demo, location.search);
const model = buildModel(cfg);

applyTheme(cfg.colores);
initMirrorTexture();
initAmbient();
bindTexts();
initModals();

const hero = initHero(model);
const audio = createAudio(cfg);
audio.subscribe(() => document.documentElement.classList.toggle("is-music", audio.playing));

initCountdown(model);
initVenue(model, initCalendar(model, { isDemo }));
initDress(model);
initRsvp(model, { isDemo });
initCelebration();
initGifts(model);
initExtras(model, { isDemo });
initMarquees(model);
const finaleBall = new DiscoBall($("canvas[data-ball=finale]"), { rows: 26, lowRows: 20, speed: 0.3, tilt: -0.24, seed: 21, startAngle: 4, vivid: true });
initTapSparkles();
const party = initPartyMode({
  audio,
  balls: [
    { el: $("canvas[data-ball=hero]"), ball: hero.ball },
    { el: $("canvas[data-ball=finale]"), ball: finaleBall },
  ],
});
initSectionFx();
initDock({ audio });
initReveal();
initOffscreenPause();

// "Deslizá" apunta a la primera sección visible después del hero
const nextScene = $$("main > section").find((s) => !s.classList.contains("hero") && !s.hidden);
if (nextScene) $("[data-scroll-cue]").href = `#${nextScene.id}`;


const intro = initIntro({
  model,
  audio,
  onEnter: ({ skipped }) => {
    hero.ball.setSuspended(false);
    setTimeout(() => hero.play(), skipped ? 60 : 380);
    if (!skipped) {
      $("#hero-name")?.focus({ preventScroll: true });
      // La invitación arranca en modo fiesta. La música ya la resolvió la portada
      // (respeta si el invitado la apagó).
      party.start({ music: false, notice: false, boost: 1.6 }); // gira un poco más rápido, no como la sorpresa
      setTimeout(() => playFx("lasers"), 420); // las luces que salen de abajo (las mismas del final)
    }
  },
});
if (intro.open) hero.ball.setSuspended(true);

// Links directos (#confirmar): el contenido se arma con JS, así que reubicamos el scroll.
if (location.hash.length > 1) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}

function applyTheme(c = {}) {
  const map = { fondo: "--c-bg", violetaOscuro: "--c-bg-2", fucsia: "--c-fuchsia", violeta: "--c-violet", plata: "--c-silver" };
  for (const [k, v] of Object.entries(map)) {
    if (typeof c[k] === "string" && /^#[\da-f]{6}$/i.test(c[k].trim())) document.documentElement.style.setProperty(v, c[k].trim());
  }
}

function bindTexts() {
  const values = {
    nombre: model.name || cfg.nombre,
    fechaVisible: model.datePill,
    fechaCorta: model.dateShort,
    inicial: model.initial,
  };
  const fallbacks = { nombre: "[NOMBRE]", fechaCorta: "[FECHA]", fechaVisible: "[FECHA_VISIBLE]" };
  for (const el of $$("[data-bind]")) {
    const key = el.dataset.bind;
    const v = key in values ? values[key] : getPath(cfg, key);
    setValue(el, v, { fallback: fallbacks[key] ?? null });
  }
  if (isDemo) document.documentElement.classList.add("is-demo");
}
