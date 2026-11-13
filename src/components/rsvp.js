import { $, $$, icon, escapeHtml, burst } from "../lib/dom.js";
import { quality } from "../lib/motion.js";
import { zonedToDate } from "../lib/time.js";

/** Abre WhatsApp dentro del gesto del visitante. Si el navegador bloquea la ventana, navega en la misma. */
export function openWhatsApp(number, text) {
  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  const w = window.open(url, "_blank");
  if (w) { try { w.opener = null; } catch { /* nada */ } }
  else window.location.href = url;
  return url;
}

function buildFloor() {
  const floor = $("[data-floor]");
  if (!floor) return;
  const make = () => {
    const small = window.innerWidth < 700;
    const cols = quality.low ? 8 : small ? 9 : 14;
    const rows = quality.low ? 4 : 6;
    const colors = ["var(--c-fuchsia)", "var(--c-violet)", "#e9e4ff", "var(--c-violet)"];
    floor.style.setProperty("--cols", cols);
    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = document.createElement("span");
        t.className = "floor__tile";
        t.style.setProperty("--tc", colors[(r + c * 3) % colors.length]);
        // ola diagonal: cada baldosa se enciende un poco después que la anterior
        t.style.setProperty("--d", `${(-((r * 0.9 + c * 0.55) % 8)).toFixed(2)}s`);
        frag.appendChild(t);
      }
    }
    floor.replaceChildren(frag);
  };
  make();
  quality.subscribe(make);
}

/** Confirmación de asistencia: valida, arma el mensaje y abre WhatsApp. */
export function initRsvp(model, { isDemo }) {
  buildFloor();
  const cfg = model.cfg;
  const conf = cfg.confirmacion || {};
  const form = $("[data-rsvp-form]");
  const nameInput = $("#rsvp-name");
  const nameErr = $("#rsvp-name-error");
  const attendSet = $(".field--choice", form);
  const attendErr = $("#rsvp-attend-error");
  const guestsField = $("[data-guests]", form);
  const guests = $("#rsvp-guests");
  const dietField = $("[data-diet]", form);
  const diet = $("#rsvp-diet");
  const status = $("[data-rsvp-status]", form);
  const submit = $("[data-rsvp-submit]", form);
  const submitLabel = $("span", submit);

  // Fecha límite
  const deadlineEl = $("[data-rsvp-deadline]");
  if (model.deadlineP) {
    const limit = zonedToDate({ ...model.deadlineP, h: 23, mi: 59, s: 59 }, model.tz);
    deadlineEl.innerHTML = limit && limit.getTime() < Date.now()
      ? `${icon("info")}<span>La fecha para confirmar ya pasó, pero todavía podés avisar.</span>`
      : `${icon("calendar")}<span>Confirmá antes del <strong>${escapeHtml(model.deadline)}</strong></span>`;
  } else {
    deadlineEl.innerHTML = `${icon("calendar")}<span>Confirmá antes del <span class="ph">${escapeHtml(conf.fechaLimite || "[FECHA_LIMITE_RSVP]")}</span></span>`;
  }

  // Acompañantes
  const max = Math.max(1, Math.min(20, Number(conf.maxAsistentes) || 1));
  const allowGuests = !!conf.permiteAcompanantes && max > 1;
  guests.max = String(max);
  $("#rsvp-guests-hint").textContent = `Hasta ${max} personas por confirmación.`;
  const clamp = () => {
    let v = Math.round(Number(guests.value) || 1);
    v = Math.max(1, Math.min(max, v));
    guests.value = String(v);
    $$("[data-step]", guestsField).forEach((b) => (b.disabled = (b.dataset.step === "-1" && v <= 1) || (b.dataset.step === "1" && v >= max)));
  };
  clamp();
  guestsField.addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    guests.value = String((Number(guests.value) || 1) + Number(b.dataset.step));
    clamp();
  });
  guests.addEventListener("change", clamp);

  const attending = () => form.elements.asistencia.value;
  function syncExtras() {
    const yes = attending() === "si";
    guestsField.hidden = !(yes && allowGuests);
    dietField.hidden = !(yes && conf.pedirRestricciones !== false);
  }
  form.addEventListener("change", (e) => {
    if (e.target.name === "asistencia") {
      syncExtras();
      setError(attendSet, attendErr, "");
    }
  });
  nameInput.addEventListener("input", () => { if (nameInput.getAttribute("aria-invalid") === "true") validateName(); });

  function setError(el, errEl, msg) {
    if (msg) {
      el.setAttribute("aria-invalid", "true");
      errEl.innerHTML = `${icon("info")}<span>${escapeHtml(msg)}</span>`;
      errEl.hidden = false;
    } else {
      el.removeAttribute("aria-invalid");
      errEl.hidden = true;
      errEl.textContent = "";
    }
  }
  function validateName() {
    const v = nameInput.value.trim().replace(/\s+/g, " ");
    let msg = "";
    if (v.length < 2) msg = "Escribí tu nombre y apellido.";
    else if (v.split(" ").length < 2) msg = "Sumá tu apellido, así sabemos quién sos.";
    setError(nameInput, nameErr, msg);
    return !msg;
  }

  function buildMessage() {
    const yes = attending() === "si";
    const lines = [
      `¡Hola! Te paso mi respuesta para los 15 de ${model.name || "la fiesta"} ✨`,
      "",
      `• Nombre: ${nameInput.value.trim().replace(/\s+/g, " ")}`,
      `• Asistencia: ${yes ? "¡Voy a estar!" : "No voy a poder ir"}`,
    ];
    if (yes && allowGuests) lines.push(`• Personas: ${guests.value}`);
    if (yes && diet.value.trim() && conf.pedirRestricciones !== false) lines.push(`• Restricciones alimentarias: ${diet.value.trim()}`);
    return lines.join("\n");
  }

  let resetTimer = 0;
  function flashButton(text) {
    clearTimeout(resetTimer);
    submit.classList.add("is-done");
    submitLabel.textContent = text;
    burst(submit);
    resetTimer = setTimeout(() => {
      submit.classList.remove("is-done");
      submitLabel.textContent = "Abrir WhatsApp para confirmar";
    }, 2600);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const okName = validateName();
    const okAttend = !!attending();
    setError(attendSet, attendErr, okAttend ? "" : "Elegí si venís o no.");
    if (!okName || !okAttend) {
      (okName ? $("input[name=asistencia]", form) : nameInput).focus();
      return;
    }
    clamp();
    const text = buildMessage();

    if (!model.wa || isDemo) {
      status.className = "rsvp__status is-sample";
      status.innerHTML = `
        <strong>${icon("info")}Versión de muestra</strong>
        <span>${isDemo ? "En la vista de ejemplo no se envían mensajes." : "Todavía falta configurar el WhatsApp que recibe las confirmaciones (<code>confirmacion.whatsapp</code>)."} Este es el mensaje que se va a abrir:</span>
        <pre>${escapeHtml(text)}</pre>`;
      flashButton("Mensaje preparado");
      return;
    }

    // Abrir WhatsApp de inmediato (sigue siendo parte del gesto del visitante)
    const url = openWhatsApp(model.wa, text);
    status.className = "rsvp__status is-ok";
    status.innerHTML = `
      <strong>${icon("check")}Tu mensaje está listo en WhatsApp</strong>
      <span>Envialo para que tu respuesta quede confirmada. ¿No se abrió WhatsApp? <a href="${escapeHtml(url)}" target="_blank" rel="noopener">Abrir de nuevo</a></span>`;
    flashButton("¡Listo! Revisá WhatsApp");
  });

  syncExtras();
}
