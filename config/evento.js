/**
 * ════════════════════════════════════════════════════════════════════
 *   DATOS DE LA FIESTA  ·  único archivo que hay que editar
 * ════════════════════════════════════════════════════════════════════
 *
 *   • Reemplazá cada valor entre corchetes, por ejemplo "[NOMBRE]".
 *     Mientras un dato siga entre corchetes, la invitación lo muestra
 *     como "pendiente" y la acción que depende de él no se ejecuta.
 *   • Un texto vacío ("") significa "no aplica": ese dato no se muestra.
 *   • Fechas y horas: "AAAA-MM-DDTHH:MM", en el horario del lugar de la
 *     fiesta (por ejemplo "2027-03-20T21:30"). La zona horaria se define
 *     abajo, así la cuenta regresiva es correcta desde cualquier país.
 *   • Para ver un ejemplo con datos completos, abrí la página agregando
 *     ?demo al final de la dirección. Funciona solo mientras el nombre
 *     siga sin cargar (los datos de ejemplo están en config/demo.js).
 */

export default {
  // ── Sitio y vista previa al compartir ───────────────────────────────
  sitio: {
    // Dirección pública donde va a quedar publicada la invitación.
    // WhatsApp la necesita para mostrar la imagen de vista previa.
    // Ejemplo: "https://mis15-valentina.netlify.app"
    url: "https://mis15-montserrat.netlify.app",
    // Opcional. Si quedan vacíos se arman solos con el nombre.
    titulo: "",
    descripcion: "",
  },

  // ── Cumpleañera ─────────────────────────────────────────────────────
  nombre: "Montserrat",

  // ── Fecha y horario ─────────────────────────────────────────────────
  fecha: {
    inicio: "2026-12-17T21:30", //   ej: "2027-03-20T21:30"
    fin: "2026-12-18T05:00", //      ej: "2027-03-21T05:00" (opcional)
    zonaHoraria: "America/Argentina/Buenos_Aires",
    // Opcional: reemplaza la fecha que se arma automáticamente.
    textoVisible: "", //             ej: "Sábado 20 de marzo"
  },

  // ── Fiesta ──────────────────────────────────────────────────────────
  fiesta: {
    salon: "Salón Cristal",
    direccion: "Av. Pellegrini 1500",
    ciudad: "Rosario, Santa Fe",
    // Opcional: link de Google Maps del salón. Si queda vacío,
    // "Cómo llegar" busca la dirección de arriba.
    mapsUrl: "",
  },

  // ── Ceremonia (solo si se hace en otro lugar) ───────────────────────
  // Se muestra únicamente si secciones.ceremonia es true.
  ceremonia: {
    titulo: "Ceremonia",
    lugar: "Parroquia San José",
    direccion: "Mitre 850",
    ciudad: "Rosario, Santa Fe",
    hora: "19:30", //                ej: "19:30"
    mapsUrl: "",
  },

  // ── Dress code ──────────────────────────────────────────────────────
  dressCode: {
    estilo: "Elegante con brillo", // ej: "Elegante con brillo"
    indicaciones: "Lentejuelas, metalizados y calzado cómodo: se baila toda la noche.",
    // Colores que nadie debería usar. Dejalo vacío [] si no hay.
    // ej: [{ nombre: "Fucsia", color: "#ff2d95" }]
    coloresReservados: [
      { nombre: "Fucsia", color: "#ff2d95" },
      { nombre: "Plateado", color: "#c9c6d6" },
    ],
    notaColores: "Reservados para la cumpleañera",
  },

  // ── Planilla de Google (confirmaciones y temas sugeridos) ───────────
  // Las respuestas se guardan en una Google Sheet. Instalación paso a paso
  // en google/planilla.gs. Pegá acá la URL que termina en /exec.
  // Si queda vacía, los formularios muestran lo que se guardaría, sin enviar.
  planilla: {
    url: "https://script.google.com/macros/s/AKfycbz13R4tR-bPyLLOjHC-2napDSvzuHz3NkR29o6wcN4TkE-YJXGaSYT9c2_HxVQqfofwSw/exec",
  },

  // ── Confirmación de asistencia ──────────────────────────────────────
  confirmacion: {
    fechaLimite: "2026-12-07", //    ej: "2027-03-01"
    permiteAcompanantes: true,
    maxAsistentes: 4, //             máximo por confirmación, incluyendo a quien confirma
    pedirRestricciones: true,
  },

  // ── Regalos ─────────────────────────────────────────────────────────
  regalos: {
    // FICTICIOS: reemplazar por los datos reales antes de compartir.
    titular: "Valentina Ejemplo",
    alias: "valen.mis15.ficticio",
    cbu: "0000003100000000000000",
    banco: "Banco de ejemplo", //    opcional
  },

  // ── Música ──────────────────────────────────────────────────────────
  // Usá una pista con autorización de uso (propia, comprada con licencia
  // o libre de derechos). Guardala en assets/audio/ y poné la ruta acá.
  // Si queda vacío, la invitación funciona sin música.
  musica: {
    archivo: "assets/audio/daddy-cool.m4a", // ej: "assets/audio/tema.mp3"
    titulo: "Daddy Cool",
    artista: "Boney M.",
    volumen: 0.55,
    // Segundo donde arranca la canción (0 = desde el principio). Una vez que
    // empieza a sonar sigue de corrido: entrar a la fiesta no la reinicia ni salta.
    inicio: 0,
  },

  // ── Participación ───────────────────────────────────────────────────
  participacion: {
    cancion: {
      // "planilla": el tema se guarda en la pestaña "Canciones" de la planilla.
      // "link": abre una playlist colaborativa u otro formulario.
      canal: "planilla",
      url: "", //                    solo para canal "link"
    },
    fotos: {
      hashtag: "#Montse15Disco", //  ej: "#Valen15Disco"
      url: "", //                    opcional: álbum compartido para subir fotos
    },
  },

  // ── Secciones opcionales ────────────────────────────────────────────
  secciones: {
    cuentaRegresiva: true,
    ceremonia: false,
    dressCode: true,
    regalos: true,
    cancion: true,
    fotos: true,
  },

  // ── Textos principales ──────────────────────────────────────────────
  textos: {
    portada: "Una noche para brillar.",
    hero: "Se viene una noche que vamos a recordar siempre.",
    cuentaTitulo: "Cada vez falta menos para la fiesta",
    cuentaLlego: "¡Llegó la noche! Nos vemos en la pista.",
    cuentaTermino: "Gracias por ser parte de esta noche.",
    lugarTitulo: "Te espero para bailar",
    dressTitulo: "El look también es parte de la fiesta",
    rsvpTitulo: "¿Te sumás a la pista?",
    regalosTitulo: "Tu compañía es mi mejor regalo",
    regalosTexto:
      "Lo más lindo va a ser compartir esta noche con vos. Si además querés hacerme un regalo, te dejo los datos.",
    cancionTitulo: "¿Qué tema no puede faltar?",
    fotosTitulo: "Compartí la noche",
    cierre: "Nos vemos en la pista.",
  },

  // ── Colores ─────────────────────────────────────────────────────────
  colores: {
    fondo: "#07040d",
    violetaOscuro: "#160a2b",
    fucsia: "#ff2d95",
    violeta: "#8b3dff",
    plata: "#dcd8e8",
  },
};
