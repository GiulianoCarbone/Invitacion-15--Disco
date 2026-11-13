/**
 * Servidor local sin dependencias.
 *   npm start            → http://localhost:5173
 *   npm start -- 8080    → otro puerto
 *   npm run preview      → sirve la carpeta dist/ (después de npm run build)
 * También queda disponible en la red local para probar desde el celular.
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ROOT, loadConfig, renderIndex, renderICS } from "./page.mjs";

const args = process.argv.slice(2);
const dist = args.includes("--dist");
const port = Number(args.find((a) => /^\d+$/.test(a))) || 5173;
const base = dist ? path.join(ROOT, "dist") : ROOT;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".ics": "text/calendar; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";

    if (!dist && p === "/index.html") {
      const html = await renderIndex(await loadConfig());
      res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" });
      return res.end(html);
    }
    if (!dist && p === "/evento.ics") {
      const ics = await renderICS(await loadConfig());
      if (!ics) { res.writeHead(404); return res.end("Fecha pendiente"); }
      res.writeHead(200, { "Content-Type": TYPES[".ics"], "Content-Disposition": 'attachment; filename="mis15.ics"', "Cache-Control": "no-store" });
      return res.end(ics);
    }

    const file = path.join(base, p);
    if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("no es archivo");
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const headers = { "Content-Type": type, "Cache-Control": "no-store" };
    if (type.startsWith("text/calendar")) headers["Content-Disposition"] = 'attachment; filename="mis15.ics"';
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No encontrado");
  }
});

// Si el puerto está ocupado (otro proyecto), prueba el siguiente.
let current = port;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && current < port + 20) {
    current++;
    server.listen(current, "0.0.0.0");
  } else {
    console.error(err.message);
    process.exit(1);
  }
});
server.on("listening", () => {
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === "IPv4" && !i.internal);
  console.log(`\n  ✦ Invitación lista ${dist ? "(dist)" : ""}${current !== port ? `  (el puerto ${port} estaba ocupado)` : ""}`);
  console.log(`    Local:  http://localhost:${current}/`);
  console.log(`    Demo:   http://localhost:${current}/?demo`);
  if (lan) console.log(`    Celular (misma wifi): http://${lan.address}:${current}/`);
  console.log("");
});
server.listen(current, "0.0.0.0");
