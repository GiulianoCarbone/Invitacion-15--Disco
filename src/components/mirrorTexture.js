/**
 * Textura de espejos (mosaico de bola disco) generada una vez y expuesta como
 * --mirror para usarla en el "15", la fecha del ticket, estrellas y muestras.
 */
export function initMirrorTexture() {
  try {
    const tiles = 12;
    const t = 16;
    const s = tiles * t;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    g.fillStyle = "#231a30";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const diag = 1 - ((x + y) / (tiles * 2)) * 0.3; // luz desde arriba a la izquierda
        let v = (0.62 + Math.random() * 0.42) * diag;
        const k = Math.random();
        let col;
        if (k < 0.09) { v = 1.08; col = [255, 255, 255]; } // espejo encendido
        else if (k < 0.2) col = [255, 150 + Math.random() * 50, 215];
        else if (k < 0.3) col = [195 + Math.random() * 30, 165, 255];
        else col = [232, 228, 244];
        const gr = g.createLinearGradient(x * t, y * t, x * t + t, y * t + t);
        gr.addColorStop(0, `rgb(${col.map((ch) => Math.min(255, ch * v * 1.15) | 0).join(",")})`);
        gr.addColorStop(1, `rgb(${col.map((ch) => (ch * v * 0.78) | 0).join(",")})`);
        g.fillStyle = gr;
        g.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
      }
    }
    document.documentElement.style.setProperty("--mirror", `url(${c.toDataURL("image/png")})`);
  } catch { /* queda el gradiente de respaldo */ }
}
