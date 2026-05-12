import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReservationCalendar from "../components/ReservationCalendar.jsx";
import ReservationDetailModal from "../components/ReservationDetailModal.jsx";
import ReservationSidePanel from "../components/ReservationSidePanel.jsx";
import { getReservations } from "../services/api.js";

// Renderiza el panel administrativo con todas las reservas.
export default function AdminDashboard() {
  const [barberId, setBarberId] = useState(0);
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Carga las reservas cada vez que cambia el filtro de barbero.
  async function loadReservations(currentBarberId = barberId) {
    const data = await getReservations(Number(currentBarberId));
    setReservations(data);
  }

  // Abre el panel lateral para el dia seleccionado.
  function openDay(date) {
    setSelectedDate(date);
  }

  // Cierra el panel lateral.
  function closePanel() {
    setSelectedDate("");
  }

  // Sincroniza el calendario al entrar o cambiar filtro.
  useEffect(() => {
    loadReservations(barberId).catch(console.error);
  }, [barberId]);

  return (
    <main className="dashboard-page">
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand mb-0 h1 text-warning">Administrador</span>
        <div className="toolbar-actions">
          <select className="form-select" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="0">Todos los Barberos</option>
            <option value="1">Luis</option>
            <option value="2">Douglas</option>
          </select>
          <Link className="btn btn-outline-light" to="/inventario">Inventario</Link>
          <Link className="btn btn-outline-success" to="/reportes">Reportes</Link>
        </div>
      </nav>
      <div className="container mt-4 text-center">
        <h2 className="text-luigi">Panel del Administrador</h2>
        <p>Visualiza todas las reservas registradas</p>
        <ReservationCalendar reservations={reservations} selectedDate={selectedDate} onSelectDate={openDay} />
      </div>
      <ReservationSidePanel open={Boolean(selectedDate)} date={selectedDate} reservations={reservations} onClose={closePanel} onSelect={setSelectedReservation} showBarber />
      <ReservationDetailModal reservation={selectedReservation} showBarber onClose={() => setSelectedReservation(null)} />
    </main>
  );
}
