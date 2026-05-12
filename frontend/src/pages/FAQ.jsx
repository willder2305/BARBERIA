import { Link } from "react-router-dom";

const QUESTIONS = [
  ["¿Cómo puedo reservar una cita?", "Puedes hacerlo desde Reservar Ahora en la página principal. Solo necesitas ingresar tus datos y elegir tu barbero."],
  ["¿Cuáles son los horarios de atención?", "Atendemos de lunes a sábado, de 9:00 am a 1:00 pm y de 2:00 pm a 7:00 pm."],
  ["¿Puedo elegir a mi barbero de preferencia?", "Sí, durante la reserva puedes seleccionar a cualquiera de nuestros barberos disponibles."],
  ["¿Cuáles son los métodos de pago?", "Aceptamos pagos en efectivo, transferencias bancarias y pagos QR."],
  ["¿Qué pasa si no puedo asistir a mi cita?", "Si no puedes llegar, te pedimos cancelarla con anticipación para liberar el espacio."],
];

// Renderiza la pagina de preguntas frecuentes.
export default function FAQ() {
  return (
    <main className="faq-page">
      <header className="faq-header">
        <h1>Preguntas Frecuentes</h1>
      </header>
      <section className="faq-section">
        {QUESTIONS.map(([question, answer]) => (
          <article className="faq-item" key={question}>
            <h3><i className="fa-solid fa-scissors" /> {question}</h3>
            <p>{answer}</p>
          </article>
        ))}
        <div className="text-center">
          <Link to="/" className="btn-back-home"><i className="fa-solid fa-arrow-left" /> Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}
