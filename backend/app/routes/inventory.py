from flask import Blueprint, request

from ..db import db_cursor
from ..responses import fail, ok

inventory_bp = Blueprint("inventory", __name__)


def item_from_row(row):
    """Convierte una fila de inventario al contrato JSON del frontend."""
    return {
        "id": int(row["id"]),
        "nombre": row["nombre"],
        "cantidad": int(row["cantidad"] or 0),
        "unidad": row.get("unidad") or "",
    }


@inventory_bp.get("")
def list_inventory():
    """Lista todos los insumos registrados en inventario."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, nombre, cantidad, unidad
            FROM inventario
            ORDER BY id
            """
        )
        rows = cursor.fetchall()
    return ok([item_from_row(row) for row in rows])


@inventory_bp.post("")
def create_inventory_item():
    """Crea un nuevo insumo en inventario."""
    data = request.get_json(silent=True) or request.form
    nombre = str(data.get("nombre") or "").strip()
    cantidad = int(data.get("cantidad") or 0)
    unidad = str(data.get("unidad") or "").strip()

    if not nombre:
        return fail("El nombre del insumo es obligatorio.")

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            "INSERT INTO inventario (nombre, cantidad, unidad) VALUES (%s, %s, %s)",
            (nombre, cantidad, unidad),
        )
        item_id = cursor.lastrowid

    return ok({"id": item_id, "message": "Insumo creado."}, 201)


@inventory_bp.put("/<int:item_id>")
def update_inventory_item(item_id):
    """Actualiza nombre, cantidad y unidad de un insumo."""
    data = request.get_json(silent=True) or request.form
    nombre = str(data.get("nombre") or "").strip()
    cantidad = int(data.get("cantidad") or 0)
    unidad = str(data.get("unidad") or "").strip()

    if not nombre:
        return fail("El nombre del insumo es obligatorio.")

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE inventario
            SET nombre = %s, cantidad = %s, unidad = %s
            WHERE id = %s
            """,
            (nombre, cantidad, unidad, item_id),
        )
        if cursor.rowcount == 0:
            return fail("Insumo no encontrado.", 404)

    return ok({"message": "Insumo actualizado."})


@inventory_bp.delete("/<int:item_id>")
def delete_inventory_item(item_id):
    """Elimina un insumo del inventario por id."""
    with db_cursor(commit=True) as cursor:
        cursor.execute("DELETE FROM inventario WHERE id = %s", (item_id,))
        if cursor.rowcount == 0:
            return fail("Insumo no encontrado.", 404)
    return ok({"message": "Insumo eliminado."})
