import json
import os
from datetime import datetime, timedelta
from urllib import error, request


def build_confirmation_message(payload):
    """Arma el texto de confirmacion que recibe el cliente por WhatsApp."""
    address = os.getenv("BARBERSHOP_ADDRESS", "Wichos Barber")
    full_name = f"{payload['nombre']} {payload.get('apellido', '')}".strip()
    return (
        f"Hola {full_name}, tu cita quedo confirmada.\n"
        f"Servicios: {payload['servicios']}\n"
        f"Barbero: {payload['barbero']}\n"
        f"Fecha: {payload['fecha']} a las {payload['hora']}\n"
        f"Direccion: {address}"
    )


def _send_cloud_api(phone, message):
    token = os.getenv("WHATSAPP_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    if not token or not phone_number_id:
        return "Pendiente", "Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID."

    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    body = json.dumps(
        {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {"preview_url": False, "body": message},
        }
    ).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with request.urlopen(req, timeout=12) as response:
            return "Enviado", response.read().decode("utf-8")
    except error.URLError as exc:
        return "Fallido", str(exc)


def send_message(phone, message, fail_when_unconfigured=False):
    """Envia un mensaje y permite marcar como fallido al procesar pendientes."""
    status, provider_response = _send_cloud_api(phone, message)
    if fail_when_unconfigured and status == "Pendiente":
        return "Fallido", provider_response
    return status, provider_response


def queue_whatsapp(cursor, reservation_id, phone, message, message_type, scheduled_for=None):
    """Registra el mensaje y lo intenta enviar solo si hay credenciales."""
    if scheduled_for is None:
        scheduled_for = datetime.now()

    status, provider_response = send_message(phone, message)
    sent_at = datetime.now() if status == "Enviado" else None
    cursor.execute(
        """
        INSERT INTO recordatorios
            (id_reserva, telefono_destino, mensaje, message_type, fecha_programada, fecha_envio, estado, respuesta_api)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (reservation_id, phone, message, message_type, scheduled_for, sent_at, status, provider_response),
    )
    return status


def queue_confirmation_and_reminder(cursor, reservation_id, payload):
    message = build_confirmation_message(payload)
    confirmation_status = queue_whatsapp(
        cursor,
        reservation_id,
        payload["telefono"],
        message,
        "confirmation",
    )
    reminder_at = datetime.strptime(
        f"{payload['fecha']} {payload['hora_sql']}",
        "%Y-%m-%d %H:%M:%S",
    ) - timedelta(hours=1)
    queue_whatsapp(
        cursor,
        reservation_id,
        payload["telefono"],
        f"Recordatorio: tienes cita en Wichos Barber a las {payload['hora']} con {payload['barbero']}.",
        "reminder",
        reminder_at,
    )
    return confirmation_status


def process_due_reminders(cursor, limit=50):
    """Procesa recordatorios pendientes solo para citas confirmadas."""
    cursor.execute(
        """
        SELECT rec.id, rec.telefono_destino, rec.mensaje, r.estado AS estado_reserva
        FROM recordatorios rec
        INNER JOIN reservas r ON r.id = rec.id_reserva
        WHERE rec.message_type = 'reminder'
          AND rec.estado = 'Pendiente'
          AND rec.fecha_programada <= NOW()
        ORDER BY rec.fecha_programada ASC
        LIMIT %s
        """,
        (limit,),
    )
    rows = cursor.fetchall()
    result = {"procesados": 0, "enviados": 0, "fallidos": 0, "omitidos": 0}

    for row in rows:
        if row["estado_reserva"] != "Confirmada":
            cursor.execute(
                """
                UPDATE recordatorios
                SET estado = 'Fallido',
                    respuesta_api = %s
                WHERE id = %s
                """,
                (f"No se envia porque la cita esta en estado {row['estado_reserva']}.", row["id"]),
            )
            result["omitidos"] += 1
            continue

        status, provider_response = send_message(row["telefono_destino"], row["mensaje"], fail_when_unconfigured=True)
        sent_at = datetime.now() if status == "Enviado" else None
        cursor.execute(
            """
            UPDATE recordatorios
            SET estado = %s,
                fecha_envio = %s,
                respuesta_api = %s
            WHERE id = %s
            """,
            (status, sent_at, provider_response, row["id"]),
        )
        result["procesados"] += 1
        if status == "Enviado":
            result["enviados"] += 1
        else:
            result["fallidos"] += 1

    return result
