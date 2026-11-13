/**
 * Calendario: archivo .ics (en UTC) y link de Google Calendar.
 * Módulo puro: el build lo usa para generar evento.ics como archivo real.
 */
import { toICSDate } from "./time.js";
import { has } from "./data.js";

const DEFAULT_DURATION_H = 6;

function esc(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Plegado de líneas a 75 octetos (RFC 5545). */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let chunk = "";
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    if (size + len > (out.length ? 74 : 75)) {
      out.push(chunk);
      chunk = "";
      size = 0;
    }
    chunk += ch;
    size += len;
  }
  out.push(chunk);
  return out.join("\r\n ");
}

export function calendarData(model, siteUrl = "") {
  if (!model.start) return null;
  const cfg = model.cfg;
  const end = model.end || new Date(model.start.getTime() + DEFAULT_DURATION_H * 3600e3);
  const f = cfg.fiesta || {};
  const location = [f.salon, f.direccion, f.ciudad].filter(has).join(", ");
  const title = model.name ? `Mis 15 · ${model.name}` : "Fiesta de 15";
  const details = ["¡Nos vemos en la pista!", has(cfg.dressCode?.estilo) ? `Dress code: ${cfg.dressCode.estilo}` : "", siteUrl].filter(Boolean).join("\n");
  return { title, start: model.start, end, location, details };
}

export function buildICS(data, uidSeed = "mis15") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invitacion Mis 15//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${toICSDate(data.start)}-${uidSeed.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mis15"}@invitacion`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(data.start)}`,
    `DTEND:${toICSDate(data.end)}`,
    `SUMMARY:${esc(data.title)}`,
    data.location ? `LOCATION:${esc(data.location)}` : "",
    data.details ? `DESCRIPTION:${esc(data.details)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc("Mañana es la fiesta: " + data.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(data, tz) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: data.title,
    dates: `${toICSDate(data.start)}/${toICSDate(data.end)}`,
    details: data.details || "",
    location: data.location || "",
  });
  if (tz) params.set("ctz", tz);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
