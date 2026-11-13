import { $, icon, escapeHtml } from "../lib/dom.js";
import { has, isPlaceholder } from "../lib/data.js";
import { weekdayOf, monthName } from "../lib/time.js";
import { toast } from "./ui.js";

/** Valor listo para HTML: el dato real, o el chip de pendiente con su placeholder. */
function val(v, ph) {
  if (has(v)) return escapeHtml(v);
  return `<span class="ph" title="Dato pendiente de configurar">${escapeHtml(isPlaceholder(v) ? v.trim() : ph)}</span>`;
}

function row(iconName, label, value, extra = "") {
  return `<div class="trow"><span class="trow__icon">${icon(iconName)}</span><div><dt>${label}</dt><dd>${value}${extra ? `<small>${extra}</small>` : ""}</dd></div></div>`;
}

function mapsAction(url, label = "Cómo llegar") {
  if (url) return `<a class="btn btn--primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon("route")}<span>${label}</span></a>`;
  return `<button type="button" class="btn btn--primary" aria-disabled="true" data-missing="Falta cargar la dirección: el botón se conecta solo cuando esté en la config.">${icon("route")}<span>${label}</span></button>`;
}

/** Entradas de "Cuándo y dónde": fiesta y, si está activada, ceremonia. */
export function initVenue(model, calendar) {
  const host = $("[data-venue]");
  const cfg = model.cfg;
  const f = cfg.fiesta || {};
  const p = model.startP;
  const tickets = [];

  if (cfg.secciones?.ceremonia) {
    const c = cfg.ceremonia || {};
    const addr = [has(c.direccion) ? escapeHtml(c.direccion) : val(c.direccion, "[DIRECCIÓN]"), has(c.ciudad) ? escapeHtml(c.ciudad) : isPlaceholder(c.ciudad) ? val(c.ciudad) : ""].filter(Boolean).join(", ");
    tickets.push(`
      <article class="ticket" aria-label="${escapeHtml(c.titulo || "Ceremonia")}">
        <div class="ticket__stub">
          <span class="ticket__day ticket__day--time">${has(c.hora) ? escapeHtml(c.hora) : "--:--"}</span>
          <span class="ticket__when"><span class="ticket__weekday">${escapeHtml(c.titulo || "Ceremonia")}</span><span class="ticket__month">${p ? `${p.d} de ${monthName(p)}` : val(null, "[FECHA]")}</span></span>
        </div>
        <div class="ticket__body">
          <dl class="ticket__rows">
            ${row("clock", "Hora", has(c.hora) ? `${escapeHtml(c.hora)} h` : val(c.hora, "[HORA_CEREMONIA]"))}
            ${row("pin", "Lugar", val(c.lugar, "[LUGAR_CEREMONIA]"), addr)}
          </dl>
          <div class="ticket__actions">${mapsAction(model.ceremonyMaps)}</div>
        </div>
      </article>`);
  }

  const addr = [val(f.direccion, "[DIRECCIÓN]"), has(f.ciudad) ? escapeHtml(f.ciudad) : val(f.ciudad, "[CIUDAD]")].join(", ");
  tickets.push(`
    <article class="ticket" aria-label="Fiesta">
      <div class="ticket__stub">
        <span class="ticket__day" aria-hidden="true">${p ? p.d : "··"}</span>
        <span class="ticket__when">
          <span class="ticket__weekday">${p ? weekdayOf(p) : "Fecha"}</span>
          <span class="ticket__month">${p ? `${monthName(p)} ${p.y}` : val(cfg.fecha?.inicio, "[FECHA]")}</span>
        </span>
        <span class="ticket__kind">${cfg.secciones?.ceremonia ? "Fiesta" : "Entrada · Nº 015"}</span>
      </div>
      <div class="ticket__body">
        <dl class="ticket__rows">
          ${row("calendar", "Fecha", model.dateLong ? escapeHtml(model.dateLong) : val(cfg.fecha?.inicio, "[FECHA]"))}
          ${row("clock", "Horario", model.timeRange ? escapeHtml(model.timeRange) : val(null, "[HORARIO]"))}
          ${row("pin", "Salón", val(f.salon, "[SALÓN]"), addr)}
        </dl>
        <div class="ticket__actions">
          ${mapsAction(model.partyMaps)}
          <button type="button" class="btn btn--ghost" data-open-calendar aria-haspopup="dialog">${icon("calendar-plus")}<span>Agendar</span></button>
        </div>
      </div>
    </article>`);

  host.innerHTML = tickets.join("");
  host.setAttribute("data-reveal", "");

  host.addEventListener("click", (e) => {
    const missing = e.target.closest("[data-missing]");
    if (missing) { toast(missing.dataset.missing, { type: "info", ms: 3600 }); return; }
    const cal = e.target.closest("[data-open-calendar]");
    if (cal) calendar.open(cal);
  });
}
