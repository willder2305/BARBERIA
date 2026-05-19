# Ajustes responsive - Wicho's Barber Shop

## Secciones adaptadas

- Inicio: hero, navbar, redes sociales, tarjetas institucionales, servicios, amenidades, carrusel de trabajos, barberos, horarios, ubicacion/mapa, CTA y footer.
- Reservas: formulario por pasos, tarjetas de servicios/barberos, calendario, horarios disponibles, resumen y modal de exito.
- Login: caja de acceso con padding fluido y ancho seguro.
- Panel administrador y panel de barbero: barra superior, resumen, calendario mensual, panel lateral y modal de detalle.
- Administracion: formularios de servicios, usuarios/barberos, galeria, dias bloqueados, horarios, clientes y configuracion.
- Inventario y reportes: formularios, metricas, graficas, listados y tablas con scroll horizontal controlado.
- FAQ: cabecera, tarjetas de preguntas y boton de regreso.

## Breakpoints usados

- Hasta 480px: telefonos pequenos; una columna, controles tactiles completos, calendario compacto y footer centrado.
- Hasta 767px: telefonos grandes; navbar colapsable, cards al 100%, formularios en una columna, carrusel con tarjeta central, modales ajustados.
- Hasta 1023px: tablets; secciones de ubicacion, reportes y administracion pasan a una columna cuando el ancho no alcanza.
- Desde 1280px: escritorio amplio; contenedores limitados para evitar que el contenido se estire demasiado.

## Componentes modificados

- `frontend/src/pages/Home.jsx`: se agrego estado para abrir/cerrar el menu movil y cerrar el menu al seleccionar una opcion.
- `frontend/src/styles/global.css`: se ajustaron contenedores, grids, formularios, tablas, carrusel, mapa, footer, paneles y breakpoints responsive.

## Problemas visuales corregidos

- Prevencion de scroll horizontal global innecesario.
- Navbar movil colapsable para no apretar enlaces sobre el hero.
- Tarjetas de servicios, amenidades, barberos, horarios y metricas con ancho flexible.
- Mapa con altura fluida y ancho completo en movil.
- Formularios administrativos y de reserva con controles legibles en pantallas pequenas.
- Tablas administrativas con scroll horizontal interno y no en toda la pagina.
- Modal y panel lateral ajustados para telefonos.
- Footer con texto que no se monta ni se corta.

## Pruebas responsive realizadas

- Build de frontend con `npm.cmd run build`.
- Revision automatizada con Playwright CLI en anchos: 360px, 390px, 430px, 768px, 1024px, 1366px y 1920px.
- Resultado por ancho: `documentElement.scrollWidth` igual al ancho del viewport, sin scroll horizontal global.
- Validacion del navbar movil a 390px: el boton hamburguesa abre el menu, actualiza `aria-expanded` y deja los enlaces interactivos.
- Mapa validado con altura responsive: 280px en moviles, 307px en tablet 768px y hasta 420px en escritorio.
- Nota de prueba: en el preview estatico aparecieron errores de consola por `ERR_CONNECTION_REFUSED` contra `127.0.0.1:5000/api/*` porque el backend no estaba levantado durante la revision visual.

## Recomendaciones futuras

- Mantener nuevas tarjetas y formularios con grids `auto-fit` o columnas fluidas.
- Evitar `width` y `height` fijos en imagenes, mapas y cards salvo que tengan alternativa en media queries.
- En nuevas tablas, envolver siempre con `.table-wrap`.
- Probar cualquier nuevo componente en 360px, 768px y 1366px antes de cerrar cambios.
