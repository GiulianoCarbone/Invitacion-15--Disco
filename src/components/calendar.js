import { $ } from "../lib/dom.js";
import { has } from "../lib/data.js";
import { calendarData, buildICS, googleCalendarUrl } from "../lib/ics.js";
import { openModal, toast } from "./ui.js";

/**
 * "Agendar": Google Calendar + archivo .ics.
 * El build publica evento.ics como archivo real (más confiable en navegadores
 * dentro de apps como WhatsApp o Instagram); si no está, se genera en el momento.
 */
export function initCalendar(model, { isDemo }) {
  const dialog = $("#calendar-dialog");
  const site = has(model.cfg.sitio?.url) ? model.cfg.sitio.url : location.origin + location.pathname;
  const data = calendarData(model, site);
  const staticIcs = document.querySelector('link[rel="alternate"][type="text/calendar"]');
  let blobUrl = "";

  return {
    open(opener) {
      if (!data) {
        toast("Vas a poder agendarla cuando se confirme la fecha.", { type: "info", ms: 3400 });
        return;
      }
      $("[data-cal-google]", dialog).href = googleCalendarUrl(data, model.tz);
      const ics = $("[data-cal-ics]", dialog);
      if (staticIcs && !isDemo) {
        ics.href = staticIcs.getAttribute("href");
      } else {
        if (!blobUrl) blobUrl = URL.createObjectURL(new Blob([buildICS(data, model.name || "mis15")], { type: "text/calendar;charset=utf-8" }));
        ics.href = blobUrl;
      }
      ics.setAttribute("download", "mis15.ics");
      openModal(dialog, opener);
    },
  };
}
