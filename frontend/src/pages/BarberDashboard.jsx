import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReservationCalendar from "../components/ReservationCalendar.jsx";
import ReservationDetailModal from "../components/ReservationDetailModal.jsx";
import ReservationSidePanel from "../components/ReservationSidePanel.jsx";
import { BARBERS } from "../constants.js";
import { getReservations, updateReservationStatus } from "../services/api.js";

// Obtiene el id de barbero a partir del nombre.
function barberIdFromName(name) {
  return BARBERS.find((barber) => barber.name === name)?.id || 0;
}

// Renderiza el panel individual de cada barbero.
export default function BarberDashboard({ barberName }) {
  const navigate = useNavigate();
  const barberId = barberIdFromName(barberName);
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Carga las reservas del barbero actual.
  async function loadReservations() {
    const data = await getReservations(barberId);
    setReservations(data);
  }

  // Abre el panel del dia seleccionado.
  function openDay(date) {
    setSelectedDate(date);
  }

  // Cierra el panel lateral del calendario.
  function closePanel() {
    setSelectedDate("");
  }

  // Cambia el estado de una reserva y refresca el panel.
  async function changeStatus(status) {
    if (!selectedReservation) return;
    await updateReservationStatus(selectedReservation.id, status);
    setSelectedReservation(null);
    await loadReservations();
  }

  // Carga datos al montar el panel.
  useEffect(() => {
    loadReservations().catch(console.error);
  }, [barberId]);

  return (
    <main className="dashboard-page">
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand mb-0 h1 text-success">{barberName}</span>
        <button className="btn btn-outline-info" type="button" onClick={() => navigate("/reservas")}>+ Nueva Cita</button>
      </nav>
      <div className="container mt-4 text-center">
        <h2 className="text-luigi">Panel de {barberName}</h2>
        <p>Visualiza y gestiona tus reservas</p>
        <ReservationCalendar reservations={reservations} selectedDate={selectedDate} onSelectDate={openDay} />
      </div>
      <ReservationSidePanel open={Boolean(selectedDate)} date={selectedDate} reservations={reservations} onClose={closePanel} onSelect={setSelectedReservation} />
      <ReservationDetailModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} onStatusChange={changeStatus} />
    </main>
  );
}
