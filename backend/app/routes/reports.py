from flask import Blueprint

from ..db import db_cursor
from ..responses import ok

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/summary")
def report_summary():
    """Calcula estadisticas generales, ingresos y datos para graficas."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN estado = 'Atendida' THEN 1 ELSE 0 END) AS completadas,
              SUM(CASE WHEN estado = 'No asistió' THEN 1 ELSE 0 END) AS no_show,
              SUM(CASE WHEN estado = 'Atendida' THEN total ELSE 0 END) AS ingresos
            FROM reservas
            """
        )
        summary = cursor.fetchone()

        cursor.execute(
            """
            SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes,
                   SUM(CASE WHEN estado = 'Atendida' THEN 1 ELSE 0 END) AS completadas,
                   SUM(CASE WHEN estado = 'No asistió' THEN 1 ELSE 0 END) AS no_show
            FROM reservas
            GROUP BY DATE_FORMAT(fecha, '%Y-%m')
            ORDER BY mes
            """
        )
        monthly = cursor.fetchall()

    return ok(
        {
            "totalReservas": int(summary["total"] or 0),
            "reservasCompletadas": int(summary["completadas"] or 0),
            "reservasNoShow": int(summary["no_show"] or 0),
            "ingresosTotales": float(summary["ingresos"] or 0),
            "mensual": monthly,
        }
    )
