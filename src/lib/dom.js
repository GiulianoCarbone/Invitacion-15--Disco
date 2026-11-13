import { isPlaceholder, isEmpty } from "./data.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Chip de dato pendiente: muestra el placeholder tal cual, con estilo propio. */
export function phNode(text) {
  const s = document.createElement("span");
  s.className = "ph";
  s.textContent = text;
  s.title = "Dato pendiente de configurar";
  return s;
}

/**
 * Escribe un valor en el elemento. Si es un placeholder ("[SALÓN]") lo muestra
 * como dato pendiente. Si está vacío, oculta el elemento (o muestra `fallback`).
 */
export function setValue(el, value, { fallback = null, hideEmpty = true } = {}) {
  if (!el) return;
  if (isPlaceholder(value)) {
    el.replaceChildren(phNode(value.trim()));
    el.hidden = false;
  } else if (isEmpty(value)) {
    if (fallback != null) {
      el.replaceChildren(typeof fallback === "string" ? phNode(fallback) : fallback);
      el.hidden = false;
    } else {
      el.textContent = "";
      if (hideEmpty) el.hidden = true;
    }
  } else {
    el.textContent = String(value);
    el.hidden = false;
  }
}

export function icon(name, cls = "i") {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Pequeña explosión de brillos dentro de un botón (feedback breve). */
export function burst(btn) {
  if (document.documentElement.dataset.motion === "off") return;
  const b = document.createElement("span");
  b.className = "burst";
  b.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
    const d = 34 + Math.random() * 34;
    const p = document.createElement("i");
    p.style.setProperty("--bx", `${Math.cos(a) * d}px`);
    p.style.setProperty("--by", `${Math.sin(a) * d * 0.7}px`);
    p.style.animationDelay = `${Math.random() * 80}ms`;
    b.appendChild(p);
  }
  btn.appendChild(b);
  setTimeout(() => b.remove(), 900);
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* sigue con el respaldo */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
