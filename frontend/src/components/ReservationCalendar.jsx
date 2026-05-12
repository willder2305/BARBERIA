// Convierte un objeto Date a YYYY-MM-DD en hora local.
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Obtiene la cantidad de reservas de un dia especifico.
function countByDate(reservations, isoDate) {
  return reservations.filter((reservation) => reservation.fecha === isoDate).length;
}

// Renderiza un calendario mensual ligero para los paneles administrativos.
export default function ReservationCalendar({ reservations, selectedDate, onSelectDate }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const blanks = Array.from({ length: firstDay.getDay() });
  const days = Array.from({ length: lastDay.getDate() }, (_, index) => index + 1);
  const monthName = today.toLocaleDateString("es-GT", { month: "long", year: "numeric" });

  return (
    <section id="calendar" className="simple-calendar">
      <h3 className="calendar-title">{monthName}</h3>
      <div className="weekdays">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid-admin">
        {blanks.map((_, index) => (
          <span className="calendar-empty" key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const date = new Date(year, month, day);
          const isoDate = toISODate(date);
          const count = countByDate(reservations, isoDate);
          return (
            <button
              type="button"
              className={`calendar-day-admin ${selectedDate === isoDate ? "selected" : ""}`}
              key={isoDate}
              onClick={() => onSelectDate(isoDate)}
            >
              <span>{day}</span>
              {count > 0 && <small>{count} cita(s)</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
