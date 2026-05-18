from flask import Blueprint, request, session

from ..db import db_cursor
from ..responses import fail, ok
from ..security import active_user_from_database, current_user, hash_password, looks_like_password_hash, verify_password

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
    """Valida credenciales sin revelar si fallo usuario o contrasena."""
    data = request.get_json(silent=True) or request.form
    username = (data.get("usuario") or "").strip()
    password = (data.get("pass") or "").strip()

    if not username or not password:
        return fail("Por favor completa todos los campos.")

    try:
        with db_cursor(commit=True) as cursor:
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

            # Compatibilidad controlada: si aparece una contrasena antigua en texto
            # plano, se acepta una vez y se reemplaza inmediatamente por hash.
            legacy_plaintext = bool(user and not looks_like_password_hash(user["pass_hash"]) and user["pass_hash"] == password)
            valid_password = legacy_plaintext or (user and verify_password(user["pass_hash"], password))
            if not valid_password:
                return fail("Credenciales invalidas.", 401)

            if legacy_plaintext:
                cursor.execute("UPDATE usuarios SET pass_hash = %s WHERE id = %s", (hash_password(password), user["id"]))
    except Exception:
        return fail("No se pudo iniciar sesion porque la base de datos no esta disponible o sus credenciales son incorrectas.", 503)

    dashboard = resolve_dashboard(user)
    if not dashboard:
        return fail("Usuario sin panel asignado.", 403)

    # La sesion usa cookie firmada httpOnly; Flask valida la firma en cada request.
    session.permanent = True
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
    """Cierra la sesion activa y elimina datos de usuario del navegador."""
    session.clear()
    return ok({"message": "Sesion cerrada"})


@auth_bp.get("/me")
def me():
    """Devuelve usuario autenticado para que React proteja rutas sin parpadeo."""
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
    return ok(
        {
            "id": user["id"],
            "usuario": user["usuario"],
            "rol": user["rol"],
            "id_barbero": user.get("id_barbero"),
        }
    )
