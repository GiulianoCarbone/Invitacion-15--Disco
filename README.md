# Invitación · Mis 15 Disco

Invitación web para una fiesta de 15 con temática disco. Es un sitio estático, sin dependencias, pensado primero para celular.

## Cómo verla

Necesitás [Node.js](https://nodejs.org) 18 o superior.

```bash
npm start            # http://localhost:5173, o el siguiente puerto libre si está ocupado
```

- `http://localhost:5173/?demo` muestra un ejemplo completo con datos ficticios. Funciona solo mientras el nombre no esté cargado.
- El servidor también muestra una dirección para abrir la invitación desde el celular, conectado a la misma wifi.
- No abras `index.html` con doble clic: los módulos de JavaScript necesitan un servidor.

## Dónde cambiar los datos

Todo está en **`config/evento.js`**: nombre, fecha, horario, zona horaria, salón, ceremonia, dress code, WhatsApp de confirmaciones, acompañantes, regalos, música, hashtag, secciones visibles, textos y colores.

- Cada valor entre corchetes, como `"[SALÓN]"`, es un dato pendiente. La invitación lo muestra marcado y no ejecuta la acción que depende de él.
- Un texto vacío (`""`) significa "no aplica" y ese dato no se muestra.
- El pie de la página muestra cuántos datos faltan.

## Publicar

```bash
npm run build        # genera dist/
npm run preview      # revisa dist/ antes de subirla
```

Subí la carpeta `dist/` a un hosting estático, como Netlify, Vercel, Cloudflare Pages o GitHub Pages.

El build completa el título, la descripción y la imagen para compartir, y genera `evento.ics` para "Agendar". Después de cada cambio en la config, volvé a correr `npm run build`.

**Para la vista previa en WhatsApp** hay que cargar `sitio.url` con la dirección pública final (por ejemplo `https://mis15-valen.netlify.app`) y volver a hacer el build. WhatsApp guarda la vista previa en caché: conviene configurarla antes de compartir el link por primera vez.

## Pendiente de configurar

| Qué | Dónde | Sin configurar |
|---|---|---|
| WhatsApp que recibe confirmaciones | `confirmacion.whatsapp` | muestra el mensaje armado, sin abrir WhatsApp |
| Fecha, salón y dirección | `fecha`, `fiesta` | contador, "Agendar" y "Cómo llegar" en espera |
| Datos de regalo | `regalos` | se ven como pendientes; "Copiar" avisa |
| Hashtag / álbum de fotos | `participacion.fotos` | el módulo se ve como pendiente |
| Música | `musica.archivo` + archivo en `assets/audio/` | la invitación funciona sin música |
| Dirección pública | `sitio.url` | WhatsApp no muestra la imagen de vista previa |

Usá solo música con autorización de uso. Para ocultar un módulo opcional, ponelo en `false` dentro de `secciones`.

La confirmación arma un mensaje y abre WhatsApp: la respuesta queda hecha cuando el invitado lo envía. No hay base de datos de confirmaciones.

## Estructura

```
config/evento.js        datos editables (único archivo a tocar)
config/demo.js          datos ficticios para ?demo
src/main.js             arma la experiencia
src/components/         bola disco (canvas), ambientación, portada, hero, contador,
                        ubicación, calendario, confirmación, secciones, dock
src/lib/                fechas y zona horaria, datos, .ics, sistema de movimiento
src/styles/             tokens, base, efectos, escenas, interfaz
assets/                 fuentes (self-hosted), íconos, imagen para compartir
scripts/                servidor local, build, plantilla de la imagen para compartir
```

**Movimiento.** La ambientación anima solo `transform` y `opacity`. Se pausa fuera de pantalla y con la pestaña oculta, y baja la calidad sola en equipos modestos. Respeta "reducir movimiento" del sistema. El botón ✦ del dock pausa los efectos y el de ♫ controla la música por separado.
