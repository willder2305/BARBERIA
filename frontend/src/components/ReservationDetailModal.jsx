function barberLabel(id, explicitName) {
  if (explicitName) return explicitName;
  return Number(id) === 1 ? "Luis" : "Douglas";
}

export default function ReservationDetailModal({ reservation, showBarber, onClose, onStatusChange }) {
  if (!reservation) return null;

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card">
        <div className="modal-header-custom">
          <h5 className="text-info">
            <i className="fa-regular fa-calendar-check" /> Detalles de la Cita
          </h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} />
        </div>
        <div className="modal-body-custom">
          <p><strong>Cliente:</strong> {reservation.nombre_cliente} {reservation.apellido_cliente}</p>
          <p><strong>Telefono:</strong> {reservation.telefono}</p>
          <p><strong>Servicios:</strong> {reservation.servicios}</p>
          <p><strong>Hora:</strong> {reservation.hora}</p>
          <p><strong>Total:</strong> Q{Number(reservation.total).toFixed(2)}</p>
          {showBarber && <p><strong>Barbero:</strong> {barberLabel(reservation.id_barbero, reservation.barbero)}</p>}
          <p><strong>Estado:</strong> {reservation.estado}</p>
          <div className={`strike-box ${reservation.strikes > 0 ? "warn" : ""}`}>
            <strong>Strikes / no-shows:</strong> {reservation.strikes || 0}
            {reservation.strikes > 0 && <p>Cliente con faltas previas. El barbero decide si mantiene o cancela la cita.</p>}
            {reservation.no_show_history?.length > 0 && (
              <ul>
                {reservation.no_show_history.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </div>
        </div>
        <div className="modal-actions">
          {onStatusChange && (
            <>
              <button type="button" className="btn btn-success" onClick={() => onStatusChange("Atendida")}>Atendida</button>
              <button type="button" className="btn btn-danger" onClick={() => onStatusChange("No asistio")}>No asistio</button>
              <button type="button" className="btn btn-outline-warning" onClick={() => onStatusChange("Cancelada")}>Cancelar cita</button>
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
