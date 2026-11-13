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
    url: "https://mis15-valentina.netlify.app", // FICTICIO: reemplazar por la dirección real
    // Opcional. Si quedan vacíos se arman solos con el nombre.
    titulo: "",
    descripcion: "",
  },

  // ── Cumpleañera ─────────────────────────────────────────────────────
  nombre: "Valentina",

  // ── Fecha y horario ─────────────────────────────────────────────────
  fecha: {
    inicio: "2027-03-20T21:30", //   ej: "2027-03-20T21:30"
    fin: "2027-03-21T05:00", //      ej: "2027-03-21T05:00" (opcional)
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

  // ── Confirmación de asistencia ──────────────────────────────────────
  confirmacion: {
    fechaLimite: "2027-03-01", //    ej: "2027-03-01"
    // Número que recibe las confirmaciones, solo dígitos:
    // código de país + código de área + número, sin 0 ni 15.
    // ej: "5491122334455"
    // FICTICIO (no asignado): reemplazar por el número real antes de compartir.
    whatsapp: "5491100000000",
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
    archivo: "", //                  ej: "assets/audio/tema.mp3"
    titulo: "",
    artista: "",
    volumen: 0.55,
  },

  // ── Participación ───────────────────────────────────────────────────
  participacion: {
    cancion: {
      // "whatsapp": arma un mensaje con el tema sugerido.
      // "link": abre un formulario o una playlist colaborativa.
      canal: "whatsapp",
      whatsapp: "", //               si queda vacío usa el de confirmación
      url: "", //                    para canal "link"
    },
    fotos: {
      hashtag: "#Valen15Disco", //   ej: "#Valen15Disco"
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
