import { $, $$, icon, escapeHtml, burst } from "../lib/dom.js";
import { quality } from "../lib/motion.js";
import { zonedToDate } from "../lib/time.js";
import { sheetUrl, sendToSheet, newId } from "../lib/sheet.js";
import { celebrate } from "./celebration.js";

const LABEL = "Enviar confirmación";

/** Estado de envío compartido por los formularios (botón deshabilitado mientras viaja). */
export function setBusy(btn, labelEl, busy, text) {
  btn.disabled = busy;
  btn.setAttribute("aria-busy", busy ? "true" : "false");
  if (text) labelEl.textContent = text;
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

/** Confirmación de asistencia: valida y la guarda en la planilla de Google. */
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

  function collect() {
    const yes = attending() === "si";
    return {
      tipo: "confirmacion",
      nombre: nameInput.value.trim().replace(/\s+/g, " "),
      asistencia: yes ? "si" : "no",
      personas: yes ? (allowGuests ? Number(guests.value) || 1 : 1) : 0,
      restricciones: yes && conf.pedirRestricciones !== false ? diet.value.trim() : "",
      web: form.elements.web?.value || "",
    };
  }
  function summary(d) {
    const lines = [
      `Nombre: ${d.nombre}`,
      `Asistencia: ${d.asistencia === "si" ? "¡Voy a estar!" : "No voy a poder ir"}`,
    ];
    if (d.asistencia === "si" && allowGuests) lines.push(`Personas: ${d.personas}`);
    if (d.restricciones) lines.push(`Restricciones alimentarias: ${d.restricciones}`);
    return lines.join("\n");
  }

  let resetTimer = 0;
  /** `sparks`: los brillitos del botón (si confirma que viene, ya está el festejo grande). */
  function flashButton(text, { sparks = true } = {}) {
    clearTimeout(resetTimer);
    submit.classList.add("is-done");
    submitLabel.textContent = text;
    if (sparks) burst(submit);
    resetTimer = setTimeout(() => {
      submit.classList.remove("is-done");
      submitLabel.textContent = LABEL;
    }, 2600);
  }

  const url = sheetUrl(cfg);
  let pendingId = null; // mismo id en los reintentos: la planilla no duplica la fila
  let lastKey = "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    const okName = validateName();
    const okAttend = !!attending();
    setError(attendSet, attendErr, okAttend ? "" : "Elegí si venís o no.");
    if (!okName || !okAttend) {
      (okName ? $("input[name=asistencia]", form) : nameInput).focus();
      return;
    }
    clamp();
    const data = collect();
    const yes = data.asistencia === "si";
    const hadFocus = document.activeElement === submit;
    // celular: si envió con "Listo" del teclado, se cierra el teclado para que se vea el festejo
    const typing = document.activeElement;
    if (matchMedia("(pointer: coarse)").matches && typing && form.contains(typing) && typing.matches("input:not([type=radio]), textarea")) typing.blur();

    if (!url || isDemo) {
      status.className = "rsvp__status is-sample";
      status.innerHTML = `
        <strong>${icon("info")}Versión de muestra</strong>
        <span>${isDemo ? "En la vista de ejemplo no se guardan respuestas." : "Todavía falta conectar la planilla de Google (<code>planilla.url</code>)."} Esto es lo que se guardaría:</span>
        <pre>${escapeHtml(summary(data))}</pre>`;
      flashButton("Respuesta preparada", { sparks: !yes });
      if (yes) celebrate(submit); // en la muestra también, para ver el efecto
      return;
    }

    const key = JSON.stringify(data);
    if (key !== lastKey || !pendingId) { pendingId = newId(); lastKey = key; }
    clearTimeout(resetTimer);
    submit.classList.remove("is-done");
    setBusy(submit, submitLabel, true, "Enviando…");
    status.className = "rsvp__status";
    status.textContent = "";

    const res = await sendToSheet(url, { ...data, id: pendingId });
    setBusy(submit, submitLabel, false, LABEL);
    // mientras viajaba, el botón deshabilitado perdió el foco: si lo tenía, vuelve ahí (teclado y lectores de pantalla)
    if (hadFocus && document.activeElement === document.body) submit.focus({ preventScroll: true });

    if (res.ok) {
      pendingId = null;
      lastKey = "";
      status.className = "rsvp__status is-ok";
      status.innerHTML = `
        <strong>${icon("check")}${yes ? "¡Listo! Te espero en la pista" : "¡Gracias por avisar!"}</strong>
        <span>Tu respuesta quedó registrada. Si necesitás cambiar algo, volvé a enviarla.</span>`;
      flashButton(yes ? "¡Confirmado!" : "Respuesta enviada", { sparks: !yes });
      if (yes) celebrate(submit); // se mide el botón ahora: pudo haber scrolleado mientras esperaba
    } else {
      status.className = "rsvp__status is-error";
      status.innerHTML = `
        <strong>${icon("info")}No se pudo enviar tu respuesta</strong>
        <span>Revisá tu conexión y tocá “${LABEL}” de nuevo.</span>`;
    }
  });

  syncExtras();
}
