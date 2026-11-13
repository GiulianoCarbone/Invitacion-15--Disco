/**
 * npm run build → genera dist/ listo para subir a cualquier hosting estático
 * (Netlify, Vercel, GitHub Pages, Cloudflare Pages…).
 *  - completa título, descripción e imagen para compartir desde config/evento.js
 *  - genera evento.ics como archivo real (para "Agendar")
 *  - avisa qué datos siguen pendientes
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, loadConfig, renderIndex, renderICS } from "./page.mjs";

const DIST = path.join(ROOT, "dist");
const cfg = await loadConfig();
const { pendingFields, has } = await import(pathToFileURL(path.join(ROOT, "src/lib/data.js")).href);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (const dir of ["assets", "src", "config"]) {
  await cp(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
}
await writeFile(path.join(DIST, "index.html"), await renderIndex(cfg));

const ics = await renderICS(cfg);
if (ics) await writeFile(path.join(DIST, "evento.ics"), ics);

console.log("\n  ✦ Build listo en dist/\n");
if (!ics) console.log("  · Sin evento.ics: falta la fecha (fecha.inicio). \"Agendar\" se activa cuando esté cargada.");
if (!has(cfg.sitio?.url)) {
  console.log("  ⚠ Falta sitio.url: sin la dirección pública, WhatsApp no puede mostrar la imagen de vista previa.");
}
const pending = pendingFields(cfg);
if (pending.length) {
  console.log(`\n  Datos pendientes en config/evento.js (${pending.length}):`);
  for (const f of pending) console.log(`    - ${f.label}  (${f.key})`);
  console.log("\n  La invitación funciona igual y los muestra como \"pendientes\".");
}
console.log("");
