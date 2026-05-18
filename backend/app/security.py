from functools import wraps

from flask import session
from werkzeug.security import check_password_hash, generate_password_hash

from .responses import fail


ROLE_ADMIN = "Admin"
ROLE_BARBER = "Barbero"
PASSWORD_MIN_LENGTH = 8


def hash_password(password):
    """Genera un hash scrypt para no guardar contrasenas en texto plano."""
    return generate_password_hash(password)


def verify_password(stored_hash, password):
    """Valida contrasenas contra hashes seguros y rechaza valores vacios."""
    if not stored_hash or not password:
        return False
    return check_password_hash(stored_hash, password)


def looks_like_password_hash(value):
    """Detecta hashes conocidos para planificar migraciones de usuarios antiguos."""
    raw = str(value or "")
    return raw.startswith(("scrypt:", "pbkdf2:", "argon2"))


def validate_password_strength(password):
    """Aplica reglas minimas para evitar contrasenas triviales en cuentas internas."""
    raw = str(password or "")
    if len(raw) < PASSWORD_MIN_LENGTH:
        return "La contrasena debe tener al menos 8 caracteres."
    if not any(char.isalpha() for char in raw):
        return "La contrasena debe incluir al menos una letra."
    if not any(char.isdigit() for char in raw):
        return "La contrasena debe incluir al menos un numero."
    return None


def current_user():
    """Devuelve la sesion normalizada del usuario autenticado."""
    if not session.get("id_usuario"):
        return None
    return {
        "id": session.get("id_usuario"),
        "usuario": session.get("usuario"),
        "rol": session.get("rol"),
        "id_barbero": session.get("id_barbero"),
    }


def active_user_from_database(user_id):
    """Confirma en base de datos que la cuenta siga activa antes de autorizar."""
    from .db import db_cursor

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, usuario, rol, id_barbero
            FROM usuarios
            WHERE id = %s AND estado = 'Activo'
            LIMIT 1
            """,
            (user_id,),
        )
        return cursor.fetchone()


def require_roles(*roles):
    """Protege rutas sensibles verificando sesion activa y roles permitidos."""
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if not user:
                return fail("Debes iniciar sesion para acceder.", 401)
            try:
                user = active_user_from_database(user["id"])
            except Exception:
                return fail("No se pudo validar la sesion.", 503)
            if not user:
                session.clear()
                return fail("Sesion expirada, inicia sesion nuevamente.", 401)
            if roles and user["rol"] not in roles:
                return fail("No tienes permisos para ver esta pagina.", 403)
            return view(*args, **kwargs)

        return wrapped

    return decorator


def require_admin_when(condition):
    """Bloquea opciones de consulta administrativa cuando no hay rol Admin."""
    if not condition:
        return None
    user = current_user()
    if not user:
        return fail("Debes iniciar sesion como administrador para acceder.", 401)
    try:
        active_user = active_user_from_database(user["id"])
    except Exception:
        return fail("No se pudo validar la sesion.", 503)
    if not active_user or active_user["rol"] != ROLE_ADMIN:
        return fail("No tienes permisos para ver esta pagina.", 403)
    return None
