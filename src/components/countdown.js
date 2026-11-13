import { $ } from "../lib/dom.js";
import { diffParts } from "../lib/time.js";

const LABELS = {
  d: ["día", "días"],
  h: ["hora", "horas"],
  m: ["minuto", "minutos"],
  s: ["segundo", "segundos"],
};
const pad = (n) => String(n).padStart(2, "0");

/** Cuenta regresiva con la fecha y zona horaria de la config. */
export function initCountdown(model) {
  const section = $("#cuenta");
  if (!model.cfg.secciones?.cuentaRegresiva) { section.hidden = true; return; }

  const grid = $("[data-countdown]", section);
  const state = $("[data-countdown-state]", section);
  const sr = $("[data-countdown-sr]", section);
  const nums = Object.fromEntries(["d", "h", "m", "s"].map((k) => [k, $(`[data-unit=${k}]`, grid)]));
  const labels = Object.fromEntries(["d", "h", "m", "s"].map((k) => [k, $(`[data-label=${k}]`, grid)]));
  const textos = model.cfg.textos || {};

  const showState = (htmlStr) => {
    grid.hidden = true;
    state.hidden = false;
    state.innerHTML = htmlStr;
  };

  if (!model.start) {
    // Fecha pendiente: estado cuidado, sin números inválidos
    grid.classList.add("is-pending");
    grid.setAttribute("aria-hidden", "true");
    Object.values(nums).forEach((n) => (n.textContent = ""));
    state.hidden = false;
    state.innerHTML = `<p class="big">Muy pronto arranca la cuenta.</p><p>La cuenta regresiva aparece apenas se confirme la fecha de la fiesta.</p>`;
    state.style.marginTop = "22px";
    return;
  }

  const start = model.start.getTime();
  const end = (model.end ? model.end.getTime() : start + 6 * 3600e3);
  let lastMinute = -1;
  let timer = 0;

  function update() {
    const now = Date.now();
    if (now >= end) { showState(`<p class="big">${textos.cuentaTermino || "Gracias por ser parte de esta noche."}</p>`); clearInterval(timer); return; }
    if (now >= start) { showState(`<p class="big">${textos.cuentaLlego || "¡Llegó la noche! Nos vemos en la pista."}</p>`); return; }
    const p = diffParts(start, now);
    nums.d.textContent = String(p.d);
    nums.h.textContent = pad(p.h);
    nums.m.textContent = pad(p.m);
    nums.s.textContent = pad(p.s);
    for (const k of ["d", "h", "m", "s"]) labels[k].textContent = LABELS[k][p[k] === 1 ? 0 : 1];
    if (p.m !== lastMinute) {
      lastMinute = p.m;
      sr.textContent = `Faltan ${p.d} ${LABELS.d[p.d === 1 ? 0 : 1]}, ${p.h} ${LABELS.h[p.h === 1 ? 0 : 1]} y ${p.m} ${LABELS.m[p.m === 1 ? 0 : 1]} para la fiesta.`;
    }
  }

  update();
  // alineado al cambio de segundo para que no "salte"
  setTimeout(() => { update(); timer = setInterval(update, 1000); }, 1000 - (Date.now() % 1000) + 5);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) update(); });
}
