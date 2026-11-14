/**
 * Lee config/evento.js, resuelve el modo demo y expone datos derivados.
 * Módulo puro: lo usan tanto la página como los scripts de Node (build).
 */
import { eventRange, formatLongDate, formatShortDate, formatTime, formatDayMonth, parseLocal, weekdayOf, monthName, cap } from "./time.js";

/** Un dato está pendiente si está vacío o sigue entre corchetes: "[NOMBRE]". */
export function isPlaceholder(v) {
  return typeof v === "string" && /^\s*\[[^\]]*\]\s*$/.test(v);
}
export function isEmpty(v) {
  return v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}
export const isPending = (v) => isEmpty(v) || isPlaceholder(v);
export const has = (v) => !isPending(v);

export function deepMerge(base, extra) {
  if (Array.isArray(extra)) return extra.slice();
  if (!extra || typeof extra !== "object") return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra)) {
    out[k] = base && typeof base[k] === "object" && !Array.isArray(base[k]) ? deepMerge(base[k], extra[k]) : extra[k];
  }
  return out;
}

export function resolveConfig(base, demo, search = "") {
  const wantsDemo = new URLSearchParams(search).has("demo");
  const allowed = isPending(base.nombre);
  const isDemo = wantsDemo && allowed && !!demo;
  return { cfg: isDemo ? deepMerge(base, demo) : base, isDemo };
}

/** Solo dígitos; válido si tiene entre 10 y 15. */
export function waDigits(v) {
  if (!has(v)) return null;
  const digits = String(v).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** URL de la aplicación web de Apps Script (planilla de respuestas), o null. */
export function sheetUrl(cfg) {
  const url = cfg.planilla?.url;
  return has(url) && /^https:\/\/script\.google(usercontent)?\.com\//i.test(url.trim()) ? url.trim() : null;
}

export function mapsLink({ mapsUrl, salon, lugar, direccion, ciudad }) {
  if (has(mapsUrl) && /^https?:\/\//i.test(mapsUrl)) return mapsUrl;
  if (!has(direccion)) return null;
  const q = [has(salon) ? salon : has(lugar) ? lugar : "", direccion, has(ciudad) ? ciudad : ""].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Modelo de datos listo para mostrar. */
export function buildModel(cfg) {
  const range = eventRange(cfg.fecha);
  const name = has(cfg.nombre) ? cfg.nombre.trim() : null;
  const sp = range.startP;
  const deadlineP = parseLocal(cfg.confirmacion?.fechaLimite);

  const dateLong = has(cfg.fecha?.textoVisible) ? cfg.fecha.textoVisible : sp ? formatLongDate(sp) : null;
  const time = sp && sp.hasTime ? formatTime(sp) : null;
  const endTime = range.endP && range.endP.hasTime ? formatTime(range.endP) : null;

  return {
    cfg,
    name,
    initial: name ? name.charAt(0).toUpperCase() : "15",
    ...range,
    dateLong,
    datePill: has(cfg.fecha?.textoVisible) ? cfg.fecha.textoVisible : sp ? `${cap(weekdayOf(sp))} ${sp.d} de ${monthName(sp)} · ${sp.y}` : null,
    dateShort: sp ? formatShortDate(sp) : null,
    timeRange: time ? (endTime ? `De ${time} a ${endTime} h` : `Desde las ${time} h`) : null,
    deadline: deadlineP ? formatDayMonth(deadlineP) : null,
    deadlineP,
    partyMaps: mapsLink(cfg.fiesta || {}),
    ceremonyMaps: mapsLink(cfg.ceremonia || {}),
  };
}

/** Título y descripción para compartir. */
export function shareMeta(cfg) {
  const name = has(cfg.nombre) ? cfg.nombre.trim() : null;
  const range = eventRange(cfg.fecha);
  const when = range.startP ? formatDayMonth(range.startP) : null;
  const title = has(cfg.sitio?.titulo) ? cfg.sitio.titulo : name ? `${name} · Mis 15` : "Mis 15 · Una noche para brillar";
  const description = has(cfg.sitio?.descripcion)
    ? cfg.sitio.descripcion
    : `${when ? `Te espero el ${when}. ` : "Te invito a mis 15. "}Entrá para ver todos los detalles de la fiesta y confirmar tu asistencia.`;
  return { title, description };
}

/** Lista de datos pendientes, para el aviso de "versión de muestra". */
export function pendingFields(cfg) {
  const s = cfg.secciones || {};
  const out = [];
  const add = (cond, label, key) => cond && out.push({ label, key });
  add(isPending(cfg.nombre), "Nombre de la cumpleañera", "nombre");
  add(!parseLocal(cfg.fecha?.inicio), "Fecha y hora de la fiesta", "fecha.inicio");
  add(isPending(cfg.fiesta?.salon), "Salón", "fiesta.salon");
  add(isPending(cfg.fiesta?.direccion), "Dirección", "fiesta.direccion");
  add(isPending(cfg.fiesta?.ciudad), "Ciudad", "fiesta.ciudad");
  if (s.ceremonia) {
    add(isPending(cfg.ceremonia?.lugar), "Lugar de la ceremonia", "ceremonia.lugar");
    add(isPending(cfg.ceremonia?.direccion), "Dirección de la ceremonia", "ceremonia.direccion");
    add(isPending(cfg.ceremonia?.hora), "Hora de la ceremonia", "ceremonia.hora");
  }
  if (s.dressCode) add(isPending(cfg.dressCode?.estilo), "Dress code", "dressCode.estilo");
  add(!parseLocal(cfg.confirmacion?.fechaLimite), "Fecha límite para confirmar", "confirmacion.fechaLimite");
  add(!sheetUrl(cfg), "Planilla de Google para confirmaciones y temas", "planilla.url");
  if (s.regalos) {
    add(isPending(cfg.regalos?.titular), "Titular de la cuenta", "regalos.titular");
    add(isPending(cfg.regalos?.alias) && isPending(cfg.regalos?.cbu), "Alias o CBU/CVU", "regalos.alias");
  }
  if (s.cancion && cfg.participacion?.cancion?.canal === "link") add(isPending(cfg.participacion.cancion.url), "Link para sugerir temas", "participacion.cancion.url");
  if (s.fotos) add(isPending(cfg.participacion?.fotos?.hashtag), "Hashtag de fotos", "participacion.fotos.hashtag");
  add(isPending(cfg.sitio?.url), "Dirección pública del sitio (vista previa)", "sitio.url");
  return out;
}
