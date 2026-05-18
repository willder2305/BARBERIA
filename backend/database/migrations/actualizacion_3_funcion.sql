-- Actualizacion 3 funcion - migracion no destructiva
-- Antes de ejecutar: exportar/respaldar la base BARBERIA desde phpMyAdmin o mysqldump.
-- Ejecutar sobre MySQL despues de detener procesos que esten creando reservas.

USE BARBERIA;

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255) NULL AFTER precio,
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(60) NULL AFTER descripcion;

ALTER TABLE barberos
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status_changed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS status_changed_by INT NULL,
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NULL DEFAULT 'web';

ALTER TABLE recordatorios
  ADD COLUMN IF NOT EXISTS message_type ENUM('confirmation', 'reminder') NOT NULL DEFAULT 'reminder' AFTER mensaje;

ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- Permite reagendar un horario cuando la cita anterior fue cancelada.
-- Si este DROP falla porque el indice no existe, continuar con el siguiente CREATE INDEX.
ALTER TABLE reservas DROP INDEX uq_reserva_barbero_horario;
CREATE INDEX idx_reserva_barbero_horario_estado ON reservas (id_barbero, fecha, hora, estado);

UPDATE servicios
SET categoria = 'skincare', requiere_separacion = 1, minutos_separacion = 60
WHERE LOWER(nombre) LIKE '%skin%';

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('horario_general', '09:00-13:00,14:00-19:00', 'Horario general usado para agenda de barberos'),
('recordatorio_horas_antes', '1', 'Horas antes para recordatorio por WhatsApp'),
('whatsapp_provider', 'cloud_api', 'Proveedor configurable de WhatsApp')
ON DUPLICATE KEY UPDATE
    valor = VALUES(valor),
    descripcion = VALUES(descripcion);
