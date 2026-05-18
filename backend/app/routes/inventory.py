from flask import Blueprint, request

from ..db import db_cursor
from ..responses import fail, ok
from ..security import ROLE_ADMIN, current_user, require_roles

inventory_bp = Blueprint("inventory", __name__)


def clean(value):
    return str(value or "").strip()


def item_from_row(row):
    """Convierte una fila de inventario al contrato JSON del frontend."""
    stock = int(row["cantidad"] or 0)
    stock_minimo = int(row.get("stock_minimo") or 0)
    return {
        "id": int(row["id"]),
        "nombre": row["nombre"],
        "descripcion": row.get("descripcion") or "",
        "cantidad": stock,
        "unidad": row.get("unidad") or "",
        "precio_venta": float(row.get("precio_venta") or 0),
        "stock_minimo": stock_minimo,
        "estado": row.get("estado") or "Activo",
        "stock_bajo": stock <= stock_minimo,
    }


@inventory_bp.get("")
@require_roles(ROLE_ADMIN)
def list_inventory():
    """Lista productos registrados en inventario."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, nombre, descripcion, cantidad, unidad, precio_venta, stock_minimo, estado
            FROM inventario
            ORDER BY estado, nombre
            """
        )
        rows = cursor.fetchall()
    return ok([item_from_row(row) for row in rows])


@inventory_bp.post("")
@require_roles(ROLE_ADMIN)
def create_inventory_item():
    """Crea un nuevo producto en inventario."""
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    descripcion = clean(data.get("descripcion"))
    cantidad = int(data.get("cantidad") or 0)
    unidad = clean(data.get("unidad"))
    precio_venta = float(data.get("precio_venta") or 0)
    stock_minimo = int(data.get("stock_minimo") or 0)
    if not nombre:
        return fail("El nombre del producto es obligatorio.")
    if cantidad < 0 or stock_minimo < 0:
        return fail("El stock no puede ser negativo.")
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            INSERT INTO inventario
                (nombre, descripcion, cantidad, unidad, precio_venta, stock_minimo, estado)
            VALUES (%s, %s, %s, %s, %s, %s, 'Activo')
            """,
            (nombre, descripcion or None, cantidad, unidad, precio_venta, stock_minimo),
        )
        item_id = cursor.lastrowid
    return ok({"id": item_id, "message": "Producto creado."}, 201)


@inventory_bp.put("/<int:item_id>")
@require_roles(ROLE_ADMIN)
def update_inventory_item(item_id):
    """Actualiza datos del producto sin borrar historial."""
    data = request.get_json(silent=True) or request.form
    nombre = clean(data.get("nombre"))
    descripcion = clean(data.get("descripcion"))
    cantidad = int(data.get("cantidad") or 0)
    unidad = clean(data.get("unidad"))
    precio_venta = float(data.get("precio_venta") or 0)
    stock_minimo = int(data.get("stock_minimo") or 0)
    estado = clean(data.get("estado")) or "Activo"
    if estado not in {"Activo", "Inactivo"}:
        return fail("Estado invalido.")
    if not nombre:
        return fail("El nombre del producto es obligatorio.")
    if cantidad < 0 or stock_minimo < 0:
        return fail("El stock no puede ser negativo.")
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE inventario
            SET nombre = %s, descripcion = %s, cantidad = %s, unidad = %s,
                precio_venta = %s, stock_minimo = %s, estado = %s
            WHERE id = %s
            """,
            (nombre, descripcion or None, cantidad, unidad, precio_venta, stock_minimo, estado, item_id),
        )
        if cursor.rowcount == 0:
            return fail("Producto no encontrado.", 404)
    return ok({"message": "Producto actualizado."})


@inventory_bp.delete("/<int:item_id>")
@require_roles(ROLE_ADMIN)
def deactivate_inventory_item(item_id):
    """Desactiva el producto para no romper ventas historicas."""
    with db_cursor(commit=True) as cursor:
        cursor.execute("UPDATE inventario SET estado = 'Inactivo' WHERE id = %s", (item_id,))
        if cursor.rowcount == 0:
            return fail("Producto no encontrado.", 404)
    return ok({"message": "Producto desactivado."})


@inventory_bp.post("/<int:item_id>/sales")
@require_roles(ROLE_ADMIN)
def register_sale(item_id):
    """Registra una venta y descuenta stock de forma transaccional."""
    data = request.get_json(silent=True) or request.form
    cantidad = int(data.get("cantidad") or 0)
    user = current_user()
    if cantidad <= 0:
        return fail("La cantidad vendida debe ser mayor que cero.")
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            SELECT cantidad, precio_venta, estado
            FROM inventario
            WHERE id = %s
            FOR UPDATE
            """,
            (item_id,),
        )
        item = cursor.fetchone()
        if not item:
            return fail("Producto no encontrado.", 404)
        if item["estado"] != "Activo":
            return fail("No se pueden vender productos inactivos.")
        if int(item["cantidad"] or 0) < cantidad:
            return fail("No hay stock suficiente.")
        total = float(item["precio_venta"] or 0) * cantidad
        cursor.execute(
            "UPDATE inventario SET cantidad = cantidad - %s WHERE id = %s",
            (cantidad, item_id),
        )
        cursor.execute(
            """
            INSERT INTO ventas_inventario (id_producto, cantidad, total, vendido_por)
            VALUES (%s, %s, %s, %s)
            """,
            (item_id, cantidad, total, user["id"]),
        )
    return ok({"message": "Venta registrada.", "total": total})
