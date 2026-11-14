import { $ } from "../lib/dom.js";
import { toast } from "./ui.js";

/**
 * Dock inferior: botón de música + acceso persistente
 * a "Confirmar asistencia". El acceso se esconde en el hero, en la sección de
 * confirmación, en el cierre y mientras se escribe en un campo.
 */
export function initDock({ audio }) {
  const dock = $(".dock");
  const musicBtn = $("[data-toggle-music]", dock);
  const controls = $(".dock__controls", dock);
  const cta = $("[data-dock-cta]", dock);

  const setBtn = (btn, pressed, iconId, label) => {
    btn.setAttribute("aria-pressed", String(pressed));
    $("use", btn).setAttribute("href", iconId);
    $(".sr-only", btn).textContent = label;
    btn.title = label;
  };

  // Música
  const syncMusic = () => {
    musicBtn.hidden = !audio.available;
    controls.hidden = !audio.available; // sin música no queda ningún control
    const on = audio.playing;
    musicBtn.classList.toggle("is-playing", on);
    setBtn(musicBtn, on, on ? "#i-music" : "#i-music-off", on ? "Pausar música" : "Activar música");
  };
  audio.subscribe((type) => {
    syncMusic();
    if (type === "error") toast("No pudimos cargar la música. La invitación sigue funcionando.", { type: "info", ms: 3600 });
    if (type === "blocked") toast("Tocá el botón de música para escucharla.", { type: "info" });
  });
  musicBtn.addEventListener("click", () => audio.toggle());
  syncMusic();

  // Acceso a confirmar
  const state = { hero: true, rsvp: false, finale: false };
  const update = () => {
    const hide = state.hero || state.rsvp || state.finale;
    cta.classList.toggle("is-hidden", hide);
    if (hide) { cta.setAttribute("tabindex", "-1"); cta.setAttribute("aria-hidden", "true"); }
    else { cta.removeAttribute("tabindex"); cta.removeAttribute("aria-hidden"); }
  };
  update();
  if ("IntersectionObserver" in window) {
    // hero: mientras ocupe buena parte de la pantalla; confirmación y cierre: cuando
    // entran en la franja central (no apenas asoman por abajo).
    const watch = (el, key, opts, test) => {
      if (!el) return;
      new IntersectionObserver(([e]) => { state[key] = test(e); update(); }, opts).observe(el);
    };
    watch($(".hero"), "hero", { threshold: [0, 0.3, 1] }, (e) => e.intersectionRatio > 0.3);
    watch($("#confirmar"), "rsvp", { rootMargin: "-30% 0px -30% 0px" }, (e) => e.isIntersecting);
    watch($("[data-finale-cta]"), "finale", { rootMargin: "0px 0px -10% 0px" }, (e) => e.isIntersecting);
  }

  // Mientras se escribe (teclado abierto), el dock se corre
  const isField = (el) => el && el.matches?.("input:not([type=radio]), textarea, select");
  document.addEventListener("focusin", (e) => { if (isField(e.target)) dock.classList.add("is-tucked"); });
  document.addEventListener("focusout", (e) => {
    if (!isField(e.target)) return;
    setTimeout(() => { if (!isField(document.activeElement)) dock.classList.remove("is-tucked"); }, 60);
  });
}
