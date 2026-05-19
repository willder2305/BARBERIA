from pathlib import Path
import os
import sys

import pymysql
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv(BACKEND_ROOT / ".env")

from app.config import database_settings  # noqa: E402
from app.security import hash_password, validate_password_strength  # noqa: E402


def required(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} es obligatoria para crear el administrador.")
    return value


def main():
    username = required("ADMIN_USERNAME").lower()
    password = required("ADMIN_PASSWORD")
    name = os.getenv("ADMIN_NAME", "Administrador").strip() or "Administrador"
    password_error = validate_password_strength(password)
    if password_error:
        raise RuntimeError(password_error)

    settings = database_settings()
    connection = pymysql.connect(
        host=settings["host"],
        port=int(settings["port"]),
        user=settings["user"],
        password=settings["password"],
        database=settings["database"],
        autocommit=False,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO usuarios (nombre, usuario, pass_hash, rol, id_barbero, estado)
                VALUES (%s, %s, %s, 'Admin', NULL, 'Activo')
                ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    pass_hash = VALUES(pass_hash),
                    rol = 'Admin',
                    id_barbero = NULL,
                    estado = 'Activo'
                """,
                (name, username, hash_password(password)),
            )
        connection.commit()
    finally:
        connection.close()
    print(f"Administrador listo: {username}")


if __name__ == "__main__":
    main()
