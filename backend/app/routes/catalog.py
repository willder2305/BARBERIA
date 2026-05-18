import uuid
from pathlib import Path

from flask import Blueprint, request, send_from_directory
from pymysql.err import IntegrityError
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

from ..db import db_cursor
from ..responses import fail, ok
from ..security import ROLE_ADMIN, require_roles

catalog_bp = Blueprint("catalog", __name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
GALLERY_UPLOAD_DIR = BACKEND_ROOT / "uploads" / "gallery"
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DEFAULT_SETTINGS = {
    "facebook_followers": ("150", "Contador de seguidores de Facebook"),
    "instagram_followers": ("300", "Contador de seguidores de Instagram"),
    "whatsapp_followers": ("58", "Contador de contactos de WhatsApp"),
    "social_facebook_url": ("https://facebook.com/", "Enlace oficial de Facebook"),
    "social_instagram_url": ("https://instagram.com/", "Enlace oficial de Instagram"),
    "social_whatsapp_url": ("https://wa.me/50236353527", "Enlace wa.me de WhatsApp"),
    "location_map_embed_url": ("https://www.google.com/maps?q=15.3115042,-91.4783088&z=17&output=embed", "URL embebida del mapa"),
    "location_google_maps_url": ("https://www.google.com/maps/place/Wicho%27s+Barbershop/@15.3115042,-91.4783088,17z/data=!3m1!4b1!4m6!3m5!1s0x858c15986e09fe0f:0xb0790cf30245b04e!8m2!3d15.3115042!4d-91.4783088!16s%2Fg%2F11vsppxdnj", "Enlace directo de Google Maps"),
    "location_waze_url": ("https://waze.com/ul?ll=15.3115042%2C-91.4783088&navigate=yes&zoom=17", "Enlace directo de Waze"),
    "location_address": ("Wicho's Barbershop, Huehuetenango, Guatemala", "Direccion textual del negocio"),
}


def clean(value):
    return str(value or "").strip()


def ensure_content_schema(cursor):
    """Asegura las columnas/tablas de contenido editable sin romper bases existentes."""
    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'barberos'
          AND COLUMN_NAME = 'descripcion'
        """
    )
    if not cursor.fetchone()["total"]:
        cursor.execute("ALTER TABLE barberos ADD COLUMN descripcion TEXT NULL AFTER telefono")

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS galeria_fotos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(120) NOT NULL,
            descripcion VARCHAR(255) NULL,
            image_url VARCHAR(255) NOT NULL,
            filename VARCHAR(180) NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_galeria_image_url (image_url)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    cursor.execute(
        """
        UPDATE barberos
        SET descripcion = 'Especialista en cortes modernos, degradados limpios y acabados detallados para un estilo fresco.'
        WHERE nombre = 'Luis' AND (descripcion IS NULL OR descripcion = '')
        """
    )
    cursor.execute(
        """
        UPDATE barberos
        SET descripcion = 'Barbero enfocado en barba, perfilado clasico y asesoria personalizada para cada cliente.'
        WHERE nombre = 'Douglas' AND (descripcion IS NULL OR descripcion = '')
        """
    )


def ensure_default_settings(cursor):
    """Crea ajustes visuales faltantes sin sobrescribir valores editados por admin."""
    for key, (value, description) in DEFAULT_SETTINGS.items():
        cursor.execute(
            """
            INSERT INTO configuracion_sistema (clave, valor, descripcion)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)
            """,
            (key, value, description),
        )


def gallery_row(row):
    """Normaliza una fila de galeria para el contrato JSON usado por React."""
    return {
        "id": int(row["id"]),
        "titulo": row["titulo"],
        "descripcion": row.get("descripcion") or "",
        "image_url": row["image_url"],
        "filename": row.get("filename") or "",
        "activo": bool(row.get("activo")),
    }


def allowed_image(file_storage):
    """Valida extension y mimetype antes de guardar archivos subidos por admin."""
    filename = secure_filename(file_storage.filename or "")
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return extension in ALLOWED_IMAGE_EXTENSIONS and file_storage.mimetype in ALLOWED_IMAGE_MIMES


def save_gallery_file(file_storage):
    """Guarda una imagen de galeria con nombre unico y devuelve su URL publica."""
    GALLERY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    original = secure_filename(file_storage.filename or "foto.jpg")
    extension = original.rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{extension}"
    file_storage.save(GALLERY_UPLOAD_DIR / filename)
    return filename, f"/api/gallery/files/{filename}"


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
    try:
        with db_cursor(commit=True) as cursor:
            ensure_content_schema(cursor)
            cursor.execute(
                f"""
                SELECT b.id, b.nombre, b.telefono, b.descripcion, b.estado, u.usuario
                FROM barberos b
                LEFT JOIN usuarios u ON u.id_barbero = b.id AND u.rol = 'Barbero'
                {where}
                ORDER BY b.nombre
                """
            )
            rows = cursor.fetchall()
        return ok(rows)
    except Exception:
        return fail("No se pudieron cargar los barberos porque la base de datos no esta disponible.", 503)


@catalog_bp.post("/barbers")
@require_roles(ROLE_ADMIN)
def create_barber():
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    telefono = clean(data.get("telefono"))
    descripcion = clean(data.get("descripcion"))
    usuario = clean(data.get("usuario")).lower()
    password = clean(data.get("password"))
    if not nombre or not usuario or not password:
        return fail("Nombre, usuario y contrasena son obligatorios.")
    try:
        with db_cursor(commit=True) as cursor:
            ensure_content_schema(cursor)
            cursor.execute("SELECT id FROM usuarios WHERE usuario = %s LIMIT 1", (usuario,))
            if cursor.fetchone():
                return fail("Ya existe un usuario con ese nombre.", 409)
            cursor.execute("SELECT id FROM barberos WHERE nombre = %s LIMIT 1", (nombre,))
            if cursor.fetchone():
                return fail("Ya existe un barbero con ese nombre.", 409)
            cursor.execute(
                "INSERT INTO barberos (nombre, telefono, descripcion, estado) VALUES (%s, %s, %s, 'Activo')",
                (nombre, telefono or None, descripcion or None),
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
    descripcion = clean(data.get("descripcion"))
    estado = clean(data.get("estado")) or "Activo"
    usuario = clean(data.get("usuario")).lower()
    password = clean(data.get("password"))
    if estado not in {"Activo", "Inactivo"}:
        return fail("Estado invalido.")
    if not nombre:
        return fail("El nombre es obligatorio.")
    try:
        with db_cursor(commit=True) as cursor:
            ensure_content_schema(cursor)
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
                "UPDATE barberos SET nombre = %s, telefono = %s, descripcion = %s, estado = %s WHERE id = %s",
                (nombre, telefono or None, descripcion or None, estado, barber_id),
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
    try:
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
    except Exception:
        return fail("No se pudieron cargar los servicios porque la base de datos no esta disponible.", 503)


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
    try:
        with db_cursor(commit=True) as cursor:
            ensure_default_settings(cursor)
            cursor.execute("SELECT clave, valor, descripcion FROM configuracion_sistema ORDER BY clave")
            rows = cursor.fetchall()
        return ok(rows)
    except Exception:
        return fail("No se pudo cargar la configuracion porque la base de datos no esta disponible.", 503)


@catalog_bp.put("/settings")
@require_roles(ROLE_ADMIN)
def update_settings():
    data = request.get_json(silent=True) or {}
    allowed = {
        "facebook_followers": "Contador de seguidores de Facebook",
        "instagram_followers": "Contador de seguidores de Instagram",
        "whatsapp_followers": "Contador de contactos de WhatsApp",
        "tiktok_followers": "Contador de seguidores de TikTok",
        "telefono_barberia": "Telefono principal de la barberia",
        "horario_general": "Horario general usado para agenda de barberos",
        "recordatorio_horas_antes": "Horas antes para recordatorio por WhatsApp",
        "social_facebook_url": "Enlace oficial de Facebook",
        "social_instagram_url": "Enlace oficial de Instagram",
        "social_whatsapp_url": "Enlace wa.me de WhatsApp",
        "location_map_embed_url": "URL embebida del mapa",
        "location_google_maps_url": "Enlace directo de Google Maps",
        "location_waze_url": "Enlace directo de Waze",
        "location_address": "Direccion textual del negocio",
        "stats_clients": "Numero final para contador de clientes",
        "stats_years": "Numero final para contador de anos de experiencia",
        "stats_styles": "Numero final para contador de estilos realizados",
    }
    with db_cursor(commit=True) as cursor:
        ensure_default_settings(cursor)
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


@catalog_bp.get("/gallery")
def list_gallery():
    """Lista fotos activas para el inicio o todas cuando el admin lo solicita."""
    include_inactive = request.args.get("include_inactive") == "1"
    where = "" if include_inactive else "WHERE activo = 1"
    try:
        with db_cursor(commit=True) as cursor:
            ensure_content_schema(cursor)
            cursor.execute(
                f"""
                SELECT id, titulo, descripcion, image_url, filename, activo
                FROM galeria_fotos
                {where}
                ORDER BY id DESC
                """
            )
            rows = cursor.fetchall()
        return ok([gallery_row(row) for row in rows])
    except Exception:
        return fail("No se pudo cargar la galeria porque la base de datos no esta disponible.", 503)


@catalog_bp.get("/gallery/files/<path:filename>")
def gallery_file(filename):
    """Sirve imagenes subidas por el administrador desde una carpeta controlada."""
    safe_name = secure_filename(filename)
    return send_from_directory(GALLERY_UPLOAD_DIR, safe_name)


@catalog_bp.post("/gallery")
@require_roles(ROLE_ADMIN)
def create_gallery_item():
    """Registra una nueva imagen en la galeria con validacion de archivo."""
    title = clean(request.form.get("titulo")) or "Foto de barberia"
    description = clean(request.form.get("descripcion"))
    active = parse_bool(request.form.get("activo", "1"))
    file_storage = request.files.get("file")
    image_url = clean(request.form.get("image_url"))
    filename = None

    if file_storage and file_storage.filename:
        if not allowed_image(file_storage):
            return fail("La foto debe ser JPG, PNG, WEBP o GIF.")
        filename, image_url = save_gallery_file(file_storage)
    if not image_url:
        return fail("Debe adjuntar una imagen o indicar una URL valida.")

    with db_cursor(commit=True) as cursor:
        ensure_content_schema(cursor)
        cursor.execute(
            """
            INSERT INTO galeria_fotos (titulo, descripcion, image_url, filename, activo)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (title, description or None, image_url, filename, active),
        )
    return ok({"message": "Foto agregada."}, 201)


@catalog_bp.put("/gallery/<int:photo_id>")
@require_roles(ROLE_ADMIN)
def update_gallery_item(photo_id):
    """Actualiza titulo, descripcion, estado y opcionalmente reemplaza la imagen."""
    title = clean(request.form.get("titulo")) or "Foto de barberia"
    description = clean(request.form.get("descripcion"))
    active = parse_bool(request.form.get("activo", "1"))
    file_storage = request.files.get("file")
    image_url = clean(request.form.get("image_url"))
    filename = None

    with db_cursor(commit=True) as cursor:
        ensure_content_schema(cursor)
        cursor.execute("SELECT filename, image_url FROM galeria_fotos WHERE id = %s", (photo_id,))
        current = cursor.fetchone()
        if not current:
            return fail("Foto no encontrada.", 404)

        if file_storage and file_storage.filename:
            if not allowed_image(file_storage):
                return fail("La foto debe ser JPG, PNG, WEBP o GIF.")
            filename, image_url = save_gallery_file(file_storage)
        else:
            filename = current.get("filename")
            image_url = image_url or current["image_url"]

        cursor.execute(
            """
            UPDATE galeria_fotos
            SET titulo = %s, descripcion = %s, image_url = %s, filename = %s, activo = %s
            WHERE id = %s
            """,
            (title, description or None, image_url, filename, active, photo_id),
        )
    return ok({"message": "Foto actualizada."})


@catalog_bp.delete("/gallery/<int:photo_id>")
@require_roles(ROLE_ADMIN)
def delete_gallery_item(photo_id):
    """Elimina el registro de galeria y borra el archivo local si existe."""
    with db_cursor(commit=True) as cursor:
        ensure_content_schema(cursor)
        cursor.execute("SELECT filename FROM galeria_fotos WHERE id = %s", (photo_id,))
        current = cursor.fetchone()
        if not current:
            return fail("Foto no encontrada.", 404)
        cursor.execute("DELETE FROM galeria_fotos WHERE id = %s", (photo_id,))

    filename = current.get("filename")
    if filename:
        try:
            (GALLERY_UPLOAD_DIR / secure_filename(filename)).unlink(missing_ok=True)
        except OSError:
            pass
    return ok({"message": "Foto eliminada."})


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
