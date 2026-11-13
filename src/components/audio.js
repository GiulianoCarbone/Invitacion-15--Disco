import { $ } from "../lib/dom.js";
import { has } from "../lib/data.js";

/**
 * Música de fondo. Nunca arranca sola: solo después de una acción del visitante.
 * Si no hay archivo configurado (o no carga) la invitación funciona igual.
 */
export function createAudio(cfg) {
  const el = $("[data-audio]");
  const src = cfg.musica?.archivo;
  const configured = has(src);
  const target = Math.min(1, Math.max(0, Number(cfg.musica?.volumen ?? 0.55)));
  const listeners = new Set();
  let broken = false;
  let wantPlaying = false;
  let fadeTimer = 0;

  if (configured) {
    el.src = src;
    el.addEventListener("error", () => { broken = true; wantPlaying = false; emit("error"); });
    el.addEventListener("play", () => emit());
    el.addEventListener("pause", () => emit());
  }

  function emit(type) { listeners.forEach((fn) => fn(type)); }

  function fadeTo(v, done) {
    clearInterval(fadeTimer);
    const step = (v - el.volume) / 12;
    let n = 0;
    fadeTimer = setInterval(() => {
      n++;
      try { el.volume = Math.min(1, Math.max(0, el.volume + step)); } catch { /* iOS: volumen fijo */ }
      if (n >= 12) { clearInterval(fadeTimer); done?.(); }
    }, 40);
  }

  const api = {
    get available() { return configured && !broken; },
    get playing() { return configured && !el.paused; },
    play() {
      if (!api.available) return Promise.resolve(false);
      wantPlaying = true;
      try { el.volume = 0; } catch { /* iOS */ }
      const p = el.play();
      fadeTo(target);
      return Promise.resolve(p).then(() => true).catch(() => { wantPlaying = false; emit("blocked"); return false; });
    },
    pause() {
      wantPlaying = false;
      if (el.paused) return;
      fadeTo(0, () => el.pause());
    },
    toggle() { return api.playing ? (api.pause(), Promise.resolve(false)) : api.play(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  // Pestaña oculta: pausa; al volver, retoma si estaba sonando.
  document.addEventListener("visibilitychange", () => {
    if (!configured || broken) return;
    if (document.hidden) { if (!el.paused) el.pause(); }
    else if (wantPlaying && el.paused) el.play().catch(() => { wantPlaying = false; emit(); });
  });

  return api;
}
