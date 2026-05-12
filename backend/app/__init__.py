from flask import Flask
from flask_cors import CORS

from .config import Config
from .routes.auth import auth_bp
from .routes.health import health_bp
from .routes.inventory import inventory_bp
from .routes.reports import reports_bp
from .routes.reservations import reservations_bp


def create_app():
    """Crea y configura la aplicacion Flask principal."""
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        origins=app.config["FRONTEND_ORIGINS"],
        supports_credentials=True,
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(reservations_bp, url_prefix="/api/reservations")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    return app
