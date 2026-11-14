import { $ } from "../lib/dom.js";
import { has } from "../lib/data.js";

/**
 * Música de fondo. Nunca arranca sola: solo después de una acción del visitante.
 * Dos momentos de la misma canción:
 *   · adelanto  → suena en la portada (musica.adelanto, en segundos)
 *   · fiesta    → la parte más fuerte, al entrar (musica.fiesta, en segundos)
 * Desde ahí sigue la canción y, al terminar, vuelve a empezar.
 * Si no hay archivo configurado (o no carga) la invitación funciona igual.
 */
export function createAudio(cfg) {
  const el = $("[data-audio]");
  const m = cfg.musica || {};
  const src = m.archivo;
  const configured = has(src);
  const target = Math.min(1, Math.max(0, Number(m.volumen ?? 0.55)));
  const secs = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  const previewAt = secs(m.adelanto, 0);
  const partyAt = secs(m.fiesta, previewAt);
  const listeners = new Set();
  let broken = false;
  let wantPlaying = false;
  let started = false; // ya sonó alguna vez: "reanudar" no vuelve a saltar
  let stage = null; // "adelanto" | "fiesta"
  let fadeTimer = 0;
  let op = 0; // invalida saltos/fundidos viejos cuando llega una orden nueva

  if (configured) {
    el.preload = "metadata";
    el.src = src;
    el.addEventListener("error", () => { broken = true; wantPlaying = false; emit("error"); });
    el.addEventListener("play", () => emit());
    el.addEventListener("pause", () => emit());
  }

  function emit(type) { listeners.forEach((fn) => fn(type)); }

  function setVol(v) { try { el.volume = Math.min(1, Math.max(0, v)); } catch { /* iOS: volumen fijo */ } }

  function fadeTo(v, ms, done) {
    clearInterval(fadeTimer);
    const steps = Math.max(1, Math.round(ms / 40));
    const step = (v - el.volume) / steps;
    let n = 0;
    fadeTimer = setInterval(() => {
      n++;
      setVol(el.volume + step);
      if (n >= steps) { clearInterval(fadeTimer); setVol(v); done?.(); }
    }, 40);
  }

  /** Salta a t en silencio (muted funciona también en iOS) y después entra con fundido. */
  function seekThenFadeIn(t, myOp) {
    const go = () => {
      if (myOp !== op) return;
      const land = () => {
        if (myOp !== op) return;
        el.muted = false;
        setVol(0);
        fadeTo(target, 600);
      };
      if (Math.abs(el.currentTime - t) < 0.05) return land();
      el.addEventListener("seeked", land, { once: true });
      try { el.currentTime = t; } catch { land(); }
    };
    if (el.readyState >= 1) go();
    else el.addEventListener("loadedmetadata", go, { once: true });
  }

  /** Arranca en t. Llamar dentro del gesto del visitante. */
  function startAt(t, name) {
    if (!api.available) return Promise.resolve(false);
    const myOp = ++op;
    wantPlaying = true;
    started = true;
    stage = name;
    clearInterval(fadeTimer);
    el.muted = true;
    const p = el.play(); // play() primero, dentro del gesto; el salto viene después
    seekThenFadeIn(t, myOp);
    return Promise.resolve(p).then(() => true).catch(() => {
      if (myOp === op) { wantPlaying = false; el.muted = false; emit("blocked"); }
      return false;
    });
  }

  const api = {
    get available() { return configured && !broken; },
    get playing() { return configured && !el.paused; },
    get stage() { return stage; },

    /** Portada: el comienzo de la canción. */
    playPreview() {
      if (stage === "adelanto" && api.playing) return Promise.resolve(true);
      return startAt(previewAt, "adelanto");
    },

    /** Entrar a la fiesta: la parte más fuerte. Si ya sonaba el adelanto, pasa con un fundido corto. */
    playParty() {
      if (!api.available) return Promise.resolve(false);
      if (stage === "fiesta" && api.playing) return Promise.resolve(true);
      if (!api.playing) return startAt(partyAt, "fiesta");
      const myOp = ++op;
      wantPlaying = true;
      stage = "fiesta";
      fadeTo(0, 280, () => {
        if (myOp !== op) return;
        el.muted = true;
        seekThenFadeIn(partyAt, myOp);
      });
      return Promise.resolve(true);
    },

    /** Botón de música: la primera vez arranca en la parte de la fiesta; después reanuda donde quedó. */
    play() {
      if (!api.available) return Promise.resolve(false);
      if (!started) return startAt(partyAt, "fiesta");
      op++;
      wantPlaying = true;
      el.muted = false;
      setVol(0);
      const p = el.play();
      fadeTo(target, 500);
      return Promise.resolve(p).then(() => true).catch(() => { wantPlaying = false; emit("blocked"); return false; });
    },
    pause() {
      wantPlaying = false;
      op++;
      if (el.paused) return;
      const myOp = op;
      fadeTo(0, 400, () => { if (myOp === op) el.pause(); });
    },
    toggle() { return api.playing && wantPlaying ? (api.pause(), Promise.resolve(false)) : api.play(); },
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
