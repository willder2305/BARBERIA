import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def get_frontend_origins():
    """Devuelve los origenes permitidos para CORS separados por coma."""
    origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


class Config:
    """Centraliza la configuracion leida desde variables de entorno."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    FRONTEND_ORIGINS = get_frontend_origins()
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "BARBERIA")
