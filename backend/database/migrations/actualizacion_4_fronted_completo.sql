-- Actualizacion fronted-completo - contenido visual editable.
-- Ejecutar sobre BARBERIA despues de respaldar la base.

USE BARBERIA;

ALTER TABLE barberos
  ADD COLUMN IF NOT EXISTS descripcion TEXT NULL AFTER telefono;

CREATE TABLE IF NOT EXISTS galeria_fotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255) NULL,
    image_url VARCHAR(255) NOT NULL,
    filename VARCHAR(180) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_galeria_image_url (image_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE barberos
SET descripcion = 'Especialista en cortes modernos, degradados limpios y acabados detallados para un estilo fresco.'
WHERE nombre = 'Luis' AND (descripcion IS NULL OR descripcion = '');

UPDATE barberos
SET descripcion = 'Barbero enfocado en barba, perfilado clasico y asesoria personalizada para cada cliente.'
WHERE nombre = 'Douglas' AND (descripcion IS NULL OR descripcion = '');

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('social_facebook_url', 'https://facebook.com/', 'Enlace oficial de Facebook'),
('social_instagram_url', 'https://instagram.com/', 'Enlace oficial de Instagram'),
('social_whatsapp_url', 'https://wa.me/50236353527', 'Enlace wa.me de WhatsApp'),
('location_map_embed_url', 'https://www.google.com/maps?q=Huehuetenango%2C%20Guatemala&output=embed', 'URL embebida del mapa'),
('location_google_maps_url', 'https://www.google.com/maps/search/?api=1&query=Huehuetenango%2C%20Guatemala', 'Enlace directo de Google Maps'),
('location_waze_url', 'https://waze.com/ul?q=Huehuetenango%2C%20Guatemala&navigate=yes', 'Enlace directo de Waze'),
('location_address', 'Huehuetenango, Guatemala', 'Direccion textual del negocio'),
('stats_clients', '500', 'Numero final para contador de clientes'),
('stats_years', '5', 'Numero final para contador de anos de experiencia'),
('stats_styles', '1200', 'Numero final para contador de estilos realizados')
ON DUPLICATE KEY UPDATE
    valor = VALUES(valor),
    descripcion = VALUES(descripcion);

INSERT INTO galeria_fotos (titulo, descripcion, image_url, activo) VALUES
('Trabajo 1', 'Corte realizado en Wicho''s Barber Shop', '/fotos/work1.jpg', 1),
('Trabajo 2', 'Estilo profesional de barberia', '/fotos/work2.jpg', 1),
('Trabajo 3', 'Detalle de corte y acabado', '/fotos/work3.jpg', 1),
('Trabajo 4', 'Resultado de servicio activo', '/fotos/work4.jpg', 1),
('Trabajo 5', 'Galeria de trabajos recientes', '/fotos/work5.jpg', 1),
('Trabajo 6', 'Corte moderno y definido', '/fotos/work6.jpg', 1)
ON DUPLICATE KEY UPDATE
    titulo = VALUES(titulo),
    descripcion = VALUES(descripcion),
    activo = VALUES(activo);
