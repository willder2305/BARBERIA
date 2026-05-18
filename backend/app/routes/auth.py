from flask import Blueprint, request, session
from werkzeug.security import check_password_hash

from ..db import db_cursor
from ..responses import fail, ok

auth_bp = Blueprint("auth", __name__)


def resolve_dashboard(user):
    """Determina a que panel debe entrar el usuario autenticado."""
    role = user.get("rol")
    username = (user.get("usuario") or "").lower()
    if role == "Admin":
        return "/admin"
    if role == "Barbero" and user.get("id_barbero"):
        return f"/barberos/{username}"
    return None


@auth_bp.post("/login")
def login():
    """Valida credenciales y guarda usuario/rol en la sesion Flask."""
    data = request.get_json(silent=True) or request.form
    username = (data.get("usuario") or "").strip()
    password = (data.get("pass") or "").strip()

    if not username or not password:
        return fail("Por favor completa todos los campos.")

    try:
        with db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, usuario, pass_hash, rol, id_barbero
                FROM usuarios
                WHERE usuario = %s AND estado = 'Activo'
                LIMIT 1
                """,
                (username,),
            )
            user = cursor.fetchone()
    except Exception:
        return fail("No se pudo iniciar sesion porque la base de datos no esta disponible o sus credenciales son incorrectas.", 503)

    if not user or not check_password_hash(user["pass_hash"], password):
        return fail("Usuario o contrasena incorrectos.", 401)

    dashboard = resolve_dashboard(user)
    if not dashboard:
        return fail("Usuario sin panel asignado.", 403)

    session["id_usuario"] = user["id"]
    session["usuario"] = user["usuario"]
    session["rol"] = user["rol"]
    session["id_barbero"] = user.get("id_barbero")

    return ok(
        {
            "usuario": user["usuario"],
            "rol": user["rol"],
            "id_barbero": user.get("id_barbero"),
            "dashboard": dashboard,
        }
    )


@auth_bp.post("/logout")
def logout():
    """Cierra la sesion activa del usuario."""
    session.clear()
    return ok({"message": "Sesion cerrada"})


@auth_bp.get("/me")
def me():
    """Devuelve los datos basicos del usuario autenticado en la sesion actual."""
    if not session.get("usuario"):
        return fail("No autenticado.", 401)
    return ok(
        {
            "usuario": session["usuario"],
            "rol": session["rol"],
            "id_barbero": session.get("id_barbero"),
        }
    )
