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

Todo está en **`config/evento.js`**: nombre, fecha, horario, zona horaria, salón, ceremonia, dress code, planilla de respuestas, acompañantes, regalos, música, hashtag, secciones visibles, textos y colores.

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
| Planilla de Google (confirmaciones y temas) | `planilla.url` | muestra lo que se guardaría, sin enviar |
| Fecha, salón y dirección | `fecha`, `fiesta` | contador, "Agendar" y "Cómo llegar" en espera |
| Datos de regalo | `regalos` | se ven como pendientes; "Copiar" avisa |
| Hashtag / álbum de fotos | `participacion.fotos` | el módulo se ve como pendiente |
| Música | `musica.archivo` + archivo en `assets/audio/` | la invitación funciona sin música |
| Segundo donde arranca la canción | `musica.inicio` | arranca desde el principio |
| Dirección pública | `sitio.url` | WhatsApp no muestra la imagen de vista previa |

**Música.** Los navegadores no dejan sonar nada hasta que el invitado toca la pantalla. Por eso la portada tiene un botón sutil "Encendé la música" (también sirve cualquier toque en la pantalla). La canción arranca desde el principio (`musica.inicio`) y sigue de corrido: "Entrar a la fiesta" la enciende si todavía no sonaba, pero nunca la reinicia ni salta. Si la portada se saltea, el botón ♫ del dock la arranca desde el principio.

Usá solo música con autorización de uso. Para ocultar un módulo opcional, ponelo en `false` dentro de `secciones`.

## Planilla de respuestas (Google Sheets)

Las confirmaciones y los temas sugeridos se guardan en una Google Sheet, en dos pestañas: **Confirmaciones** y **Canciones**. Las pestañas se crean solas con el primer envío.

1. Creá una Google Sheet nueva y abrí **Extensiones → Apps Script**.
2. Pegá el contenido de `google/planilla.gs` y guardá.
3. **Implementar → Nueva implementación** → tipo *Aplicación web*, ejecutar como *Yo*, acceso *Cualquier usuario*.
4. Copiá la URL que termina en `/exec` y pegala en `planilla.url` de `config/evento.js`.
5. Probá una confirmación y un tema desde la invitación y revisá que aparezcan en la planilla.

Si después modificás el script, publicá una versión nueva: **Implementar → Administrar implementaciones → editar → Nueva versión**. Así la URL no cambia.

**Página de invitados (para la familia).** En `/invitados/` está la lista de confirmados, tomada de la misma planilla: cuántas personas vienen, quién confirmó, quién no va, restricciones con la comida y canciones sugeridas. Se actualiza sola cada 30 segundos. Solo funciona con la clave al final del link: `https://<dirección-del-sitio>/invitados/#clave=<CLAVE>`. La clave se configura en el script (`CLAVE_LISTA` en `google/planilla.gs`, ya pegado en Apps Script) y no va en el código de la web ni en git. La página no aparece en buscadores. Para ver cómo queda sin datos reales: `/invitados/?demo`.

El invitado ve "registrada" solo cuando la planilla confirma que guardó la fila. Si falla, ve un aviso para reintentar, y el reintento no duplica la fila.

**Ojo al probar:** con la planilla conectada, cada confirmación y cada canción que se envía llega a la planilla real, también probando en local. Después borrá esas filas a mano. `?demo` solo funciona mientras el nombre está sin cargar. Si cargás confirmaciones a mano en la planilla (por ejemplo, de alguien que avisó por teléfono), en "Asistencia" escribí exactamente `Sí`, con tilde: si no, aparece en "No vienen".

## Estructura

```
config/evento.js        datos editables (único archivo a tocar)
google/planilla.gs      script de Google Apps Script para la planilla (no se publica)
config/demo.js          datos ficticios para ?demo
src/main.js             arma la experiencia
src/components/         bola disco (canvas), ambientación, portada, hero, contador,
                        ubicación, calendario, confirmación, secciones, dock
src/lib/                fechas y zona horaria, datos, .ics, sistema de movimiento
src/styles/             tokens, base, efectos, escenas, interfaz
assets/                 fuentes (self-hosted), íconos, imagen para compartir
scripts/                servidor local, build, plantilla de la imagen para compartir
```

**Movimiento.** La ambientación anima solo `transform` y `opacity`. Se pausa fuera de pantalla y con la pestaña oculta, y baja la calidad sola en equipos modestos. Respeta "reducir movimiento" del sistema. El botón ♫ del dock controla la música.

**Orden de la invitación.** Portada → inicio (nombre y bola) → dress code → cuándo y dónde → confirmación → regalos → participá → cierre con la cuenta regresiva (última pantalla).

**Bola y efectos.** La bola de la portada y del inicio sigue la referencia del cliente: estallido de rayos, brillitos que salen volando, pista de baile en perspectiva y, cada pocos segundos, una ola de luz que recorre los espejos (`src/components/stage.js` y las opciones `vivid` y `sweep` de `discoBall.js`). Al entrar a la fiesta la bola gira un poco más rápido unos segundos y salen los láseres desde abajo. Cada sección tiene su propio efecto al llegar, una sola vez (`src/components/sectionFx.js`): caleidoscopio, anillos de neón, velocidad luz, flash de cámara, ecualizador y láseres. Las referencias en video están en `fuentes/referencias/` (no se publican).
