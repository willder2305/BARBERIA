import re
from datetime import datetime, time, timedelta

from flask import Blueprint, request
from pymysql.err import IntegrityError

from ..db import db_cursor
from ..responses import fail, ok
from ..security import ROLE_ADMIN, ROLE_BARBER, current_user, require_roles
from ..services.whatsapp import queue_confirmation_and_reminder

reservations_bp = Blueprint("reservations", __name__)

NO_SHOW_STATUS = "No asistió"
NO_SHOW_ALIASES = {"No asistio", "No asistió", "No asistiÃ³", "No asistiÃƒÂ³"}
VALID_STATUSES = {"Confirmada", "Atendida", "Cancelada", *NO_SHOW_ALIASES}


def clean(value):
    """Normaliza entradas recibidas desde formularios o JSON."""
    return str(value or "").strip()


def normalize_no_show(value):
    return NO_SHOW_STATUS if value in NO_SHOW_ALIASES else value


def db_no_show_status(cursor):
    cursor.execute(
        """
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'reservas'
          AND COLUMN_NAME = 'estado'
        """
    )
    row = cursor.fetchone()
    column_type = row["COLUMN_TYPE"] if row else ""
    values = [part.strip("'") for part in column_type.removeprefix("enum(").removesuffix(")").split(",")]
    for value in values:
        if value.startswith("No asisti"):
            return value
    return NO_SHOW_STATUS


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


def to_minutes(hour_sql):
    hour, minute, _ = [int(part) for part in parse_hour(hour_sql).split(":")]
    return hour * 60 + minute


def slot_range(start, end):
    current = datetime.strptime(str(start), "%H:%M:%S")
    finish = datetime.strptime(str(end), "%H:%M:%S")
    while current < finish:
        yield current.strftime("%H:%M:%S")
        current += timedelta(minutes=30)


def service_names(value):
    """Separa la cadena de servicios enviada por el frontend."""
    if isinstance(value, list):
        names = [clean(part) for part in value if clean(part)]
    else:
        names = [part.strip() for part in clean(value).split(",") if part.strip()]
    return list(dict.fromkeys(names))


def valid_phone(value):
    return bool(re.fullmatch(r"\d{8}", clean(value)))


def reservation_from_row(row):
    """Convierte una fila de MySQL al formato JSON usado por React."""
    history = row.get("no_show_history") or ""
    return {
        "id": int(row["id"]),
        "nombre_cliente": row["nombre_cliente"],
        "apellido_cliente": row.get("apellido_cliente") or "",
        "telefono": row["telefono"],
        "correo": row.get("correo") or "",
        "servicios": row["servicios"] or "",
        "total": float(row["total"] or 0),
        "fecha": str(row["fecha"]),
        "hora": format_hour(row["hora"]),
        "estado": normalize_no_show(row["estado"]),
        "id_barbero": int(row["id_barbero"]),
        "barbero": row.get("barbero") or "",
        "strikes": int(row.get("strikes") or 0),
        "no_show_history": [item for item in history.split("|") if item],
    }


def ensure_allowed_barber(barbero_id):
    user = current_user()
    if user["rol"] == ROLE_ADMIN:
        return True
    return int(user.get("id_barbero") or 0) == int(barbero_id or 0)


def validate_availability(cursor, barbero_id, fecha, hora_sql, services):
    cursor.execute(
        """
        SELECT id, nombre
        FROM barberos
        WHERE id = %s AND estado = 'Activo'
        """,
        (barbero_id,),
    )
    barber = cursor.fetchone()
    if not barber:
        return "Barbero inactivo o invalido."

    try:
        selected_date = datetime.strptime(fecha, "%Y-%m-%d").date()
    except ValueError:
        return "Fecha invalida."

    dia_semana = selected_date.weekday() + 1
    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM horarios_barbero
        WHERE id_barbero = %s
          AND dia_semana = %s
          AND activo = 1
          AND %s >= hora_inicio
          AND %s < hora_fin
        """,
        (barbero_id, dia_semana, hora_sql, hora_sql),
    )
    if not cursor.fetchone()["total"]:
        return "El horario seleccionado esta fuera del horario configurado."

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM dias_bloqueados
        WHERE fecha = %s AND (id_barbero IS NULL OR id_barbero = %s)
        """,
        (fecha, barbero_id),
    )
    if cursor.fetchone()["total"]:
        return "Ese dia esta bloqueado para reservas."

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM reservas
        WHERE id_barbero = %s AND fecha = %s AND hora = %s AND estado <> 'Cancelada'
        """,
        (barbero_id, fecha, hora_sql),
    )
    if cursor.fetchone()["total"]:
        return "Ese horario ya esta ocupado con este barbero."

    needs_gap = any(int(service.get("requiere_separacion") or 0) for service in services)
    if needs_gap:
        cursor.execute(
            """
            SELECT r.hora
            FROM reservas r
            INNER JOIN reserva_servicios rs ON rs.id_reserva = r.id
            INNER JOIN servicios s ON s.id = rs.id_servicio
            WHERE r.id_barbero = %s
              AND r.fecha = %s
              AND r.estado <> 'Cancelada'
              AND s.requiere_separacion = 1
            """,
            (barbero_id, fecha),
        )
        requested = to_minutes(hora_sql)
        for row in cursor.fetchall():
            if abs(requested - to_minutes(row["hora"])) < 60:
                return "Los servicios de skincare requieren una hora de separacion con otro skincare del mismo barbero."

    return None


@reservations_bp.get("")
@require_roles(ROLE_ADMIN, ROLE_BARBER)
def list_reservations():
    """Lista reservas para admin o solo las del barbero autenticado."""
    requested_barber_id = request.args.get("barbero_id", type=int) or 0
    user = current_user()
    barbero_id = requested_barber_id
    if user["rol"] == ROLE_BARBER:
        barbero_id = int(user.get("id_barbero") or 0)

    with db_cursor() as cursor:
        where = "WHERE r.id_barbero = %s" if barbero_id > 0 else ""
        params = (barbero_id,) if barbero_id > 0 else ()
        cursor.execute(
            f"""
            SELECT r.id, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente,
                   c.telefono, c.correo, b.nombre AS barbero,
                   GROUP_CONCAT(s.nombre ORDER BY rs.id SEPARATOR ', ') AS servicios,
                   r.total, r.fecha, r.hora, r.estado, r.id_barbero,
                   (
                     SELECT COUNT(*)
                     FROM reservas rx
                     INNER JOIN clientes cx ON cx.id = rx.id_cliente
                     WHERE cx.telefono = c.telefono AND LEFT(rx.estado, 9) = 'No asisti'
                   ) AS strikes,
                   (
                     SELECT GROUP_CONCAT(CONCAT(rx.fecha, ' ', TIME_FORMAT(rx.hora, '%%H:%%i')) ORDER BY rx.fecha DESC SEPARATOR '|')
                     FROM reservas rx
                     INNER JOIN clientes cx ON cx.id = rx.id_cliente
                     WHERE cx.telefono = c.telefono AND LEFT(rx.estado, 9) = 'No asisti'
                   ) AS no_show_history
            FROM reservas r
            INNER JOIN clientes c ON c.id = r.id_cliente
            INNER JOIN barberos b ON b.id = r.id_barbero
            LEFT JOIN reserva_servicios rs ON rs.id_reserva = r.id
            LEFT JOIN servicios s ON s.id = rs.id_servicio
            {where}
            GROUP BY r.id, c.nombre, c.apellido, c.telefono, c.correo, b.nombre,
                     r.total, r.fecha, r.hora, r.estado, r.id_barbero
            ORDER BY r.fecha, r.hora
            """,
            params,
        )
        rows = cursor.fetchall()
    return ok([reservation_from_row(row) for row in rows])


@reservations_bp.get("/availability")
def availability():
    """Devuelve todos los horarios del dia y marca los ocupados o bloqueados."""
    barbero_id = request.args.get("barbero_id", type=int)
    fecha = clean(request.args.get("fecha"))
    service_id = request.args.get("service_id", type=int)
    service_ids_raw = clean(request.args.get("service_ids"))
    if not barbero_id or not fecha:
        return fail("Barbero y fecha son obligatorios.")

    try:
        selected_date = datetime.strptime(fecha, "%Y-%m-%d").date()
    except ValueError:
        return fail("Fecha invalida.")

    dia_semana = selected_date.weekday() + 1
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM dias_bloqueados
            WHERE fecha = %s AND (id_barbero IS NULL OR id_barbero = %s)
            """,
            (fecha, barbero_id),
        )
        day_blocked = cursor.fetchone()["total"] > 0

        cursor.execute(
            """
            SELECT hora_inicio, hora_fin
            FROM horarios_barbero
            WHERE id_barbero = %s AND dia_semana = %s AND activo = 1
            ORDER BY hora_inicio
            """,
            (barbero_id, dia_semana),
        )
        schedules = cursor.fetchall()

        cursor.execute(
            """
            SELECT hora
            FROM reservas
            WHERE id_barbero = %s AND fecha = %s AND estado <> 'Cancelada'
            """,
            (barbero_id, fecha),
        )
        occupied = {str(row["hora"]) for row in cursor.fetchall()}

        skincare_hours = set()
        selected_requires_gap = False
        selected_ids = []
        if service_ids_raw:
            selected_ids = [int(part) for part in service_ids_raw.split(",") if part.strip().isdigit()]
        elif service_id:
            selected_ids = [service_id]
        if selected_ids:
            placeholders = ", ".join(["%s"] * len(selected_ids))
            cursor.execute(
                f"SELECT COUNT(*) AS total FROM servicios WHERE id IN ({placeholders}) AND requiere_separacion = 1",
                tuple(selected_ids),
            )
            selected_requires_gap = cursor.fetchone()["total"] > 0
        if selected_requires_gap:
            cursor.execute(
                """
                SELECT r.hora
                FROM reservas r
                INNER JOIN reserva_servicios rs ON rs.id_reserva = r.id
                INNER JOIN servicios s ON s.id = rs.id_servicio
                WHERE r.id_barbero = %s
                  AND r.fecha = %s
                  AND r.estado <> 'Cancelada'
                  AND s.requiere_separacion = 1
                """,
                (barbero_id, fecha),
            )
            skincare_hours = {str(row["hora"]) for row in cursor.fetchall()}

    slots = []
    for schedule in schedules:
        for hour_sql in slot_range(schedule["hora_inicio"], schedule["hora_fin"]):
            blocked_by_gap = any(abs(to_minutes(hour_sql) - to_minutes(hour)) < 60 for hour in skincare_hours)
            disabled = day_blocked or hour_sql in occupied or blocked_by_gap
            reason = ""
            if day_blocked:
                reason = "Dia bloqueado"
            elif hour_sql in occupied:
                reason = "Ocupado"
            elif blocked_by_gap:
                reason = "Separacion skincare"
            slots.append({"hora": format_hour(hour_sql), "hora_sql": hour_sql, "disabled": disabled, "reason": reason})

    return ok({"blocked": day_blocked, "slots": slots})


@reservations_bp.post("")
def create_reservation():
    """Crea una reserva nueva y evita duplicar horario con el mismo barbero."""
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    apellido = clean(data.get("apellido"))
    telefono = clean(data.get("telefono"))
    try:
        barbero_id = int(data.get("barbero_id") or 0)
    except (TypeError, ValueError):
        barbero_id = 0
    barbero = clean(data.get("barbero"))
    servicios = service_names(data.get("servicios"))
    fecha = clean(data.get("fecha"))
    hora = clean(data.get("hora"))
    hora_sql = parse_hour(hora)

    if not all([nombre, apellido, telefono, servicios, fecha, hora]):
        return fail("Nombre, apellido, telefono, servicio, fecha y hora son obligatorios.")
    if not valid_phone(telefono):
        return fail("El telefono debe tener exactamente 8 digitos numericos.")
    if not hora_sql:
        return fail("Hora invalida.")

    try:
        with db_cursor(commit=True) as cursor:
            if not barbero_id:
                cursor.execute("SELECT id FROM barberos WHERE nombre = %s AND estado = 'Activo'", (barbero,))
                barber_row = cursor.fetchone()
                barbero_id = barber_row["id"] if barber_row else None
            if not barbero_id:
                return fail("Barbero invalido.")
            if not barbero:
                cursor.execute("SELECT nombre FROM barberos WHERE id = %s", (barbero_id,))
                barber_name_row = cursor.fetchone()
                barbero = barber_name_row["nombre"] if barber_name_row else ""

            placeholders = ", ".join(["%s"] * len(servicios))
            cursor.execute(
                f"""
                SELECT id, nombre, precio, requiere_separacion
                FROM servicios
                WHERE nombre IN ({placeholders}) AND estado = 'Activo'
                """,
                tuple(servicios),
            )
            service_rows = cursor.fetchall()
            service_ids = {row["nombre"]: row for row in service_rows}
            missing = [name for name in servicios if name not in service_ids]
            if missing:
                return fail(f"Servicio invalido o inactivo: {', '.join(missing)}.")

            validation_error = validate_availability(cursor, barbero_id, fecha, hora_sql, service_rows)
            if validation_error:
                return fail(validation_error, 409)

            total = sum(float(row["precio"] or 0) for row in service_rows)

            cursor.execute(
                """
                SELECT id
                FROM clientes
                WHERE telefono = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (telefono,),
            )
            client = cursor.fetchone()
            if client:
                cliente_id = client["id"]
                cursor.execute("UPDATE clientes SET nombre = %s, apellido = %s WHERE id = %s", (nombre, apellido, cliente_id))
            else:
                cursor.execute(
                    """
                    INSERT INTO clientes (nombre, apellido, telefono, correo)
                    VALUES (%s, %s, %s, '')
                    """,
                    (nombre, apellido, telefono),
                )
                cliente_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO reservas (id_cliente, id_barbero, fecha, hora, total, estado, origen)
                VALUES (%s, %s, %s, %s, %s, 'Confirmada', %s)
                """,
                (cliente_id, barbero_id, fecha, hora_sql, total, clean(data.get("origen")) or "Cliente"),
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

            queue_status = queue_confirmation_and_reminder(
                cursor,
                reservation_id,
                {
                    "nombre": nombre,
                    "apellido": apellido,
                    "telefono": telefono,
                    "servicios": ", ".join(servicios),
                    "barbero": barbero,
                    "fecha": fecha,
                    "hora": format_hour(hora_sql),
                    "hora_sql": hora_sql,
                },
            )
    except IntegrityError:
        return fail("Ese horario ya esta ocupado con este barbero.", 409)
    except Exception:
        return fail("No se pudo guardar la reserva porque la base de datos no esta disponible.", 503)

    return ok(
        {
            "id": reservation_id,
            "message": "Reserva guardada con exito.",
            "whatsapp": queue_status,
        },
        201,
    )


@reservations_bp.patch("/<int:reservation_id>/status")
@require_roles(ROLE_ADMIN, ROLE_BARBER)
def update_reservation_status(reservation_id):
    """Actualiza el estado de una reserva existente con historial."""
    data = request.get_json(silent=True) or request.form
    status = normalize_no_show(clean(data.get("estado")))
    reason = clean(data.get("motivo"))
    user = current_user()

    if status not in VALID_STATUSES:
        return fail("Estado invalido.")

    with db_cursor(commit=True) as cursor:
        if status == NO_SHOW_STATUS:
            status = db_no_show_status(cursor)
        cursor.execute("SELECT estado, id_barbero FROM reservas WHERE id = %s", (reservation_id,))
        reservation = cursor.fetchone()
        if not reservation:
            return fail("Reserva no encontrada.", 404)
        if not ensure_allowed_barber(reservation["id_barbero"]):
            return fail("No puedes modificar citas de otro barbero.", 403)

        cursor.execute(
            """
            UPDATE reservas
            SET estado = %s,
                fecha_cancelacion = CASE WHEN %s = 'Cancelada' THEN NOW() ELSE fecha_cancelacion END,
                motivo_cancelacion = CASE WHEN %s = 'Cancelada' THEN %s ELSE motivo_cancelacion END,
                cambiado_por = %s,
                status_changed_by = %s,
                status_changed_at = NOW()
            WHERE id = %s
            """,
            (status, status, status, reason or None, user["id"], user["id"], reservation_id),
        )
        cursor.execute(
            """
            INSERT INTO historial_estados_reserva
                (id_reserva, estado_anterior, estado_nuevo, id_usuario, comentario)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (reservation_id, reservation["estado"], status, user["id"], reason or "Cambio de estado"),
        )

    return ok({"message": "Estado actualizado correctamente."})
