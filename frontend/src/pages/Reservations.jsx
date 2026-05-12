import { useMemo, useState } from "react";
import { BARBERS, SERVICES } from "../constants.js";
import { createReservation, getReservations } from "../services/api.js";

const HOURS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
];

// Convierte fecha Date a formato YYYY-MM-DD.
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Indica si una hora de un dia seleccionado ya paso.
function isPastHour(date, label) {
  const [time, ampm] = label.split(" ");
  let [hour, minute] = time.split(":").map(Number);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  return slot.getTime() < Date.now();
}

// Renderiza y procesa el formulario multipaso de reservas.
export default function Reservations() {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ nombre: "", apellido: "", telefono: "", correo: "" });
  const [services, setServices] = useState([]);
  const [barber, setBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState("");
  const [busyHours, setBusyHours] = useState([]);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const total = useMemo(() => services.reduce((sum, service) => sum + service.price, 0), [services]);
  const days = useMemo(() => Array.from({ length: 21 }, (_, index) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + index)), []);

  // Actualiza los datos personales del cliente.
  function handleCustomerChange(event) {
    setCustomer({ ...customer, [event.target.name]: event.target.value });
  }

  // Agrega o quita servicios seleccionados.
  function toggleService(service) {
    setServices((current) => {
      const exists = current.some((item) => item.name === service.name);
      return exists ? current.filter((item) => item.name !== service.name) : [...current, service];
    });
  }

  // Valida el primer paso antes de pasar a fecha y hora.
  async function continueToDate() {
    setMessage("");
    if (!customer.nombre || !customer.apellido || !customer.telefono || !customer.correo) {
      setMessage("Por favor completa todos los campos.");
      return;
    }
    if (services.length === 0) {
      setMessage("Selecciona al menos un servicio.");
      return;
    }
    if (!barber) {
      setMessage("Selecciona un barbero.");
      return;
    }
    setStep(2);
  }

  // Carga horarios ocupados cuando se elige un dia.
  async function selectDate(date) {
    const barberId = BARBERS.find((item) => item.name === barber)?.id || 0;
    const isoDate = toISODate(date);
    setSelectedDate(date);
    setSelectedHour("");
    setBusyHours([]);
    setMessage("");

    try {
      const reservations = await getReservations(barberId);
      setBusyHours(reservations.filter((reservation) => reservation.fecha === isoDate).map((reservation) => reservation.hora));
    } catch (err) {
      setMessage("Se selecciono la fecha, pero no se pudieron cargar los horarios ocupados. Verifica que MySQL este iniciado antes de confirmar la reserva.");
    }
  }

  // Confirma que haya fecha y hora antes de mostrar resumen.
  function continueToSummary() {
    setMessage("");
    if (!selectedDate || !selectedHour) {
      setMessage("Selecciona una fecha y hora antes de continuar.");
      return;
    }
    setStep(3);
  }

  // Envia la reserva final al backend Flask.
  async function submitReservation(event) {
    event.preventDefault();
    setMessage("");
    try {
      await createReservation({
        ...customer,
        barbero: barber,
        servicios: services.map((service) => service.name).join(", "),
        total,
        fecha: toISODate(selectedDate),
        hora: selectedHour,
      });
      setSaved(true);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <main className="reservation-page">
      <header className="reservation-header text-center">
        <h1>Agenda tu Cita</h1>
        <p>Reserva en línea y asegura tu horario con tu barbero favorito</p>
      </header>

      <form className="form-section container step-card" onSubmit={submitReservation}>
        {message && <div className="alert alert-warning">{message}</div>}

        {step === 1 && (
          <section>
            <h2 className="titulo-seccion"><i className="fa-solid fa-user" /> Tus Datos</h2>
            <div className="row mb-3">
              {["nombre", "apellido", "telefono", "correo"].map((field) => (
                <div className="col-md-6 mb-3" key={field}>
                  <label className="form-label text-capitalize" htmlFor={field}>{field}</label>
                  <input id={field} name={field} type={field === "correo" ? "email" : "text"} className="form-control" value={customer[field]} onChange={handleCustomerChange} required />
                </div>
              ))}
            </div>

            <label className="form-label d-block text-center subtitulo">Selecciona los Servicios</label>
            <div className="servicios-grid">
              {SERVICES.map((service) => {
                const selected = services.some((item) => item.name === service.name);
                return (
                  <button type="button" className={`servicio-card ${selected ? "selected" : ""}`} key={service.name} onClick={() => toggleService(service)}>
                    <i className={service.icon} />
                    <p>{service.name}</p>
                    <span>Q{service.price}</span>
                  </button>
                );
              })}
            </div>

            <label className="form-label d-block text-center subtitulo mt-4">Selecciona tu Barbero</label>
            <div className="barberos-grid">
              {BARBERS.map((item) => (
                <button type="button" className={`barbero-card ${barber === item.name ? "selected" : ""}`} key={item.name} onClick={() => setBarber(item.name)}>
                  <img src={item.image} alt={item.name} />
                  <p>{item.name}</p>
                </button>
              ))}
            </div>

            <div className="text-center mt-4">
              <button type="button" className="btn-neon" onClick={continueToDate}>Continuar</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-center mb-4"><i className="fa-solid fa-calendar-days" /> Selecciona Fecha y Hora</h2>
            <div className="calendar-container">
              <div className="calendar-box">
                <div className="calendar-grid reservation-days">
                  {days.map((date) => {
                    const disabled = date.getDay() === 0;
                    const isoDate = toISODate(date);
                    return (
                      <button type="button" disabled={disabled} className={`day ${selectedDate && toISODate(selectedDate) === isoDate ? "selected" : ""}`} key={isoDate} onClick={() => selectDate(date)}>
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="hours-box">
                <h4>{selectedDate ? `Horarios disponibles para ${selectedDate.toLocaleDateString("es-GT")}` : "Selecciona un día"}</h4>
                <div className="hours-grid">
                  {HOURS.map((hour) => {
                    const disabled = !selectedDate || busyHours.includes(hour) || isPastHour(selectedDate, hour);
                    return (
                      <button type="button" disabled={disabled} className={`hour ${selectedHour === hour ? "selected" : ""}`} key={hour} onClick={() => setSelectedHour(hour)}>
                        {hour}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="text-center mt-4 d-flex justify-content-center gap-3">
              <button type="button" className="btn-back" onClick={() => setStep(1)}>Regresar</button>
              <button type="button" className="btn-neon" onClick={continueToSummary}>Continuar</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="text-center mb-4"><i className="fa-solid fa-receipt" /> Resumen de tu Cita</h2>
            <div className="resumen-box">
              <p><strong>Nombre:</strong> {customer.nombre} {customer.apellido}</p>
              <p><strong>Contacto:</strong> {customer.telefono} | {customer.correo}</p>
              <p><strong>Barbero:</strong> {barber}</p>
              <p><strong>Servicios:</strong> {services.map((service) => service.name).join(", ")}</p>
              <p><strong>Fecha y Hora:</strong> {toISODate(selectedDate)}, {selectedHour}</p>
              <p><strong>Total:</strong> Q{total.toFixed(2)}</p>
            </div>
            <div className="text-center mt-4">
              <button type="submit" className="btn-neon"><i className="fa-solid fa-check" /> Confirmar Reserva</button>
            </div>
          </section>
        )}
      </form>

      {saved && (
        <div className="mensaje-exito">
          <div className="contenido-exito text-center">
            <i className="fa-solid fa-circle-check icono-exito" />
            <h3>¡Tu cita fue enviada con éxito!</h3>
            <a href="/" className="btn-neon mt-3">Volver al Inicio</a>
          </div>
        </div>
      )}
    </main>
  );
}
