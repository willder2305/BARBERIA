-- Refuerza la tabla de usuarios para auditoria basica de seguridad.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- Referencia operativa: si existen valores pass_hash sin prefijo scrypt:/pbkdf2:/argon2,
-- deben migrarse al iniciar sesion o cambiarse desde el panel para quedar cifrados.
