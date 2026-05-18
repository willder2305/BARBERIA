from flask import Blueprint, request
from pymysql.err import IntegrityError
from werkzeug.security import generate_password_hash

from ..db import db_cursor
from ..responses import fail, ok
from ..security import ROLE_ADMIN, require_roles

catalog_bp = Blueprint("catalog", __name__)


def clean(value):
    return str(value or "").strip()


def parse_bool(value):
    return 1 if value in {True, 1, "1", "true", "True", "on", "Activo"} else 0


def parse_time(value):
    raw = clean(value)
    if not raw:
        return None
    parts = raw.split(":")
    if len(parts) < 2:
        return None
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return None
    if hour < 0 or hour > 23 or minute not in {0, 30}:
        return None
    return f"{hour:02d}:{minute:02d}:00"


def minutes(value):
    hour, minute, _ = [int(part) for part in parse_time(value).split(":")]
    return hour * 60 + minute


def validate_schedule_rows(rows):
    normalized = []
    for row in rows:
        day = int(row.get("dia_semana") or 0)
        start = parse_time(row.get("hora_inicio"))
        end = parse_time(row.get("hora_fin"))
        active = parse_bool(row.get("activo"))
        if day < 1 or day > 7:
            return None, "Dia invalido."
        if not start or not end:
            return None, "Las horas deben estar en formato HH:MM y en bloques de 30 minutos."
        if minutes(start) >= minutes(end):
            return None, "La hora de inicio debe ser menor que la hora fin."
        normalized.append({"dia_semana": day, "hora_inicio": start, "hora_fin": end, "activo": active})

    for day in range(1, 8):
        ranges = sorted(
            [(minutes(row["hora_inicio"]), minutes(row["hora_fin"])) for row in normalized if row["dia_semana"] == day and row["activo"]],
        )
        for index in range(1, len(ranges)):
            if ranges[index][0] < ranges[index - 1][1]:
                return None, "Hay horarios solapados en el mismo dia."
    return normalized, None


@catalog_bp.get("/barbers")
def list_barbers():
    """Lista barberos activos para reserva y todos para admin."""
    include_inactive = request.args.get("include_inactive") == "1"
    where = "" if include_inactive else "WHERE b.estado = 'Activo'"
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT b.id, b.nombre, b.telefono, b.estado, u.usuario
            FROM barberos b
            LEFT JOIN usuarios u ON u.id_barbero = b.id AND u.rol = 'Barbero'
            {where}
            ORDER BY b.nombre
            """
        )
        rows = cursor.fetchall()
    return ok(rows)


@catalog_bp.post("/barbers")
@require_roles(ROLE_ADMIN)
def create_barber():
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    telefono = clean(data.get("telefono"))
    usuario = clean(data.get("usuario")).lower()
    password = clean(data.get("password"))
    if not nombre or not usuario or not password:
        return fail("Nombre, usuario y contrasena son obligatorios.")
    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute("SELECT id FROM usuarios WHERE usuario = %s LIMIT 1", (usuario,))
            if cursor.fetchone():
                return fail("Ya existe un usuario con ese nombre.", 409)
            cursor.execute("SELECT id FROM barberos WHERE nombre = %s LIMIT 1", (nombre,))
            if cursor.fetchone():
                return fail("Ya existe un barbero con ese nombre.", 409)
            cursor.execute(
                "INSERT INTO barberos (nombre, telefono, estado) VALUES (%s, %s, 'Activo')",
                (nombre, telefono or None),
            )
            barber_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO usuarios (nombre, usuario, pass_hash, rol, id_barbero, estado)
                VALUES (%s, %s, %s, 'Barbero', %s, 'Activo')
                """,
                (nombre, usuario, generate_password_hash(password), barber_id),
            )
    except IntegrityError:
        return fail("No se pudo crear: el barbero o usuario ya existe.", 409)
    return ok({"id": barber_id, "message": "Barbero creado."}, 201)


@catalog_bp.put("/barbers/<int:barber_id>")
@require_roles(ROLE_ADMIN)
def update_barber(barber_id):
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    telefono = clean(data.get("telefono"))
    estado = clean(data.get("estado")) or "Activo"
    usuario = clean(data.get("usuario")).lower()
    password = clean(data.get("password"))
    if estado not in {"Activo", "Inactivo"}:
        return fail("Estado invalido.")
    if not nombre:
        return fail("El nombre es obligatorio.")
    try:
        with db_cursor(commit=True) as cursor:
            if usuario:
                cursor.execute(
                    """
                    SELECT id
                    FROM usuarios
                    WHERE usuario = %s AND NOT (id_barbero = %s AND rol = 'Barbero')
                    LIMIT 1
                    """,
                    (usuario, barber_id),
                )
                if cursor.fetchone():
                    return fail("Ya existe un usuario con ese nombre.", 409)

            cursor.execute(
                "UPDATE barberos SET nombre = %s, telefono = %s, estado = %s WHERE id = %s",
                (nombre, telefono or None, estado, barber_id),
            )
            if cursor.rowcount == 0:
                return fail("Barbero no encontrado.", 404)

            updates = ["nombre = %s", "estado = %s"]
            params = [nombre, estado]
            if usuario:
                updates.append("usuario = %s")
                params.append(usuario)
            if password:
                updates.append("pass_hash = %s")
                params.append(generate_password_hash(password))
            params.append(barber_id)
            cursor.execute(
                f"UPDATE usuarios SET {', '.join(updates)} WHERE id_barbero = %s AND rol = 'Barbero'",
                params,
            )
            if cursor.rowcount == 0 and usuario and password:
                cursor.execute(
                    """
                    INSERT INTO usuarios (nombre, usuario, pass_hash, rol, id_barbero, estado)
                    VALUES (%s, %s, %s, 'Barbero', %s, %s)
                    """,
                    (nombre, usuario, generate_password_hash(password), barber_id, estado),
                )
    except IntegrityError:
        return fail("No se pudo actualizar: el barbero o usuario ya existe.", 409)
    return ok({"message": "Barbero actualizado."})


@catalog_bp.get("/services")
def list_services():
    include_inactive = request.args.get("include_inactive") == "1"
    where = "" if include_inactive else "WHERE estado = 'Activo'"
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT id, nombre, precio, duracion_minutos, requiere_separacion,
                   minutos_separacion, estado, descripcion
            FROM servicios
            {where}
            ORDER BY nombre
            """
        )
        rows = cursor.fetchall()
    return ok(rows)


@catalog_bp.post("/services")
@require_roles(ROLE_ADMIN)
def create_service():
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    precio = float(data.get("precio") or 0)
    descripcion = clean(data.get("descripcion"))
    requires_gap = 1 if data.get("requiere_separacion") else 0
    if not nombre or precio < 0:
        return fail("Nombre y precio valido son obligatorios.")
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            INSERT INTO servicios
                (nombre, precio, duracion_minutos, requiere_separacion, minutos_separacion, estado, descripcion)
            VALUES (%s, %s, 30, %s, %s, 'Activo', %s)
            """,
            (nombre, precio, requires_gap, 60 if requires_gap else 0, descripcion or None),
        )
    return ok({"message": "Servicio creado."}, 201)


@catalog_bp.put("/services/<int:service_id>")
@require_roles(ROLE_ADMIN)
def update_service(service_id):
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    precio = float(data.get("precio") or 0)
    estado = clean(data.get("estado")) or "Activo"
    descripcion = clean(data.get("descripcion"))
    requires_gap = 1 if data.get("requiere_separacion") else 0
    if estado not in {"Activo", "Inactivo"}:
        return fail("Estado invalido.")
    if not nombre or precio < 0:
        return fail("Nombre y precio valido son obligatorios.")
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE servicios
            SET nombre = %s, precio = %s, estado = %s, descripcion = %s,
                requiere_separacion = %s, minutos_separacion = %s
            WHERE id = %s
            """,
            (nombre, precio, estado, descripcion or None, requires_gap, 60 if requires_gap else 0, service_id),
        )
        if cursor.rowcount == 0:
            return fail("Servicio no encontrado.", 404)
    return ok({"message": "Servicio actualizado."})


@catalog_bp.get("/clients")
@require_roles(ROLE_ADMIN)
def list_clients():
    search = clean(request.args.get("q"))
    params = []
    where = ""
    if search:
        where = "WHERE c.nombre LIKE %s OR c.apellido LIKE %s OR c.telefono LIKE %s"
        params = [f"%{search}%", f"%{search}%", f"%{search}%"]
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT c.id, c.nombre, c.apellido, c.telefono, c.estado,
                   COUNT(r.id) AS total_citas,
                   SUM(CASE WHEN r.estado IN ('No asistio', 'No asistió', 'No asistiÃ³') THEN 1 ELSE 0 END) AS strikes
            FROM clientes c
            LEFT JOIN reservas r ON r.id_cliente = c.id
            {where}
            GROUP BY c.id, c.nombre, c.apellido, c.telefono, c.estado
            ORDER BY c.nombre
            """,
            params,
        )
        rows = cursor.fetchall()
    return ok(rows)


@catalog_bp.get("/clients/<int:client_id>/reservations")
@require_roles(ROLE_ADMIN)
def list_client_reservations(client_id):
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT r.id, r.fecha, TIME_FORMAT(r.hora, '%%H:%%i') AS hora,
                   b.nombre AS barbero,
                   GROUP_CONCAT(s.nombre ORDER BY rs.id SEPARATOR ', ') AS servicios,
                   CASE
                     WHEN r.estado IN ('No asistio', 'No asistió', 'No asistiÃ³', 'No asistiÃƒÂ³') THEN 'No asistio'
                     ELSE r.estado
                   END AS estado,
                   r.total
            FROM reservas r
            INNER JOIN barberos b ON b.id = r.id_barbero
            LEFT JOIN reserva_servicios rs ON rs.id_reserva = r.id
            LEFT JOIN servicios s ON s.id = rs.id_servicio
            WHERE r.id_cliente = %s
            GROUP BY r.id, r.fecha, r.hora, b.nombre, r.estado, r.total
            ORDER BY r.fecha DESC, r.hora DESC
            """,
            (client_id,),
        )
        rows = cursor.fetchall()
    return ok([{**row, "fecha": str(row["fecha"])} for row in rows])


@catalog_bp.get("/settings")
def list_settings():
    with db_cursor() as cursor:
        cursor.execute("SELECT clave, valor, descripcion FROM configuracion_sistema ORDER BY clave")
        rows = cursor.fetchall()
    return ok(rows)


@catalog_bp.put("/settings")
@require_roles(ROLE_ADMIN)
def update_settings():
    data = request.get_json(silent=True) or {}
    allowed = {
        "facebook_followers": "Contador de seguidores de Facebook",
        "instagram_followers": "Contador de seguidores de Instagram",
        "tiktok_followers": "Contador de seguidores de TikTok",
        "telefono_barberia": "Telefono principal de la barberia",
        "horario_general": "Horario general usado para agenda de barberos",
        "recordatorio_horas_antes": "Horas antes para recordatorio por WhatsApp",
    }
    with db_cursor(commit=True) as cursor:
        for key, value in data.items():
            if key not in allowed:
                continue
            cursor.execute(
                """
                INSERT INTO configuracion_sistema (clave, valor, descripcion)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion)
                """,
                (key, clean(value), allowed[key]),
            )
    return ok({"message": "Configuracion actualizada."})


@catalog_bp.get("/blocked-days")
@require_roles(ROLE_ADMIN)
def list_blocked_days():
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT d.id, d.id_barbero, b.nombre AS barbero, d.fecha, d.motivo
            FROM dias_bloqueados d
            LEFT JOIN barberos b ON b.id = d.id_barbero
            ORDER BY d.fecha DESC
            """
        )
        rows = cursor.fetchall()
    return ok(rows)


@catalog_bp.post("/blocked-days")
@require_roles(ROLE_ADMIN)
def create_blocked_day():
    from ..security import current_user

    data = request.get_json(silent=True) or request.form
    fecha = clean(data.get("fecha"))
    motivo = clean(data.get("motivo"))
    id_barbero = data.get("id_barbero") or None
    if id_barbero in {"", "0", 0}:
        id_barbero = None
    if not fecha:
        return fail("La fecha es obligatoria.")
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            SELECT id
            FROM dias_bloqueados
            WHERE fecha = %s AND ((id_barbero IS NULL AND %s IS NULL) OR id_barbero = %s)
            LIMIT 1
            """,
            (fecha, id_barbero, id_barbero),
        )
        if cursor.fetchone():
            return fail("Ese dia ya esta bloqueado para ese alcance.", 409)
        cursor.execute(
            """
            INSERT INTO dias_bloqueados (id_barbero, fecha, motivo, creado_por)
            VALUES (%s, %s, %s, %s)
            """,
            (id_barbero, fecha, motivo or None, current_user()["id"]),
        )
    return ok({"message": "Dia bloqueado."}, 201)


@catalog_bp.delete("/blocked-days/<int:block_id>")
@require_roles(ROLE_ADMIN)
def delete_blocked_day(block_id):
    with db_cursor(commit=True) as cursor:
        cursor.execute("DELETE FROM dias_bloqueados WHERE id = %s", (block_id,))
        if cursor.rowcount == 0:
            return fail("Bloqueo no encontrado.", 404)
    return ok({"message": "Bloqueo eliminado."})


@catalog_bp.get("/schedules")
@require_roles(ROLE_ADMIN)
def list_schedules():
    barber_id = request.args.get("barbero_id", type=int)
    params = []
    where = ""
    if barber_id:
        where = "WHERE b.id = %s"
        params.append(barber_id)
    with db_cursor() as cursor:
        query = f"""
            SELECT hb.id, hb.id_barbero, b.nombre AS barbero, hb.dia_semana,
                   TIME_FORMAT(hb.hora_inicio, '%%H:%%i') AS hora_inicio,
                   TIME_FORMAT(hb.hora_fin, '%%H:%%i') AS hora_fin,
                   hb.activo
            FROM horarios_barbero hb
            INNER JOIN barberos b ON b.id = hb.id_barbero
            {where}
            ORDER BY b.nombre, hb.dia_semana, hb.hora_inicio
            """
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        rows = cursor.fetchall()
    return ok(rows)


@catalog_bp.put("/schedules")
@require_roles(ROLE_ADMIN)
def update_schedules():
    data = request.get_json(silent=True) or {}
    barber_id = int(data.get("barbero_id") or 0)
    apply_all = bool(data.get("apply_all"))
    rows = data.get("schedules") or []
    if not rows:
        return fail("Debe enviar al menos una franja horaria.")

    normalized, validation_error = validate_schedule_rows(rows)
    if validation_error:
        return fail(validation_error)

    with db_cursor(commit=True) as cursor:
        if apply_all:
            cursor.execute("SELECT id FROM barberos")
            barber_ids = [row["id"] for row in cursor.fetchall()]
        else:
            if not barber_id:
                return fail("Debe seleccionar un barbero.")
            cursor.execute("SELECT id FROM barberos WHERE id = %s", (barber_id,))
            if not cursor.fetchone():
                return fail("Barbero no encontrado.", 404)
            barber_ids = [barber_id]

        for current_barber_id in barber_ids:
            cursor.execute("DELETE FROM horarios_barbero WHERE id_barbero = %s", (current_barber_id,))
            for row in normalized:
                cursor.execute(
                    """
                    INSERT INTO horarios_barbero
                        (id_barbero, dia_semana, hora_inicio, hora_fin, activo)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (current_barber_id, row["dia_semana"], row["hora_inicio"], row["hora_fin"], row["activo"]),
                )

    return ok({"message": "Horarios actualizados."})
