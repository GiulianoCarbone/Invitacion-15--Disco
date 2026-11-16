/** @OnlyCurrentDoc */
// ↑ Limita el permiso a ESTA planilla (sin esa línea, Google pide acceso a todas tus planillas).

/**
 * Planilla de la invitación: recibe confirmaciones y temas sugeridos, y le pasa la
 * lista a la página de invitados (solo con la clave).
 *
 * Cómo instalarlo (una sola vez):
 *   1. Creá una Google Sheet nueva (por ejemplo "Mis 15 · Respuestas").
 *   2. Menú Extensiones → Apps Script. Borrá lo que haya y pegá este archivo completo.
 *   3. Reemplazá PEGAR_ACA_LA_CLAVE (abajo) por la clave de la página de invitados.
 *      La clave queda solo acá: no va en el código de la web ni en git.
 *   4. Guardá. Arriba a la derecha: Implementar → Nueva implementación.
 *      Tipo: "Aplicación web".  Ejecutar como: "Yo".  Quién tiene acceso: "Cualquier usuario".
 *   5. Autorizá los permisos que pide Google y copiá la URL que termina en /exec.
 *   6. Pegala en config/evento.js → planilla.url y volvé a hacer el build.
 *
 * Si cambiás este código: Implementar → Administrar implementaciones → editar (lápiz) →
 * Versión: "Nueva versión". Así la URL /exec sigue siendo la misma.
 *
 * Las pestañas "Confirmaciones" y "Canciones" se crean solas con el primer envío.
 */

// Clave de la página de invitados: solo quien la tenga puede ver la lista.
var CLAVE_LISTA = "PEGAR_ACA_LA_CLAVE";

var TABS = {
  confirmacion: {
    name: "Confirmaciones",
    headers: ["Fecha y hora", "Nombre y apellido", "Asistencia", "Personas", "Restricciones alimentarias", "ID"],
    row: function (d) {
      var yes = d.asistencia === "si";
      return [
        new Date(),
        clean(d.nombre, 80),
        yes ? "Sí" : "No",
        yes ? Math.max(1, Math.min(20, parseInt(d.personas, 10) || 1)) : 0,
        yes ? clean(d.restricciones, 140) : "",
        clean(d.id, 40),
      ];
    },
  },
  cancion: {
    name: "Canciones",
    headers: ["Fecha y hora", "Tema y artista", "Sugerido por", "ID"],
    row: function (d) {
      return [new Date(), clean(d.tema, 120), clean(d.nombre, 80), clean(d.id, 40)];
    },
  },
};

/** Página de invitados: devuelve la lista solo si la clave coincide. Nunca devuelve los ID internos. */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (!CLAVE_LISTA || CLAVE_LISTA === "PEGAR_ACA_LA_CLAVE" || String(p.clave || "") !== CLAVE_LISTA) {
      return reply({ ok: false, error: "clave" });
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return reply({
      ok: true,
      actualizado: new Date().toISOString(),
      confirmaciones: readTab(ss, TABS.confirmacion, function (r) {
        return { fecha: iso(r[0]), nombre: String(r[1]), asistencia: r[2] === "Sí" ? "si" : "no", personas: Number(r[3]) || 0, restricciones: String(r[4] || "") };
      }),
      canciones: readTab(ss, TABS.cancion, function (r) {
        return { fecha: iso(r[0]), tema: String(r[1]), nombre: String(r[2] || "") };
      }),
    });
  } catch (err) {
    return reply({ ok: false, error: "servidor" });
  }
}

function readTab(ss, tab, map) {
  var sheet = ss.getSheetByName(tab.name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, tab.headers.length).getValues().map(map);
}

function iso(v) {
  return v instanceof Date ? v.toISOString() : String(v || "");
}

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var tab = TABS[d.tipo];
    if (!tab) return reply({ ok: false, error: "tipo" });
    if (d.web) return reply({ ok: true }); // campo trampa para bots: se ignora en silencio
    if (d.tipo === "confirmacion" && (!clean(d.nombre, 80) || (d.asistencia !== "si" && d.asistencia !== "no"))) {
      return reply({ ok: false, error: "datos" });
    }
    if (d.tipo === "cancion" && clean(d.tema, 120).length < 2) return reply({ ok: false, error: "datos" });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getSheet(tab);
      // un reintento del mismo envío no duplica la fila
      var id = clean(d.id, 40);
      if (id && isDuplicate(sheet, id, tab.headers.length)) return reply({ ok: true, repetido: true });
      sheet.appendRow(tab.row(d));
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: "servidor" });
  }
}

function getSheet(tab) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(tab.headers);
    sheet.getRange(1, 1, 1, tab.headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Revisa los últimos 50 envíos. */
function isDuplicate(sheet, id, idCol) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var from = Math.max(2, last - 49);
  var ids = sheet.getRange(from, idCol, last - from + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return true;
  return false;
}

/** Texto plano, recortado y sin fórmulas (= + - @ al inicio se toman como fórmula en Sheets). */
function clean(v, max) {
  var s = String(v == null ? "" : v).replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
