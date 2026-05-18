CREATE DATABASE IF NOT EXISTS BARBERIA
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE BARBERIA;

CREATE TABLE IF NOT EXISTS barberos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    UNIQUE KEY uq_barberos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL,
    pass_hash VARCHAR(255) NOT NULL,
    rol ENUM('Admin', 'Barbero') NOT NULL,
    id_barbero INT NULL,
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    UNIQUE KEY uq_usuarios_usuario (usuario),
    KEY idx_usuarios_barbero (id_barbero),
    CONSTRAINT fk_usuarios_barberos
      FOREIGN KEY (id_barbero) REFERENCES barberos(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL DEFAULT '',
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(160) NOT NULL DEFAULT '',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Activo', 'Bloqueado') NOT NULL DEFAULT 'Activo',
    KEY idx_clientes_telefono (telefono),
    KEY idx_clientes_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    descripcion VARCHAR(255) NULL,
    categoria VARCHAR(60) NULL,
    duracion_minutos INT NOT NULL DEFAULT 30,
    requiere_separacion TINYINT(1) NOT NULL DEFAULT 0,
    minutos_separacion INT NOT NULL DEFAULT 0,
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    UNIQUE KEY uq_servicios_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_barbero INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado ENUM('Confirmada', 'Atendida', 'Cancelada', 'No asistió') NOT NULL DEFAULT 'Confirmada',
    origen ENUM('Cliente', 'Admin', 'Barbero') NOT NULL DEFAULT 'Cliente',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    fecha_cancelacion DATETIME NULL,
    motivo_cancelacion VARCHAR(255) NULL,
    cambiado_por INT NULL,
    status_changed_at DATETIME NULL,
    status_changed_by INT NULL,
    source VARCHAR(30) NULL DEFAULT 'web',
    UNIQUE KEY uq_reserva_barbero_horario (id_barbero, fecha, hora),
    KEY idx_reservas_cliente (id_cliente),
    KEY idx_reservas_barbero_fecha (id_barbero, fecha),
    KEY idx_reservas_cambiado_por (cambiado_por),
    CONSTRAINT fk_reservas_clientes
      FOREIGN KEY (id_cliente) REFERENCES clientes(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    CONSTRAINT fk_reservas_barberos
      FOREIGN KEY (id_barbero) REFERENCES barberos(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    CONSTRAINT fk_reservas_usuarios
      FOREIGN KEY (cambiado_por) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserva_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    id_servicio INT NOT NULL,
    precio_servicio DECIMAL(10,2) NOT NULL,
    UNIQUE KEY uq_reserva_servicio (id_reserva, id_servicio),
    KEY idx_reserva_servicios_servicio (id_servicio),
    CONSTRAINT fk_reserva_servicios_reservas
      FOREIGN KEY (id_reserva) REFERENCES reservas(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
    CONSTRAINT fk_reserva_servicios_servicios
      FOREIGN KEY (id_servicio) REFERENCES servicios(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historial_estados_reserva (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    id_usuario INT NULL,
    comentario VARCHAR(255),
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_historial_reserva (id_reserva),
    KEY idx_historial_usuario (id_usuario),
    CONSTRAINT fk_historial_reservas
      FOREIGN KEY (id_reserva) REFERENCES reservas(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
    CONSTRAINT fk_historial_usuarios
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS horarios_barbero (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    dia_semana TINYINT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    KEY idx_horarios_barbero_dia (id_barbero, dia_semana),
    CONSTRAINT fk_horarios_barberos
      FOREIGN KEY (id_barbero) REFERENCES barberos(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
    CONSTRAINT chk_horarios_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_horarios_rango CHECK (hora_inicio < hora_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dias_bloqueados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NULL,
    fecha DATE NOT NULL,
    motivo VARCHAR(255),
    creado_por INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_dias_bloqueados_barbero_fecha (id_barbero, fecha),
    KEY idx_dias_bloqueados_creado_por (creado_por),
    CONSTRAINT fk_dias_bloqueados_barberos
      FOREIGN KEY (id_barbero) REFERENCES barberos(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
    CONSTRAINT fk_dias_bloqueados_usuarios
      FOREIGN KEY (creado_por) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recordatorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    telefono_destino VARCHAR(20) NOT NULL,
    mensaje TEXT NOT NULL,
    message_type ENUM('confirmation', 'reminder') NOT NULL DEFAULT 'reminder',
    fecha_programada DATETIME NOT NULL,
    fecha_envio DATETIME NULL,
    estado ENUM('Pendiente', 'Enviado', 'Fallido') NOT NULL DEFAULT 'Pendiente',
    respuesta_api TEXT NULL,
    KEY idx_recordatorios_reserva (id_reserva),
    KEY idx_recordatorios_estado_fecha (estado, fecha_programada),
    CONSTRAINT fk_recordatorios_reservas
      FOREIGN KEY (id_reserva) REFERENCES reservas(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    cantidad INT NOT NULL DEFAULT 0,
    unidad VARCHAR(60) NOT NULL DEFAULT '',
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    UNIQUE KEY uq_inventario_nombre (nombre),
    CONSTRAINT chk_inventario_cantidad CHECK (cantidad >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ventas_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    vendido_por INT NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ventas_producto (id_producto),
    KEY idx_ventas_usuario (vendido_por),
    CONSTRAINT fk_ventas_inventario
      FOREIGN KEY (id_producto) REFERENCES inventario(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_usuarios
      FOREIGN KEY (vendido_por) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    CONSTRAINT chk_ventas_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reportes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_reporte VARCHAR(100) NOT NULL,
    fecha_inicio DATE NULL,
    fecha_fin DATE NULL,
    formato ENUM('PDF', 'Excel', 'Visual') NOT NULL DEFAULT 'Visual',
    generado_por INT NOT NULL,
    fecha_generado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_reportes_generado_por (generado_por),
    CONSTRAINT fk_reportes_usuarios
      FOREIGN KEY (generado_por) REFERENCES usuarios(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL,
    valor TEXT NOT NULL,
    descripcion VARCHAR(255),
    UNIQUE KEY uq_configuracion_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO barberos (id, nombre, telefono, estado) VALUES
(1, 'Luis', NULL, 'Activo'),
(2, 'Douglas', NULL, 'Activo')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    telefono = VALUES(telefono),
    estado = VALUES(estado);

INSERT INTO usuarios (nombre, usuario, pass_hash, rol, id_barbero, estado) VALUES
('Administrador', 'admin', 'scrypt:32768:8:1$KzDD5Nhgz3HUs8nw$e1832070e62272d68a85234d5cb6b2be97e08a6a4649197bc9e828c8eb703b137a4a2a8995f7bdf8fc7af1b5b3b41e89d0fa058588b9638a03e1ae297d960969', 'Admin', NULL, 'Activo'),
('Luis', 'luis', 'scrypt:32768:8:1$26LlwylFwrvDxi8C$377ecd2544192f97f2ac0a8eac6c87043bf5df8274182316958ca1652f33f2067493b98d0c5c7ea125ab4204691e9c63e6ceb551c048132df7a4435436e6374c', 'Barbero', 1, 'Activo'),
('Douglas', 'douglas', 'scrypt:32768:8:1$tRcNAjYlL9XA2oms$1a39ae67216dc5471efcf76ca458e5ce2c1629a3b18bbf0a202ff93cfa867d57fde971deab619bc47c3622c6bbb1eebc02234ba25204b1d0b0ffc048189efffb', 'Barbero', 2, 'Activo')
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    pass_hash = VALUES(pass_hash),
    rol = VALUES(rol),
    id_barbero = VALUES(id_barbero),
    estado = VALUES(estado);

INSERT INTO servicios (nombre, precio, duracion_minutos, requiere_separacion, minutos_separacion, estado) VALUES
('Corte de Cabello', 40.00, 30, 0, 0, 'Activo'),
('Tallado de Barba', 20.00, 30, 0, 0, 'Activo'),
('Tallado de Ceja', 15.00, 30, 0, 0, 'Activo'),
('Skin Care', 25.00, 30, 1, 60, 'Activo')
ON DUPLICATE KEY UPDATE
    precio = VALUES(precio),
    duracion_minutos = VALUES(duracion_minutos),
    requiere_separacion = VALUES(requiere_separacion),
    minutos_separacion = VALUES(minutos_separacion),
    estado = VALUES(estado);

INSERT INTO inventario (nombre, descripcion, cantidad, unidad, precio_venta, stock_minimo, estado) VALUES
('Navajas', 'Producto de barberia', 50, 'piezas', 0.00, 10, 'Activo'),
('Toallas', 'Producto de barberia', 30, 'piezas', 0.00, 5, 'Activo'),
('Shampoo', 'Producto para venta o uso interno', 10, 'botellas', 0.00, 3, 'Activo'),
('Crema Facial', 'Producto facial', 10, 'frascos', 0.00, 3, 'Activo')
ON DUPLICATE KEY UPDATE
    descripcion = VALUES(descripcion),
    cantidad = VALUES(cantidad),
    unidad = VALUES(unidad),
    precio_venta = VALUES(precio_venta),
    stock_minimo = VALUES(stock_minimo),
    estado = VALUES(estado);

INSERT INTO horarios_barbero (id_barbero, dia_semana, hora_inicio, hora_fin, activo)
SELECT b.id, d.dia_semana, h.hora_inicio, h.hora_fin, 1
FROM barberos b
JOIN (
  SELECT 1 AS dia_semana UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) d
JOIN (
  SELECT TIME('09:00:00') AS hora_inicio, TIME('13:00:00') AS hora_fin
  UNION ALL SELECT TIME('14:00:00'), TIME('19:00:00')
) h
WHERE b.nombre IN ('Luis', 'Douglas')
  AND NOT EXISTS (
    SELECT 1
    FROM horarios_barbero hb
    WHERE hb.id_barbero = b.id
      AND hb.dia_semana = d.dia_semana
      AND hb.hora_inicio = h.hora_inicio
      AND hb.hora_fin = h.hora_fin
  );

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('facebook_followers', '150', 'Contador de seguidores de Facebook'),
('instagram_followers', '300', 'Contador de seguidores de Instagram'),
('tiktok_followers', '58', 'Contador de seguidores de TikTok'),
('telefono_barberia', '36353527', 'Telefono principal de la barberia')
ON DUPLICATE KEY UPDATE
    valor = VALUES(valor),
    descripcion = VALUES(descripcion);
