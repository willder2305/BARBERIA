import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton.jsx";
import ReservationCalendar from "../components/ReservationCalendar.jsx";
import ReservationDetailModal from "../components/ReservationDetailModal.jsx";
import ReservationSidePanel from "../components/ReservationSidePanel.jsx";
import { getBarbers, getReportSummary, getReservations, updateReservationStatus } from "../services/api.js";

// Renderiza el panel administrativo con todas las reservas.
export default function AdminDashboard() {
  const [barberId, setBarberId] = useState(0);
  const [barbers, setBarbers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Carga las reservas cada vez que cambia el filtro de barbero.
  async function loadReservations(currentBarberId = barberId) {
    const data = await getReservations(Number(currentBarberId));
    setReservations(data);
    setSummary(await getReportSummary());
  }

  // Abre el panel lateral para el dia seleccionado.
  function openDay(date) {
    setSelectedDate(date);
  }

  // Cierra el panel lateral.
  function closePanel() {
    setSelectedDate("");
  }

  async function changeStatus(status) {
    if (!selectedReservation) return;
    const needsReason = status === "Cancelada";
    const motivo = needsReason ? window.prompt("Motivo de cancelacion") : "";
    if (needsReason && motivo === null) return;
    if (needsReason && !window.confirm("Confirmar cancelacion de la cita")) return;
    await updateReservationStatus(selectedReservation.id, status, motivo);
    setSelectedReservation(null);
    await loadReservations(barberId);
  }

  // Sincroniza el calendario al entrar o cambiar filtro.
  useEffect(() => {
    loadReservations(barberId).catch(console.error);
  }, [barberId]);

  useEffect(() => {
    getBarbers(true).then(setBarbers).catch(console.error);
  }, []);

  return (
    <main className="dashboard-page">
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand mb-0 h1 text-warning">Administrador</span>
        <div className="toolbar-actions">
          <select className="form-select" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="0">Todos los Barberos</option>
            {barbers.map((barber) => (
              <option value={barber.id} key={barber.id}>{barber.nombre}</option>
            ))}
          </select>
          <Link className="btn btn-outline-light" to="/inventario">Inventario</Link>
          <Link className="btn btn-outline-success" to="/reportes">Reportes</Link>
          <Link className="btn btn-outline-info" to="/admin/gestion">Gestion</Link>
          <LogoutButton />
        </div>
      </nav>
      <div className="container mt-4 text-center">
        <h2 className="text-luigi">Panel del Administrador</h2>
        <p>Visualiza todas las reservas registradas</p>
        {summary && (
          <section className="dashboard-summary">
            <article><span>Reservas</span><strong>{summary.totalReservas}</strong></article>
            <article><span>Confirmadas</span><strong>{summary.reservasConfirmadas}</strong></article>
            <article><span>Atendidas</span><strong>{summary.reservasCompletadas}</strong></article>
            <article><span>No-shows</span><strong>{summary.reservasNoShow}</strong></article>
            <article><span>Ingreso est.</span><strong>Q{Number(summary.ingresosTotales).toFixed(2)}</strong></article>
          </section>
        )}
        <ReservationCalendar reservations={reservations} selectedDate={selectedDate} onSelectDate={openDay} />
      </div>
      <ReservationSidePanel open={Boolean(selectedDate)} date={selectedDate} reservations={reservations} onClose={closePanel} onSelect={setSelectedReservation} showBarber />
      <ReservationDetailModal reservation={selectedReservation} showBarber onClose={() => setSelectedReservation(null)} onStatusChange={changeStatus} />
    </main>
  );
}
