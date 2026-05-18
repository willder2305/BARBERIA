-- Actualiza la ubicacion oficial de Wicho's Barbershop para el mapa del Home.
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('location_map_embed_url', 'https://www.google.com/maps?q=15.3115042,-91.4783088&z=17&output=embed', 'URL embebida del mapa'),
('location_google_maps_url', 'https://www.google.com/maps/place/Wicho%27s+Barbershop/@15.3115042,-91.4783088,17z/data=!3m1!4b1!4m6!3m5!1s0x858c15986e09fe0f:0xb0790cf30245b04e!8m2!3d15.3115042!4d-91.4783088!16s%2Fg%2F11vsppxdnj', 'Enlace directo de Google Maps'),
('location_waze_url', 'https://waze.com/ul?ll=15.3115042%2C-91.4783088&navigate=yes&zoom=17', 'Enlace directo de Waze'),
('location_address', 'Wicho''s Barbershop, Huehuetenango, Guatemala', 'Direccion textual del negocio')
ON DUPLICATE KEY UPDATE
  valor = VALUES(valor),
  descripcion = VALUES(descripcion);
