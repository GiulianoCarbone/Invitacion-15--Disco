/** Modales (<dialog> nativo), avisos breves y revelado al entrar en pantalla. */
import { $, $$, icon, escapeHtml } from "../lib/dom.js";

const html = document.documentElement;

/* ── Modales ── */
export function openModal(dialog, opener) {
  if (!dialog || dialog.open) return;
  dialog._opener = opener || document.activeElement;
  dialog.showModal();
  html.classList.add("has-modal");
}

export function closeModal(dialog) {
  if (!dialog?.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  setTimeout(() => {
    dialog.classList.remove("is-closing");
    dialog.close();
  }, html.dataset.motion === "off" ? 120 : 210);
}

export function initModals() {
  for (const dialog of $$("dialog.modal")) {
    // Esc: cierre animado
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(dialog); });
    // click en el fondo oscuro
    dialog.addEventListener("click", (e) => { if (e.target === dialog) closeModal(dialog); });
    $$("[data-close]", dialog).forEach((b) => b.addEventListener("click", () => closeModal(dialog)));
    dialog.addEventListener("close", () => {
      if (!$("dialog[open]")) html.classList.remove("has-modal");
      const back = dialog._opener;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    });
  }
}

/* ── Avisos breves ── */
export function toast(message, { type = "ok", ms = 2800 } = {}) {
  // Con un modal abierto, el aviso va dentro del modal (capa superior y región accesible)
  const dlg = $("dialog[open]");
  let root = dlg ? $("[data-toasts-local]", dlg) : $("[data-toasts]");
  if (dlg && !root) {
    root = document.createElement("div");
    root.className = "toasts";
    root.dataset.toastsLocal = "";
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");
    dlg.appendChild(root);
  }
  if (!root) return;
  while (root.children.length >= 2) root.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.innerHTML = `${icon(type === "ok" ? "check" : "info")}<span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 320);
  }, ms);
}

/* ── Escenas fuera de pantalla: pausa sus bucles CSS ── */
export function initOffscreenPause() {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle("is-offscreen", !e.isIntersecting);
  }, { rootMargin: "150px 0px" });
  $$(".hero, .scene, .marquee-wrap").forEach((el) => io.observe(el));
}

/* ── Revelado escalonado al entrar en pantalla ── */
export function initReveal() {
  const blocks = $$("[data-reveal]");
  blocks.forEach((b) => Array.from(b.children).forEach((c, i) => c.style.setProperty("--i", i)));
  if (!("IntersectionObserver" in window)) {
    blocks.forEach((b) => b.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  blocks.forEach((b) => io.observe(b));
}
