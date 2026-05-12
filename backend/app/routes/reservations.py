from datetime import time, timedelta

from flask import Blueprint, request

from ..db import db_cursor
from ..responses import fail, ok

reservations_bp = Blueprint("reservations", __name__)

BARBERS = {"Luis": 1, "Douglas": 2}
VALID_STATUSES = {"Confirmada", "Atendida", "Cancelada", "No asistió"}


def clean(value):
    """Normaliza entradas recibidas desde formularios o JSON."""
    return str(value or "").strip()


def parse_hour(value):
    """Convierte etiquetas del frontend a formato TIME de MySQL."""
    raw = clean(value).upper()
    if not raw:
        return None

    try:
        if raw.endswith(" AM") or raw.endswith(" PM"):
            hour_part, ampm = raw.split(" ")
            hour, minute = [int(part) for part in hour_part.split(":")]
            if ampm == "PM" and hour != 12:
                hour += 12
            if ampm == "AM" and hour == 12:
                hour = 0
            return f"{hour:02d}:{minute:02d}:00"

        parts = [int(part) for part in raw.split(":")]
        if len(parts) == 2:
            return f"{parts[0]:02d}:{parts[1]:02d}:00"
        if len(parts) == 3:
            return f"{parts[0]:02d}:{parts[1]:02d}:{parts[2]:02d}"
    except ValueError:
        return None

    return None


def format_hour(value):
    """Convierte TIME de MySQL a la etiqueta que React compara en horarios."""
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hour = total_seconds // 3600
        minute = (total_seconds % 3600) // 60
    elif isinstance(value, time):
        hour = value.hour
        minute = value.minute
    else:
        parsed = parse_hour(value)
        if not parsed:
            return clean(value)
        hour, minute, _ = [int(part) for part in parsed.split(":")]

    suffix = "AM" if hour < 12 else "PM"
    hour_12 = hour % 12 or 12
    return f"{hour_12}:{minute:02d} {suffix}"


def service_names(value):
    """Separa la cadena de servicios enviada por el frontend."""
    return [part.strip() for part in clean(value).split(",") if part.strip()]


def reservation_from_row(row):
    """Convierte una fila de MySQL al formato JSON usado por React."""
    return {
        "id": int(row["id"]),
        "nombre_cliente": row["nombre_cliente"],
        "apellido_cliente": row["apellido_cliente"],
        "telefono": row["telefono"],
        "correo": row["correo"],
        "servicios": row["servicios"] or "",
        "total": float(row["total"] or 0),
        "fecha": str(row["fecha"]),
        "hora": format_hour(row["hora"]),
        "estado": row["estado"],
        "id_barbero": int(row["id_barbero"]),
    }


@reservations_bp.get("")
def list_reservations():
    """Lista reservas, opcionalmente filtradas por id de barbero."""
    barbero_id = request.args.get("barbero_id", type=int) or 0

    with db_cursor() as cursor:
        if barbero_id > 0:
            cursor.execute(
                """
                SELECT r.id, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente,
                       c.telefono, c.correo,
                       GROUP_CONCAT(s.nombre ORDER BY rs.id SEPARATOR ', ') AS servicios,
                       r.total, r.fecha, r.hora, r.estado, r.id_barbero
                FROM reservas r
                INNER JOIN clientes c ON c.id = r.id_cliente
                LEFT JOIN reserva_servicios rs ON rs.id_reserva = r.id
                LEFT JOIN servicios s ON s.id = rs.id_servicio
                WHERE r.id_barbero = %s
                GROUP BY r.id, c.nombre, c.apellido, c.telefono, c.correo,
                         r.total, r.fecha, r.hora, r.estado, r.id_barbero
                ORDER BY r.fecha, r.hora
                """,
                (barbero_id,),
            )
        else:
            cursor.execute(
                """
                SELECT r.id, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente,
                       c.telefono, c.correo,
                       GROUP_CONCAT(s.nombre ORDER BY rs.id SEPARATOR ', ') AS servicios,
                       r.total, r.fecha, r.hora, r.estado, r.id_barbero
                FROM reservas r
                INNER JOIN clientes c ON c.id = r.id_cliente
                LEFT JOIN reserva_servicios rs ON rs.id_reserva = r.id
                LEFT JOIN servicios s ON s.id = rs.id_servicio
                GROUP BY r.id, c.nombre, c.apellido, c.telefono, c.correo,
                         r.total, r.fecha, r.hora, r.estado, r.id_barbero
                ORDER BY r.fecha, r.hora
                """
            )
        rows = cursor.fetchall()

    return ok([reservation_from_row(row) for row in rows])


@reservations_bp.post("")
def create_reservation():
    """Crea una reserva nueva y evita duplicar horario con el mismo barbero."""
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    apellido = clean(data.get("apellido"))
    telefono = clean(data.get("telefono"))
    correo = clean(data.get("correo"))
    barbero = clean(data.get("barbero"))
    servicios = service_names(data.get("servicios"))
    fecha = clean(data.get("fecha"))
    hora = clean(data.get("hora"))
    hora_sql = parse_hour(hora)
    barbero_id = BARBERS.get(barbero)

    if not all([nombre, apellido, telefono, correo, barbero, servicios, fecha, hora]):
        return fail("Faltan datos obligatorios.")
    if not barbero_id:
        return fail("Barbero invalido.")
    if not hora_sql:
        return fail("Hora invalida.")

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM reservas
                WHERE id_barbero = %s AND fecha = %s AND hora = %s
                """,
                (barbero_id, fecha, hora_sql),
            )
            exists = cursor.fetchone()["total"]
            if exists:
                return fail("Ese horario ya esta ocupado con este barbero.", 409)

            cursor.execute(
                """
                SELECT id, nombre, precio
                FROM servicios
                WHERE nombre IN %s AND estado = 'Activo'
                """,
                (servicios,),
            )
            service_rows = cursor.fetchall()
            service_ids = {row["nombre"]: row for row in service_rows}
            missing = [name for name in servicios if name not in service_ids]
            if missing:
                return fail(f"Servicio invalido: {', '.join(missing)}.")
            total = sum(float(row["precio"] or 0) for row in service_rows)

            cursor.execute(
                """
                INSERT INTO clientes (nombre, apellido, telefono, correo)
                VALUES (%s, %s, %s, %s)
                """,
                (nombre, apellido, telefono, correo),
            )
            cliente_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO reservas (id_cliente, id_barbero, fecha, hora, total, estado)
                VALUES (%s, %s, %s, %s, %s, 'Confirmada')
                """,
                (cliente_id, barbero_id, fecha, hora_sql, total),
            )
            reservation_id = cursor.lastrowid

            for service_name in servicios:
                service = service_ids[service_name]
                cursor.execute(
                    """
                    INSERT INTO reserva_servicios (id_reserva, id_servicio, precio_servicio)
                    VALUES (%s, %s, %s)
                    """,
                    (reservation_id, service["id"], service["precio"]),
                )
    except Exception:
        return fail("No se pudo guardar la reserva porque la base de datos no esta disponible.", 503)

    return ok({"id": reservation_id, "message": "Reserva guardada con exito."}, 201)


@reservations_bp.patch("/<int:reservation_id>/status")
def update_reservation_status(reservation_id):
    """Actualiza el estado de una reserva existente."""
    data = request.get_json(silent=True) or request.form
    status = clean(data.get("estado"))

    if status not in VALID_STATUSES:
        return fail("Estado invalido.")

    with db_cursor(commit=True) as cursor:
        cursor.execute("SELECT estado FROM reservas WHERE id = %s", (reservation_id,))
        reservation = cursor.fetchone()
        if not reservation:
            return fail("Reserva no encontrada.", 404)

        cursor.execute(
            """
            UPDATE reservas
            SET estado = %s,
                fecha_cancelacion = CASE WHEN %s = 'Cancelada' THEN NOW() ELSE fecha_cancelacion END
            WHERE id = %s
            """,
            (status, status, reservation_id),
        )
        if cursor.rowcount == 0:
            return fail("Reserva no encontrada.", 404)

        cursor.execute(
            """
            INSERT INTO historial_estados_reserva
                (id_reserva, estado_anterior, estado_nuevo, id_usuario, comentario)
            VALUES (%s, %s, %s, NULL, 'Cambio desde panel de barbero')
            """,
            (reservation_id, reservation["estado"], status),
        )

    return ok({"message": "Estado actualizado correctamente."})
