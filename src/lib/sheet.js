/**
 * Envío a la planilla de Google (Apps Script publicado como aplicación web).
 * Se manda JSON como text/plain y sin encabezados propios: así el navegador no
 * hace la consulta previa (preflight) que Apps Script no sabe responder.
 * Solo cuenta como enviado si la planilla contesta {ok:true}.
 */
export { sheetUrl } from "./data.js";

export function newId() {
  return (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).slice(0, 40);
}

/** @returns {Promise<{ok: boolean, error?: string}>} */
export async function sendToSheet(url, data, { timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: `http-${res.status}` };
    const json = await res.json().catch(() => null);
    return json && json.ok === true ? { ok: true } : { ok: false, error: json?.error || "respuesta" };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "tiempo" : "red" };
  } finally {
    clearTimeout(timer);
  }
}
