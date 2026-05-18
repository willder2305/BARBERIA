import { useEffect, useMemo, useState } from "react";
import { createReservation, getAvailability, getBarbers, getServices } from "../services/api.js";

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastHour(date, label) {
  if (!date || !label) return false;
  const [time, ampm] = label.split(" ");
  let [hour, minute] = time.split(":").map(Number);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  return slot.getTime() < Date.now();
}

function validPhone(value) {
  return /^[0-9]{8}$/.test(value);
}

export default function Reservations() {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ nombre: "", apellido: "", telefono: "" });
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [serviceIds, setServiceIds] = useState([]);
  const [barberId, setBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState("");
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saved, setSaved] = useState(null);

  const selectedServices = useMemo(
    () => services.filter((service) => serviceIds.includes(Number(service.id))),
    [services, serviceIds],
  );
  const estimatedTotal = useMemo(
    () => selectedServices.reduce((total, service) => total + Number(service.precio || 0), 0),
    [selectedServices],
  );
  const selectedBarber = useMemo(
    () => barbers.find((barber) => Number(barber.id) === Number(barberId)),
    [barbers, barberId],
  );
  const days = useMemo(
    () => Array.from({ length: 21 }, (_, index) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + index)),
    [],
  );

  function handleCustomerChange(event) {
    const value = event.target.name === "telefono" ? event.target.value.replace(/\D/g, "").slice(0, 8) : event.target.value;
    setCustomer({ ...customer, [event.target.name]: value });
  }

  function toggleService(id) {
    const numericId = Number(id);
    setServiceIds((current) => (
      current.includes(numericId)
        ? current.filter((item) => item !== numericId)
        : [...current, numericId]
    ));
  }

  async function loadAvailability(date = selectedDate) {
    if (!date || !barberId) return;
    const fecha = toISODate(date);
    const data = await getAvailability({ barberId, fecha, serviceIds });
    setSlots(data.slots || []);
  }

  async function continueToDate() {
    setMessage("");
    if (!customer.nombre.trim() || !customer.apellido.trim() || !customer.telefono.trim()) {
      setMessage("Nombre, apellido y telefono son obligatorios.");
      return;
    }
    if (!validPhone(customer.telefono)) {
      setMessage("El telefono debe tener exactamente 8 digitos numericos.");
      return;
    }
    if (serviceIds.length === 0) {
      setMessage("Selecciona al menos un servicio.");
      return;
    }
    if (!barberId) {
      setMessage("Selecciona un barbero.");
      return;
    }
    setStep(2);
  }

  async function selectDate(date) {
    setSelectedDate(date);
    setSelectedHour("");
    setSlots([]);
    setMessage("");
    try {
      await loadAvailability(date);
    } catch (err) {
      setMessage(err.message);
    }
  }

  function continueToSummary() {
    setMessage("");
    if (!selectedDate || !selectedHour) {
      setMessage("Selecciona una fecha y hora antes de continuar.");
      return;
    }
    setStep(3);
  }

  async function submitReservation(event) {
    event.preventDefault();
    setMessage("");
    try {
      const result = await createReservation({
        nombre: customer.nombre,
        apellido: customer.apellido,
        telefono: customer.telefono,
        barbero_id: Number(barberId),
        barbero: selectedBarber?.nombre,
        servicios: selectedServices.map((service) => service.nombre),
        fecha: toISODate(selectedDate),
        hora: selectedHour,
      });
      setSaved(result);
    } catch (err) {
      setMessage(err.message);
      if (selectedDate) loadAvailability(selectedDate).catch(console.error);
    }
  }

  useEffect(() => {
    let alive = true;
    async function loadCatalog() {
      setLoadingCatalog(true);
      const [serviceResult, barberResult] = await Promise.allSettled([getServices(), getBarbers()]);
      if (!alive) return;
      if (serviceResult.status === "fulfilled") {
        const serviceRows = serviceResult.value;
        setServices(serviceRows);
      } else {
        setMessage(serviceResult.reason.message || "No se pudieron cargar los servicios.");
      }
      if (barberResult.status === "fulfilled") {
        const barberRows = barberResult.value;
        setBarbers(barberRows);
      } else {
        setMessage(barberResult.reason.message || "No se pudieron cargar los barberos.");
      }
      setLoadingCatalog(false);
    }
    loadCatalog().catch((err) => {
      if (alive) {
        setMessage(err.message);
        setLoadingCatalog(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailability(selectedDate).catch((err) => setMessage(err.message));
    }
  }, [serviceIds, barberId]);

  return (
    <main className="reservation-page">
      <header className="reservation-header text-center">
        <h1>Agenda tu Cita</h1>
        <p>Reserva en linea y asegura tu horario con tu barbero favorito</p>
      </header>

      <form className="form-section container step-card" onSubmit={submitReservation}>
        {message && <div className="alert alert-warning">{message}</div>}

        {step === 1 && (
          <section>
            <h2 className="titulo-seccion"><i className="fa-solid fa-user" /> Tus Datos</h2>
            <div className="row mb-3">
              <div className="col-md-6 mb-3">
                <label className="form-label" htmlFor="nombre">Nombre</label>
                <input id="nombre" name="nombre" type="text" className="form-control" value={customer.nombre} onChange={handleCustomerChange} required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label" htmlFor="apellido">Apellido</label>
                <input id="apellido" name="apellido" type="text" className="form-control" value={customer.apellido} onChange={handleCustomerChange} required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label" htmlFor="telefono">Telefono</label>
                <input id="telefono" name="telefono" type="tel" inputMode="numeric" pattern="[0-9]{8}" minLength="8" maxLength="8" className="form-control" value={customer.telefono} onChange={handleCustomerChange} required />
              </div>
            </div>

            <label className="form-label d-block text-center subtitulo">Selecciona el Servicio</label>
            {loadingCatalog && <p className="catalog-status">Cargando servicios y barberos...</p>}
            {!loadingCatalog && services.length === 0 && <p className="catalog-status warn">No hay servicios disponibles. Revisa que la API y MySQL esten activos.</p>}
            <div className="servicios-grid">
              {services.map((service) => {
                const selected = serviceIds.includes(Number(service.id));
                return (
                  <button type="button" className={`servicio-card ${selected ? "selected" : ""}`} key={service.id} onClick={() => toggleService(service.id)} aria-pressed={selected}>
                    <i className={service.requiere_separacion ? "fa-solid fa-spa" : "fa-solid fa-scissors"} />
                    <p>{service.nombre}</p>
                    <span>Q{Number(service.precio).toFixed(2)}</span>
                    {selected && <small>Seleccionado</small>}
                  </button>
                );
              })}
            </div>
            {selectedServices.length > 0 && (
              <div className="selected-services-summary">
                <strong>Servicios seleccionados:</strong> {selectedServices.map((service) => service.nombre).join(", ")}
                <span>Total estimado: Q{estimatedTotal.toFixed(2)}</span>
              </div>
            )}

            <label className="form-label d-block text-center subtitulo mt-4">Selecciona tu Barbero</label>
            {!loadingCatalog && barbers.length === 0 && <p className="catalog-status warn">No hay barberos disponibles. Revisa la conexion con la base de datos.</p>}
            <div className="barberos-grid">
              {barbers.map((item) => (
                <button type="button" className={`barbero-card ${Number(barberId) === Number(item.id) ? "selected" : ""}`} key={item.id} onClick={() => setBarberId(item.id)}>
                  <img src={Number(item.id) === 1 ? "/fotos/1.jpg" : "/fotos/2.jpg"} alt={item.nombre} />
                  <p>{item.nombre}</p>
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
                <h4>{selectedDate ? `Horarios para ${selectedDate.toLocaleDateString("es-GT")}` : "Selecciona un dia"}</h4>
                <div className="hours-grid">
                  {slots.map((slot) => {
                    const disabled = slot.disabled || isPastHour(selectedDate, slot.hora);
                    return (
                      <button type="button" disabled={disabled} title={slot.reason} className={`hour ${selectedHour === slot.hora ? "selected" : ""}`} key={slot.hora} onClick={() => setSelectedHour(slot.hora)}>
                        {slot.hora}
                        {slot.reason && <small>{slot.reason}</small>}
                      </button>
                    );
                  })}
                </div>
                {selectedDate && slots.length === 0 && <p className="text-warning mt-3">No hay horarios configurados para este dia.</p>}
              </div>
            </div>
            <div className="text-center mt-4 d-flex justify-content-center gap-3">
              <button type="button" className="btn-back" onClick={() => setStep(1)}>Regresar</button>
              <button type="button" className="btn-neon" onClick={continueToSummary}>Continuar</button>
            </div>
          </section>
        )}

        {step === 3 && selectedServices.length > 0 && selectedBarber && (
          <section>
            <h2 className="text-center mb-4"><i className="fa-solid fa-receipt" /> Resumen de tu Cita</h2>
            <div className="resumen-box">
              <p><strong>Nombre:</strong> {customer.nombre}</p>
              <p><strong>Apellido:</strong> {customer.apellido}</p>
              <p><strong>Telefono:</strong> {customer.telefono}</p>
              <p><strong>Barbero:</strong> {selectedBarber.nombre}</p>
              <p><strong>Servicios:</strong></p>
              <ul>
                {selectedServices.map((service) => (
                  <li key={service.id}>{service.nombre} - Q{Number(service.precio).toFixed(2)}</li>
                ))}
              </ul>
              <p><strong>Fecha y Hora:</strong> {toISODate(selectedDate)}, {selectedHour}</p>
              <p><strong>Total estimado:</strong> Q{estimatedTotal.toFixed(2)}</p>
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
            <h3>Tu cita fue enviada con exito</h3>
            <p>{saved.whatsapp === "Enviado" ? "La confirmacion de WhatsApp fue enviada." : "La cita quedo guardada; WhatsApp queda pendiente hasta configurar credenciales."}</p>
            <a href="/" className="btn-neon mt-3">Volver al Inicio</a>
          </div>
        </div>
      )}
    </main>
  );
}
