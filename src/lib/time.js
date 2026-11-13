/**
 * Fechas "de pared" (como las escribe quien organiza) + zona horaria IANA
 * → instantes reales. Sin dependencias; funciona igual en el navegador y en Node.
 */

const RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

/** "2027-03-20T21:30" → { y, mo, d, h, mi, s, hasTime } | null */
export function parseLocal(value) {
  if (typeof value !== "string") return null;
  const m = value.trim().match(RE);
  if (!m) return null;
  const p = {
    y: +m[1], mo: +m[2], d: +m[3],
    h: m[4] !== undefined ? +m[4] : 0,
    mi: m[5] !== undefined ? +m[5] : 0,
    s: m[6] !== undefined ? +m[6] : 0,
    hasTime: m[4] !== undefined,
  };
  if (p.mo < 1 || p.mo > 12 || p.d < 1 || p.h > 23 || p.mi > 59 || p.s > 59) return null;
  const check = new Date(Date.UTC(p.y, p.mo - 1, p.d));
  if (check.getUTCMonth() !== p.mo - 1 || check.getUTCDate() !== p.d) return null;
  return p;
}

export function isValidTimeZone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const dtfCache = new Map();
function partsFormatter(timeZone) {
  if (!dtfCache.has(timeZone)) {
    dtfCache.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  return dtfCache.get(timeZone);
}

/** Diferencia (ms) entre la hora local de `timeZone` y UTC en el instante `ts`. */
function offsetAt(ts, timeZone) {
  const parts = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(new Date(ts))) parts[type] = value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUTC - Math.floor(ts / 1000) * 1000;
}

/** Hora de pared en `timeZone` → Date (instante real). */
export function zonedToDate(p, timeZone) {
  if (!p) return null;
  const wall = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  if (!isValidTimeZone(timeZone)) return new Date(wall); // respaldo: UTC
  const off1 = offsetAt(wall, timeZone);
  let ts = wall - off1;
  const off2 = offsetAt(ts, timeZone);
  if (off2 !== off1) ts = wall - off2; // cambio de horario de verano
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fecha de inicio y fin del evento. Si el fin es anterior al inicio, es el día siguiente. */
export function eventRange(fecha = {}) {
  const tz = isValidTimeZone(fecha.zonaHoraria) ? fecha.zonaHoraria : "America/Argentina/Buenos_Aires";
  const startP = parseLocal(fecha.inicio);
  if (!startP) return { tz, startP: null, start: null, endP: null, end: null };
  const start = zonedToDate(startP, tz);
  let endP = parseLocal(fecha.fin);
  // "fin" puede ser solo una hora ("05:00")
  if (!endP && typeof fecha.fin === "string" && /^\d{1,2}:\d{2}$/.test(fecha.fin.trim())) {
    const [h, mi] = fecha.fin.trim().split(":").map(Number);
    if (h <= 23 && mi <= 59) endP = { ...startP, h, mi, s: 0, hasTime: true };
  }
  let end = endP ? zonedToDate(endP, tz) : null;
  if (end && start && end <= start) {
    const next = new Date(Date.UTC(endP.y, endP.mo - 1, endP.d + 1));
    endP = { ...endP, y: next.getUTCFullYear(), mo: next.getUTCMonth() + 1, d: next.getUTCDate() };
    end = zonedToDate(endP, tz);
  }
  return { tz, startP, start, endP, end };
}

/* ── Formatos en español (a partir de la hora de pared, sin conversiones) ── */
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pad = (n) => String(n).padStart(2, "0");

export function weekdayOf(p) {
  return WEEKDAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
}
export function monthName(p) { return MONTHS[p.mo - 1]; }

/** "Sábado 20 de marzo de 2027" */
export function formatLongDate(p) {
  return `${cap(weekdayOf(p))} ${p.d} de ${monthName(p)} de ${p.y}`;
}
/** "20 de marzo" */
export function formatDayMonth(p) { return `${p.d} de ${monthName(p)}`; }
/** "20.03.27" */
export function formatShortDate(p) { return `${pad(p.d)}.${pad(p.mo)}.${String(p.y).slice(-2)}`; }
/** "21:30" */
export function formatTime(p) { return `${pad(p.h)}:${pad(p.mi)}`; }

/** Cuenta regresiva: { d, h, m, s, total } */
export function diffParts(target, now = Date.now()) {
  const total = target - now;
  const t = Math.max(0, Math.floor(total / 1000));
  return { total, d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** 20270321T003000Z */
export function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
