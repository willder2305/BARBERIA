from contextlib import contextmanager

import pymysql
from flask import current_app
from pymysql.cursors import DictCursor


def get_connection():
    """Abre una conexion nueva a MySQL usando la configuracion de Flask."""
    return pymysql.connect(
        host=current_app.config["DB_HOST"],
        port=current_app.config["DB_PORT"],
        user=current_app.config["DB_USER"],
        password=current_app.config["DB_PASSWORD"],
        database=current_app.config["DB_NAME"],
        cursorclass=DictCursor,
        autocommit=False,
    )


@contextmanager
def db_cursor(commit=False):
    """Entrega un cursor y confirma o revierte la transaccion segun el resultado."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            yield cursor
        if commit:
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
