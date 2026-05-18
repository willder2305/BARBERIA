from flask import Blueprint, request

from ..db import db_cursor
from ..responses import fail, ok
from ..security import ROLE_ADMIN, require_roles
from ..services.whatsapp import process_due_reminders

whatsapp_bp = Blueprint("whatsapp", __name__)


@whatsapp_bp.post("/reminders/process")
@require_roles(ROLE_ADMIN)
def process_reminders():
    """Procesa recordatorios pendientes de WhatsApp para uso manual o cron local."""
    limit = request.args.get("limit", default=50, type=int)
    if limit < 1 or limit > 200:
        return fail("El limite debe estar entre 1 y 200.")
    with db_cursor(commit=True) as cursor:
        result = process_due_reminders(cursor, limit)
    return ok(result)
