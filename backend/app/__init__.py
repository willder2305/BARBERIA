from flask import Flask
from flask_cors import CORS

from .config import Config
from .routes.auth import auth_bp
from .routes.catalog import catalog_bp
from .routes.health import health_bp
from .routes.inventory import inventory_bp
from .routes.reports import reports_bp
from .routes.reservations import reservations_bp
from .routes.whatsapp import whatsapp_bp


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
    app.register_blueprint(catalog_bp, url_prefix="/api")
    app.register_blueprint(reservations_bp, url_prefix="/api/reservations")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(whatsapp_bp, url_prefix="/api/whatsapp")

    @app.after_request
    def add_security_headers(response):
        """Agrega cabeceras basicas para reducir XSS, sniffing y framing."""
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response

    return app
