// Devuelve el nombre visible del barbero segun su id.
function barberLabel(id) {
  return Number(id) === 1 ? "Luis" : "Douglas";
}

// Renderiza el panel lateral con reservas del dia seleccionado.
export default function ReservationSidePanel({ open, date, reservations, onClose, onSelect, showBarber }) {
  const reservationsForDay = reservations.filter((reservation) => reservation.fecha === date);

  return (
    <aside className={`side-panel ${open ? "open" : ""}`}>
      <div className="side-header">
        <h4>Reservas del Día</h4>
        <button type="button" className="btn btn-sm btn-outline-light" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="side-content">
        {reservationsForDay.length === 0 ? (
          <p className="text-light">No hay reservas para este día.</p>
        ) : (
          reservationsForDay.map((reservation) => (
            <button
              type="button"
              className="reserva-item text-start"
              key={reservation.id}
              onClick={() => onSelect(reservation)}
            >
              <p>
                <strong>
                  {reservation.nombre_cliente} {reservation.apellido_cliente}
                </strong>
              </p>
              <p>
                {reservation.hora} | {reservation.servicios}
              </p>
              {showBarber && <p>Barbero: {barberLabel(reservation.id_barbero)}</p>}
              <p>
                Estado: <span className="estado">{reservation.estado}</span>
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
