from pathlib import Path
import re
import sys

import pymysql
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv(BACKEND_ROOT / ".env")

from app.config import database_settings  # noqa: E402


MIGRATIONS_DIR = BACKEND_ROOT / "database" / "migrations"
SCHEMA_FILE = BACKEND_ROOT / "schema.sql"
MIGRATION_TABLE = "schema_migrations"


def quote_identifier(value):
    if not re.fullmatch(r"[A-Za-z0-9_]+", value or ""):
        raise RuntimeError("DB_NAME solo puede contener letras, numeros y guion bajo.")
    return f"`{value}`"


def split_sql(text):
    statements = []
    current = []
    in_single = False
    in_double = False
    index = 0
    while index < len(text):
        char = text[index]
        previous = text[index - 1] if index else ""
        if char == "'" and not in_double and previous != "\\":
            in_single = not in_single
        elif char == '"' and not in_single and previous != "\\":
            in_double = not in_double
        if char == ";" and not in_single and not in_double:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
        else:
            current.append(char)
        index += 1
    tail = "".join(current).strip()
    if tail:
        statements.append(tail)
    return statements


def should_skip_statement(statement):
    normalized = re.sub(r"^\s*--.*$", "", statement, flags=re.MULTILINE).strip().lower()
    return normalized.startswith("create database") or normalized.startswith("use ")


def connect(settings, database=None):
    return pymysql.connect(
        host=settings["host"],
        port=int(settings["port"]),
        user=settings["user"],
        password=settings["password"],
        database=database,
        autocommit=False,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def execute_sql_file(connection, path):
    with connection.cursor() as cursor:
        for statement in split_sql(path.read_text(encoding="utf-8")):
            if should_skip_statement(statement):
                continue
            try:
                cursor.execute(statement)
            except pymysql.err.OperationalError as exc:
                if exc.args and exc.args[0] == 1091 and "DROP INDEX" in statement.upper():
                    continue
                raise
    connection.commit()


def ensure_database(settings):
    db_name = settings["database"]
    with connect(settings) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS {quote_identifier(db_name)} "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        connection.commit()


def ensure_migration_table(connection):
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {MIGRATION_TABLE} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(180) NOT NULL UNIQUE,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )
    connection.commit()


def applied_migrations(connection):
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT filename FROM {MIGRATION_TABLE}")
        return {row["filename"] for row in cursor.fetchall()}


def record_migration(connection, filename):
    with connection.cursor() as cursor:
        cursor.execute(f"INSERT INTO {MIGRATION_TABLE} (filename) VALUES (%s)", (filename,))
    connection.commit()


def main():
    settings = database_settings()
    ensure_database(settings)
    with connect(settings, settings["database"]) as connection:
        execute_sql_file(connection, SCHEMA_FILE)
        ensure_migration_table(connection)
        applied = applied_migrations(connection)
        for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if migration.name in applied:
                print(f"skip {migration.name}")
                continue
            execute_sql_file(connection, migration)
            record_migration(connection, migration.name)
            print(f"applied {migration.name}")
    print("migrations complete")


if __name__ == "__main__":
    main()
