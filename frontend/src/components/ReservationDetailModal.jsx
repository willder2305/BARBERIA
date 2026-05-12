// Devuelve el nombre del barbero para mostrarlo en el modal.
function barberLabel(id) {
  return Number(id) === 1 ? "Luis" : "Douglas";
}

// Muestra los detalles de una reserva seleccionada y acciones opcionales.
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
          <p>
            <strong>Cliente:</strong> {reservation.nombre_cliente} {reservation.apellido_cliente}
          </p>
          <p>
            <strong>Servicio:</strong> {reservation.servicios}
          </p>
          <p>
            <strong>Hora:</strong> {reservation.hora}
          </p>
          <p>
            <strong>Total:</strong> Q{Number(reservation.total).toFixed(2)}
          </p>
          {showBarber && (
            <p>
              <strong>Barbero:</strong> {barberLabel(reservation.id_barbero)}
            </p>
          )}
          <p>
            <strong>Estado:</strong> {reservation.estado}
          </p>
        </div>
        <div className="modal-actions">
          {onStatusChange && (
            <>
              <button type="button" className="btn btn-success" onClick={() => onStatusChange("Atendida")}>
                Atendida
              </button>
              <button type="button" className="btn btn-danger" onClick={() => onStatusChange("No asistió")}>
                No asistió
              </button>
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
