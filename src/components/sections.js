/** Dress code, regalos, participación, marquees y aviso de datos pendientes. */
import { $, $$, icon, escapeHtml, setValue, copyText, burst } from "../lib/dom.js";
import { has, isEmpty, isPlaceholder, waDigits, pendingFields } from "../lib/data.js";
import { openModal, toast } from "./ui.js";
import { openWhatsApp } from "./rsvp.js";

/* ── Dress code ── */
export function initDress(model) {
  const cfg = model.cfg;
  const section = $("#dress-code");
  if (!cfg.secciones?.dressCode) { section.hidden = true; return; }
  const d = cfg.dressCode || {};
  setValue($("[data-bind='dressCode.estilo']", section), d.estilo, { fallback: "[DRESS_CODE]" });
  setValue($("[data-bind='dressCode.indicaciones']", section), d.indicaciones);
  const colors = (Array.isArray(d.coloresReservados) ? d.coloresReservados : [])
    .filter((c) => c && /^#[\da-f]{3,8}$/i.test(String(c.color || "").trim()));
  const wrap = $("[data-dress-colors]", section);
  if (!colors.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const list = $("[data-swatches]", section);
  list.setAttribute("aria-label", `${d.notaColores || "Colores reservados"}: ${colors.map((c) => c.nombre || c.color).join(", ")}`);
  list.innerHTML = colors.map((c) => `
    <li class="swatch"><span class="swatch__chip" style="--sw:${escapeHtml(c.color.trim())}" aria-hidden="true"></span><span>${escapeHtml(c.nombre || c.color)}</span></li>`).join("");
}

/* ── Copiar con feedback ── */
async function copyWithFeedback(btn, text, okMsg) {
  const ok = await copyText(text);
  if (!ok) {
    toast("No se pudo copiar. Mantené presionado el dato para copiarlo.", { type: "info", ms: 3600 });
    return;
  }
  const label = $("span", btn);
  const use = $("use", btn);
  const prevLabel = label?.textContent;
  const prevIcon = use?.getAttribute("href");
  btn.classList.add("is-done");
  if (label) label.textContent = "¡Copiado!";
  use?.setAttribute("href", "#i-check");
  burst(btn);
  toast(okMsg);
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.classList.remove("is-done");
    if (label) label.textContent = prevLabel;
    use?.setAttribute("href", prevIcon);
  }, 2200);
}

/* ── Regalos ── */
export function initGifts(model) {
  const cfg = model.cfg;
  const section = $("#regalos");
  const r = cfg.regalos || {};
  const anyData = ["titular", "alias", "cbu"].some((k) => !isEmpty(r[k]));
  if (!cfg.secciones?.regalos || !anyData) { section.hidden = true; return; }

  const dialog = $("#gift-dialog");
  const rows = [
    { key: "alias", label: "Alias", main: true, copy: "Copiar alias", ok: "Alias copiado" },
    { key: "cbu", label: "CBU / CVU", copy: "Copiar", ok: "CBU/CVU copiado" },
    { key: "titular", label: "Titular" },
    { key: "banco", label: "Banco" },
  ].filter((row) => !isEmpty(r[row.key]));

  $("[data-bank]", dialog).innerHTML = rows.map((row) => {
    const v = r[row.key];
    const pending = isPlaceholder(v);
    const value = pending ? `<span class="ph">${escapeHtml(v.trim())}</span>` : escapeHtml(v);
    const btn = row.copy
      ? `<button type="button" class="btn ${row.main ? "btn--primary" : "btn--ghost"} copy-btn" data-copy="${row.key}" aria-label="${row.copy}: ${pending ? "dato pendiente" : escapeHtml(v)}">${icon("copy")}<span>${row.main ? "Copiar alias" : "Copiar"}</span></button>`
      : "";
    return `<div class="bank__row${row.main ? " bank__row--main" : ""}"><div><dt>${row.label}</dt><dd>${value}</dd></div>${btn}</div>`;
  }).join("");

  $("[data-bank]", dialog).addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const row = rows.find((x) => x.key === btn.dataset.copy);
    const v = r[row.key];
    if (!has(v)) { toast("Este dato todavía no está cargado (versión de muestra).", { type: "info", ms: 3200 }); return; }
    copyWithFeedback(btn, String(v).trim(), row.ok);
  });

  $("[data-open-gift]", section).addEventListener("click", (e) => openModal(dialog, e.currentTarget));
}

/* ── Participación ── */
export function initExtras(model, { isDemo }) {
  const cfg = model.cfg;
  const s = cfg.secciones || {};
  const extras = $("[data-extras]");
  const song = $(".song", extras);
  const photos = $(".photos", extras);
  const p = cfg.participacion || {};

  // Canción
  if (!s.cancion) song.hidden = true;
  else {
    const c = p.cancion || {};
    const form = $("[data-song-form]", song);
    const input = $("#song-input");
    const err = $("#song-error");
    const statusEl = $("[data-song-status]", song);
    const btn = $("[data-song-submit]", song);
    if (c.canal === "link") {
      $("[data-song-field]", song).hidden = true;
      $("span", btn).textContent = "Sumar mi tema";
      $("use", btn).setAttribute("href", "#i-link");
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (c.canal === "link") {
        if (has(c.url) && /^https?:\/\//i.test(c.url)) window.open(c.url, "_blank", "noopener");
        else toast("Falta cargar el link para sugerir temas (versión de muestra).", { type: "info", ms: 3400 });
        return;
      }
      const tema = input.value.trim();
      if (tema.length < 2) {
        input.setAttribute("aria-invalid", "true");
        err.innerHTML = `${icon("info")}<span>Escribí el tema y, si querés, el artista.</span>`;
        err.hidden = false;
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      err.hidden = true;
      const text = `¡Hola! Para los 15 de ${model.name || "la fiesta"} propongo este tema: ${tema} 🎶`;
      const number = waDigits(c.whatsapp) || model.wa;
      if (!number || isDemo) {
        statusEl.innerHTML = `<span class="ph">Versión de muestra</span> Se abriría WhatsApp con: “${escapeHtml(text)}”`;
        burst(btn);
        return;
      }
      openWhatsApp(number, text);
      statusEl.textContent = "¡Gracias! Enviá el mensaje en WhatsApp para sumar tu tema.";
      burst(btn);
    });
    input.addEventListener("input", () => { if (input.value.trim().length >= 2) { input.removeAttribute("aria-invalid"); err.hidden = true; } });
  }

  // Fotos
  if (!s.fotos) photos.hidden = true;
  else {
    const f = p.fotos || {};
    setValue($("[data-hashtag]", photos), f.hashtag, { fallback: "[HASHTAG]" });
    const link = $("[data-photos-link]", photos);
    if (has(f.url) && /^https?:\/\//i.test(f.url)) { link.href = f.url; link.hidden = false; }
    const copyBtn = $("[data-copy-hashtag]", photos);
    if (isEmpty(f.hashtag)) copyBtn.hidden = true;
    copyBtn.addEventListener("click", () => {
      if (!has(f.hashtag)) { toast("El hashtag todavía no está cargado (versión de muestra).", { type: "info", ms: 3200 }); return; }
      copyWithFeedback(copyBtn, f.hashtag.trim(), "Hashtag copiado");
    });
  }

  if (song.hidden && photos.hidden) extras.hidden = true;
}

/* ── Marquees entre escenas ── */
export function initMarquees(model) {
  const name = model.name || "Mis 15";
  const sets = {
    intro: ["Una noche para brillar", `<em>${escapeHtml(name)}</em>`, "Mis 15", "Noche disco"],
    rsvp: ["¿Te sumás a la pista?", "<em>Confirmá tu lugar</em>", "Te esperamos"],
    outro: [`<em>${escapeHtml(name)}</em>`, "Mis 15", "Nos vemos en la pista"],
  };
  for (const el of $$("[data-marquee]")) {
    const items = sets[el.dataset.marquee] || sets.intro;
    const one = items.map((t) => `<span class="marquee__item">${t}${icon("star")}</span>`).join("");
    const group = `<span class="marquee__group">${one}${one}${one}</span>`;
    el.innerHTML = `<div class="marquee__track" style="--marquee-dur:${42 + items.length * 2}s">${group}${group}</div>`;
  }
}

/* ── Aviso de versión de muestra ── */
export function initPending(baseCfg, { isDemo }) {
  const list = pendingFields(baseCfg);
  const btn = $("[data-open-pending]");
  if (!list.length && !isDemo) return;
  btn.hidden = false;
  $("[data-pending-count]", btn).textContent = isDemo
    ? "Vista de ejemplo · datos ficticios"
    : `Versión de muestra · ${list.length} ${list.length === 1 ? "dato pendiente" : "datos pendientes"}`;
  const dialog = $("#pending-dialog");
  $("[data-pending-list]", dialog).innerHTML = list.length
    ? list.map((f) => `<li>${icon("info")}<span>${escapeHtml(f.label)}</span><code>${escapeHtml(f.key)}</code></li>`).join("")
    : "<li>Todo cargado.</li>";
  if (isDemo) $(".modal__title", dialog).textContent = "Vista de ejemplo";
  btn.addEventListener("click", () => openModal(dialog, btn));
}
