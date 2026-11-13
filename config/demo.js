/**
 * Datos de EJEMPLO para previsualizar la invitación completa con ?demo.
 * No hace falta editar este archivo: los datos reales van en evento.js.
 * El modo demo se desactiva solo cuando evento.js ya tiene el nombre.
 *
 * Las acciones que llevan a destinos reales (WhatsApp) siguen en modo
 * muestra: el ejemplo nunca envía mensajes a un número de verdad.
 */
export default {
  nombre: "Valentina",
  fecha: {
    inicio: "2027-03-20T21:30",
    fin: "2027-03-21T05:00",
  },
  fiesta: {
    salon: "Salón Cristal",
    direccion: "Av. Pellegrini 1500",
    ciudad: "Rosario, Santa Fe",
  },
  dressCode: {
    estilo: "Elegante con brillo",
    indicaciones: "Lentejuelas, metalizados y calzado cómodo: se baila toda la noche.",
    coloresReservados: [
      { nombre: "Fucsia", color: "#ff2d95" },
      { nombre: "Plateado", color: "#c9c6d6" },
    ],
  },
  confirmacion: {
    fechaLimite: "2027-03-01",
  },
  regalos: {
    titular: "Valentina Ejemplo",
    alias: "valen.mis15.ejemplo",
    cbu: "0000003100000000000000",
    banco: "Banco de ejemplo",
  },
  participacion: {
    fotos: { hashtag: "#Valen15Disco" },
  },
};
