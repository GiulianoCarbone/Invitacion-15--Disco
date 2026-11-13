/**
 * Sistema de movimiento:
 *  - motion: interruptor global (preferencia del visitante + prefers-reduced-motion
 *    + pestaña visible). Se refleja en <html data-motion="on|off">: CSS y canvas obedecen.
 *  - quality: "high" | "low". Arranca según el dispositivo y baja sola si los cuadros tardan.
 *  - loop: un único requestAnimationFrame compartido por todas las escenas animadas.
 */
const html = document.documentElement;
const KEY = "xv15:motion";
const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

function readPref() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function writePref(v) {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch { /* modo privado: no pasa nada */ }
}

let pref = readPref(); // "on" | "off" | null
const motionListeners = new Set();

export const motion = {
  /** Efectos habilitados (decisión del visitante o del sistema). */
  get enabled() { return pref ? pref === "on" : !mqReduce.matches; },
  /** El sistema pide menos movimiento. */
  get reduced() { return mqReduce.matches; },
  /** Hay que animar ahora mismo. */
  get running() { return this.enabled && !document.hidden; },
  set(on) {
    // Solo se recuerda si difiere de lo que pide el sistema; si coincide, manda el sistema.
    pref = on === !mqReduce.matches ? null : on ? "on" : "off";
    writePref(pref);
    apply();
  },
  toggle() { this.set(!this.enabled); },
  subscribe(fn) { motionListeners.add(fn); return () => motionListeners.delete(fn); },
};

function apply() {
  html.dataset.motion = motion.enabled ? "on" : "off";
  html.classList.toggle("is-tab-hidden", document.hidden);
  motionListeners.forEach((fn) => fn(motion));
  kick();
}
document.addEventListener("visibilitychange", apply);
mqReduce.addEventListener?.("change", apply);

/* ── Calidad ── */
const qualityListeners = new Set();
let level = (() => {
  const nav = navigator;
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  if (nav.connection?.saveData || cores <= 2 || mem <= 2) return "low";
  if (new URLSearchParams(location.search).get("calidad") === "baja") return "low";
  return "high";
})();
html.dataset.quality = level;

export const quality = {
  get level() { return level; },
  get low() { return level === "low"; },
  degrade() {
    if (level === "low") return;
    level = "low";
    html.dataset.quality = level;
    qualityListeners.forEach((fn) => fn(level));
  },
  subscribe(fn) { qualityListeners.add(fn); return () => qualityListeners.delete(fn); },
};

/* ── Loop compartido ── */
const tasks = new Set();
let raf = 0;
let lastFrame = 0;
let slowFrames = 0;
let sampledFrames = 0;
const bootTime = performance.now();

function frame(now) {
  raf = 0;
  const dt = lastFrame ? now - lastFrame : 16.7;
  lastFrame = now;

  // Monitoreo: si los cuadros vienen lentos de forma sostenida, bajamos la calidad.
  if (now - bootTime > 2500 && dt < 250) {
    sampledFrames++;
    if (dt > 26) slowFrames++;
    if (sampledFrames >= 150) {
      if (slowFrames / sampledFrames > 0.35) quality.degrade();
      sampledFrames = 0;
      slowFrames = 0;
    }
  }

  let any = false;
  for (const t of tasks) {
    if (!t.active) continue;
    any = true;
    const minGap = 1000 / t.fps - 2;
    if (t.last && now - t.last < minGap) continue;
    const tdt = t.last ? Math.min(0.1, (now - t.last) / 1000) : 1 / 60;
    t.last = now;
    t.fn(now / 1000, tdt);
  }
  if (any && motion.running) raf = requestAnimationFrame(frame);
  else lastFrame = 0;
}

function kick() {
  if (raf || !motion.running) return;
  for (const t of tasks) {
    if (t.active) {
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
      return;
    }
  }
}

/** Registra una tarea animada. Devuelve un control para activarla o pausarla. */
export function addTask(fn, { fps = 60 } = {}) {
  const t = { fn, fps, active: false, last: 0 };
  tasks.add(t);
  return {
    setActive(v) {
      if (t.active === v) return;
      t.active = v;
      t.last = 0;
      if (v) kick();
    },
    setFps(f) { t.fps = f; },
    get active() { return t.active; },
  };
}

/** Observa si un elemento está en pantalla (con margen). */
export function watchVisibility(el, cb, rootMargin = "120px") {
  if (!("IntersectionObserver" in window)) { cb(true); return () => {}; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}

apply();
