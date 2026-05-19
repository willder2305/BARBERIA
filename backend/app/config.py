import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def get_frontend_origins():
    """Devuelve los origenes permitidos para CORS separados por coma."""
    origins = os.getenv("CORS_ORIGIN") or os.getenv("FRONTEND_ORIGIN")
    if not origins:
        origins = "http://localhost:5173,http://127.0.0.1:5173"
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


def parse_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def database_settings():
    """Permite configurar MySQL por DATABASE_URL o por variables DB_*."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        if parsed.scheme not in {"mysql", "mysql+pymysql", "mariadb", "mariadb+pymysql"}:
            raise RuntimeError("DATABASE_URL debe usar mysql:// o mariadb://.")
        return {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 3306,
            "user": parsed.username or "",
            "password": parsed.password or "",
            "database": (parsed.path or "/").lstrip("/"),
        }
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", "BARBERIA"),
    }


def secret_key():
    value = os.getenv("SECRET_KEY")
    production = os.getenv("FLASK_ENV") == "production" or os.getenv("APP_ENV") == "production"
    if production and not value:
        raise RuntimeError("SECRET_KEY es obligatoria en produccion.")
    return value or "dev-secret-key-change-me"


DB_SETTINGS = database_settings()


class Config:
    """Centraliza configuracion sensible leida desde variables de entorno."""

    ENV = os.getenv("FLASK_ENV") or os.getenv("APP_ENV", "development")
    DEBUG = parse_bool("FLASK_DEBUG", ENV != "production")
    APP_HOST = os.getenv("APP_HOST", "127.0.0.1" if ENV != "production" else "0.0.0.0")
    PORT = int(os.getenv("PORT", "5000"))
    # SECRET_KEY firma la cookie de sesion; en produccion debe venir del entorno.
    SECRET_KEY = secret_key()
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = parse_bool("SESSION_COOKIE_SECURE", ENV == "production")
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=int(os.getenv("SESSION_LIFETIME_MINUTES", "120")))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(4 * 1024 * 1024)))
    FRONTEND_ORIGINS = get_frontend_origins()
    DB_HOST = DB_SETTINGS["host"]
    DB_PORT = int(DB_SETTINGS["port"])
    DB_USER = DB_SETTINGS["user"]
    DB_PASSWORD = DB_SETTINGS["password"]
    DB_NAME = DB_SETTINGS["database"]
