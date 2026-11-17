/**
 * Utilidades compartidas por el servidor de desarrollo y el build:
 * completan los metadatos de index.html (título, descripción, imagen para
 * compartir) a partir de config/evento.js, y generan evento.ics.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function loadConfig() {
  // import fresco en cada llamada (el servidor de desarrollo refleja cambios sin reiniciar)
  const url = pathToFileURL(path.join(ROOT, "config", "evento.js")).href + `?t=${Date.now()}`;
  return (await import(url)).default;
}

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export async function renderIndex(cfg) {
  const { shareMeta, has, buildModel } = await import(pathToFileURL(path.join(ROOT, "src/lib/data.js")).href);
  let html = await readFile(path.join(ROOT, "index.html"), "utf8");
  const { title, description } = shareMeta(cfg);
  const site = has(cfg.sitio?.url) ? cfg.sitio.url.trim().replace(/\/+$/, "") : "";
  const model = buildModel(cfg);

  const setMeta = (key, value, kind = "property") => {
    const re = new RegExp(`(<meta ${kind}="${key}" content=")[^"]*(")`);
    html = html.replace(re, `$1${attr(value)}$2`);
  };
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`);
  setMeta("description", description, "name");
  setMeta("og:title", title);
  setMeta("og:description", description);
  if (site) {
    // ?v=<huella del archivo>: si cambia la imagen, cambia la dirección y los servicios que
    // guardan copia (Facebook, Telegram…) no siguen mostrando la vieja
    let v = "";
    try { v = `?v=${createHash("sha1").update(await readFile(path.join(ROOT, "assets/og-image.jpg"))).digest("hex").slice(0, 8)}`; } catch { /* sin imagen: sin versión */ }
    setMeta("og:image", `${site}/assets/og-image.jpg${v}`);
  }

  const extra = [];
  if (site) {
    extra.push(`<meta property="og:url" content="${attr(site + "/")}">`);
    extra.push(`<link rel="canonical" href="${attr(site + "/")}">`);
  }
  if (model.start) extra.push(`<link rel="alternate" type="text/calendar" href="evento.ics" title="Agendar la fiesta">`);
  if (extra.length) html = html.replace(/(<meta name="twitter:card"[^>]*>)/, `$1\n  ${extra.join("\n  ")}`);
  return html;
}

export async function renderICS(cfg) {
  const { buildModel, has } = await import(pathToFileURL(path.join(ROOT, "src/lib/data.js")).href);
  const { calendarData, buildICS } = await import(pathToFileURL(path.join(ROOT, "src/lib/ics.js")).href);
  const model = buildModel(cfg);
  const site = has(cfg.sitio?.url) ? cfg.sitio.url.trim() : "";
  const data = calendarData(model, site);
  return data ? buildICS(data, model.name || "mis15") : null;
}
