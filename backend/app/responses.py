from flask import jsonify


def ok(data=None, status=200):
    """Devuelve una respuesta JSON exitosa con formato consistente."""
    payload = {"ok": True}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def fail(message, status=400):
    """Devuelve una respuesta JSON de error con formato consistente."""
    return jsonify({"ok": False, "error": message}), status
