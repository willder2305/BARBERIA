from flask import Blueprint

from ..db import db_cursor
from ..responses import fail, ok

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health_check():
    """Comprueba que Flask responda y que la base de datos este disponible."""
    try:
        with db_cursor() as cursor:
            cursor.execute("SELECT 1 AS alive")
            cursor.fetchone()
        return ok({"status": "ready"})
    except Exception as exc:
        return fail(f"No se pudo conectar a la base de datos: {exc}", 503)
