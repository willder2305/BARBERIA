from functools import wraps

from flask import session

from .responses import fail


ROLE_ADMIN = "Admin"
ROLE_BARBER = "Barbero"


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


def require_roles(*roles):
    """Protege rutas que solo deben usar admin o barberos autenticados."""
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if not user:
                return fail("No autenticado.", 401)
            if roles and user["rol"] not in roles:
                return fail("No autorizado.", 403)
            return view(*args, **kwargs)

        return wrapped

    return decorator
