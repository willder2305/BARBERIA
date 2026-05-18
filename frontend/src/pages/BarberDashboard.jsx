import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReservationCalendar from "../components/ReservationCalendar.jsx";
import ReservationDetailModal from "../components/ReservationDetailModal.jsx";
import ReservationSidePanel from "../components/ReservationSidePanel.jsx";
import { getBarbers, getMe, getReservations, updateReservationStatus } from "../services/api.js";

// Renderiza el panel individual de cada barbero.
export default function BarberDashboard() {
  const navigate = useNavigate();
  const { usuario } = useParams();
  const [barberName, setBarberName] = useState("");
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Carga las reservas del barbero actual.
  async function loadReservations() {
    const data = await getReservations();
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
    const needsReason = status === "Cancelada";
    const motivo = needsReason ? window.prompt("Motivo de cancelacion") : "";
    if (needsReason && motivo === null) return;
    if (needsReason && !window.confirm("Confirmar cancelacion de la cita")) return;
    await updateReservationStatus(selectedReservation.id, status, motivo);
    setSelectedReservation(null);
    await loadReservations();
  }

  // Carga datos al montar el panel.
  useEffect(() => {
    async function loadBarberContext() {
      const user = await getMe();
      if (usuario && usuario.toLowerCase() !== String(user.usuario || "").toLowerCase()) {
        navigate(`/barberos/${user.usuario}`, { replace: true });
        return;
      }
      const rows = await getBarbers();
      const current = rows.find((barber) => Number(barber.id) === Number(user.id_barbero));
      setBarberName(current?.nombre || user.usuario || "Barbero");
      await loadReservations();
    }

    loadBarberContext().catch(console.error);
  }, [navigate, usuario]);

  return (
    <main className="dashboard-page">
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand mb-0 h1 text-success">{barberName || "Barbero"}</span>
        <button className="btn btn-outline-info" type="button" onClick={() => navigate("/reservas")}>+ Nueva Cita</button>
      </nav>
      <div className="container mt-4 text-center">
        <h2 className="text-luigi">Panel de {barberName || "Barbero"}</h2>
        <p>Visualiza y gestiona tus reservas</p>
        <ReservationCalendar reservations={reservations} selectedDate={selectedDate} onSelectDate={openDay} />
      </div>
      <ReservationSidePanel open={Boolean(selectedDate)} date={selectedDate} reservations={reservations} onClose={closePanel} onSelect={setSelectedReservation} />
      <ReservationDetailModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} onStatusChange={changeStatus} />
    </main>
  );
}
