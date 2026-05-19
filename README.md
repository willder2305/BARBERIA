# Wicho's Barber Shop

Sistema web para gestion de reservas, barberos, servicios, inventario, reportes y recordatorios de WhatsApp de una barberia.

El proyecto actual ya no usa la version vieja PHP/HTML suelta. La aplicacion quedo separada en un backend Flask y un frontend React/Vite.

Ruta oficial de trabajo:

```text
C:\dev\BARBERIA
```

No usar la ruta vieja de OneDrive para cambios del sistema. Esa ruta solo puede conservar archivos de instrucciones o respaldo.

Ramas de trabajo:

- `local`: configuracion pensada para correr el sistema en la computadora con XAMPP, Python y Vite.
- `despliegue`: configuracion y documentacion pensadas para hosting, dominio, HTTPS y variables de produccion.

## Stack

- Backend: Python, Flask, PyMySQL, Flask-Cors.
- Frontend: React 18, Vite, React Router, Bootstrap, Chart.js.
- Base de datos: MySQL/MariaDB de XAMPP.
- Exportes: `openpyxl` para XLSX y `reportlab` para PDF.
- WhatsApp: registro de mensajes en base de datos y soporte para Meta Cloud API si se configuran credenciales.

## Estructura del proyecto

```text
BARBERIA/
  backend/
    app/
      routes/          Rutas Flask por modulo
      services/        Servicios internos, incluido WhatsApp
      __init__.py      App factory de Flask
      config.py        Configuracion por variables de entorno
      db.py            Conexion MySQL
      security.py      Sesion y proteccion por rol
    database/
      migrations/      Migraciones incrementales
    scripts/           Scripts operativos
    schema.sql         Esquema completo inicial
    requirements.txt   Dependencias Python
  frontend/
    public/            Assets publicos
    src/
      components/      Componentes React reutilizables
      pages/           Pantallas principales
      services/api.js  Cliente HTTP hacia Flask
      styles/          Estilos globales
    package.json       Scripts y dependencias frontend
  README.md
```

## Requisitos

- Windows con PowerShell.
- XAMPP con MySQL/MariaDB activo.
- Python 3.11 o compatible.
- Node.js/npm.
- Git, opcional pero recomendado.

El sistema esta configurado para usar MySQL en:

```text
host: localhost
puerto: 3306
usuario: root
password: vacio
base: BARBERIA
```

El servicio real de XAMPP fue verificado escuchando en `3306`.

## Instalacion desde cero

Desde PowerShell:

```powershell
cd C:\dev\BARBERIA
git switch local
```

Crear entorno Python si no existe:

```powershell
python -m venv backend\.venv
```

Activar entorno:

```powershell
backend\.venv\Scripts\Activate.ps1
```

Instalar dependencias backend:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Crear archivo de variables del backend:

```powershell
Copy-Item backend\.env.example backend\.env
```

Instalar dependencias frontend:

```powershell
cd C:\dev\BARBERIA\frontend
npm.cmd install
```

Crear variables del frontend si se necesita apuntar a una API distinta:

```powershell
Copy-Item .env.example .env
```

## Configuracion backend

Archivo principal:

```text
backend\.env
```

Variables importantes:

```text
FLASK_ENV=development
FLASK_DEBUG=1
APP_HOST=127.0.0.1
PORT=5000
SECRET_KEY=clave-local-de-desarrollo
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=BARBERIA
BARBERSHOP_ADDRESS=Wichos Barber
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=Lax
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
```

En desarrollo local, `SESSION_COOKIE_SECURE=false` es correcto porque se usa HTTP. En produccion con HTTPS debe cambiarse a `true`.

Si `DATABASE_URL` aparece en `backend\.env`, dejarlo vacio en local para que Flask use las variables `DB_*` de XAMPP.

## Base de datos

La base esperada se llama:

```text
BARBERIA
```

Crear base si no existe:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -e "CREATE DATABASE IF NOT EXISTS BARBERIA CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Cargar esquema inicial:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot BARBERIA < C:\dev\BARBERIA\backend\schema.sql
```

Aplicar migracion de actualizacion 3 si el esquema ya existia antes de esta version:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -e "source C:/dev/BARBERIA/backend/database/migrations/actualizacion_3_funcion.sql"
```

Ejecutar esquema y migraciones con el runner del proyecto:

```powershell
cd C:\dev\BARBERIA
backend\.venv\Scripts\python.exe backend\scripts\migrate.py
```

Crear o rotar un administrador con contrasena segura usando variables de entorno:

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="CambiarPorUnaClaveLarga123"
backend\.venv\Scripts\python.exe backend\scripts\create_admin.py
```

La migracion agrega o ajusta campos para:

- apellido de cliente;
- servicios con duracion y separacion;
- reservas con origen y cambios de estado;
- recordatorios WhatsApp;
- configuracion del sistema.

Tablas principales:

- `barberos`
- `usuarios`
- `clientes`
- `servicios`
- `reservas`
- `reserva_servicios`
- `historial_estados_reserva`
- `horarios_barbero`
- `dias_bloqueados`
- `recordatorios`
- `inventario`
- `ventas_inventario`
- `reportes`
- `configuracion_sistema`

Usuarios iniciales:

```text
admin
luis
douglas
```

Las contrasenas iniciales no deben publicarse en el repositorio. Configuralas en un entorno local seguro y cambialas desde el panel administrativo.

## Ejecutar el sistema

Terminal 1, backend:

```powershell
cd C:\dev\BARBERIA
backend\.venv\Scripts\python.exe backend\run.py
```

La API queda en:

```text
http://127.0.0.1:5000/api
```

Terminal 2, frontend:

```powershell
cd C:\dev\BARBERIA\frontend
npm.cmd run dev
```

El frontend queda en:

```text
http://127.0.0.1:5173
```

Compilar frontend para produccion:

```powershell
cd C:\dev\BARBERIA\frontend
npm.cmd run build
```

Previsualizar build:

```powershell
cd C:\dev\BARBERIA\frontend
npm.cmd run preview
```

## Despliegue en produccion

Esta seccion queda como referencia. Para publicar en hosting con dominio propio, usar la rama `despliegue`. No subir archivos `.env` reales al repositorio; las variables sensibles deben cargarse desde el panel del proveedor.

### Requisitos previos

- Python 3.11 o compatible para el backend Flask.
- Node.js 18 o superior y npm para compilar React/Vite.
- MySQL o MariaDB accesible desde el hosting.
- Acceso al hosting para configurar comando de inicio, variables de entorno y logs.
- Dominio propio con acceso a DNS.
- HTTPS/SSL activo antes de usar cookies seguras en produccion.

### Clonar el repositorio

```powershell
git clone URL_DEL_REPOSITORIO BARBERIA
cd BARBERIA
git switch despliegue
```

### Instalar dependencias

Backend:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Frontend:

```powershell
cd frontend
npm.cmd install
```

### Variables de entorno

Backend, tomando `backend\.env.example` como guia:

```text
FLASK_ENV=production
FLASK_DEBUG=0
APP_HOST=0.0.0.0
PORT=5000
SECRET_KEY=clave_larga_aleatoria
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=None
CORS_ORIGIN=https://midominio.com,https://www.midominio.com
DATABASE_URL=mysql+pymysql://usuario:contrasena@host:3306/BARBERIA
```

Si el hosting no entrega `DATABASE_URL`, configurar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. `SECRET_KEY` es obligatoria en produccion; si falta, el backend no arranca.

Frontend, tomando `frontend\.env.example` como guia:

```text
VITE_API_URL=https://api.midominio.com/api
```

Si frontend y backend quedan bajo el mismo dominio con proxy a `/api`, se puede usar `VITE_API_URL=/api`. En desarrollo, si no se define, React usa `http://127.0.0.1:5000/api`; en build de produccion no queda obligado a `localhost`.

### Base de datos y migraciones

Crear una base MySQL/MariaDB vacia en el hosting. Despues configurar `DATABASE_URL` o las variables `DB_*` y ejecutar:

```powershell
backend\.venv\Scripts\python.exe backend\scripts\migrate.py
```

El script crea la base si el usuario tiene permisos, carga `backend\schema.sql`, aplica en orden los archivos de `backend\database\migrations` y registra lo aplicado en `schema_migrations`.

Para crear o cambiar el administrador inicial sin guardar contrasenas en el repositorio:

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="ClaveTemporalLarga123"
backend\.venv\Scripts\python.exe backend\scripts\create_admin.py
```

Despues de entrar al panel, cambiar la contrasena temporal por una definitiva. Las contrasenas se guardan con hash `scrypt` usando Werkzeug.

### Compilar frontend

```powershell
cd frontend
npm.cmd run build
```

El resultado queda en `frontend\dist`. Subir esa carpeta al hosting estatico o configurarla como salida de build. Si el hosting sirve una SPA, configurar redireccion de cualquier ruta no encontrada hacia `index.html`; esto evita 404 al recargar `/reservas`, `/login`, `/admin` o `/barberos/:usuario`.

### Ejecutar backend

Desarrollo o hosting Windows:

```powershell
backend\.venv\Scripts\python.exe backend\run.py
```

Hosting Linux recomendado:

```bash
gunicorn -w 2 -b 0.0.0.0:$PORT run:app --chdir backend
```

El puerto real lo define el hosting con `PORT`. Mantener `FLASK_DEBUG=0` y revisar logs del proveedor si el proceso no inicia.

### Dominio, DNS y SSL

Configuracion comun:

- Dominio principal para frontend: `midominio.com`.
- Subdominio para backend: `api.midominio.com`.
- Registro `A`: apunta un dominio o subdominio a la IP del hosting.
- Registro `CNAME`: apunta `www.midominio.com` a `midominio.com` o al dominio asignado por el proveedor.
- SSL/HTTPS: activar certificado del hosting para el dominio principal y el subdominio API.

Si se usa `api.midominio.com`, configurar `VITE_API_URL=https://api.midominio.com/api` y `CORS_ORIGIN=https://midominio.com,https://www.midominio.com`. Si se usa un proxy en el mismo dominio, configurar el proxy para enviar `/api` al backend Flask.

### Verificacion despues del despliegue

- Abrir la pagina principal y revisar consola del navegador.
- Crear una reserva publica y confirmar que queda en base de datos.
- Iniciar sesion como admin y revisar `/admin`, `/admin/gestion`, `/inventario` y `/reportes`.
- Iniciar sesion como barbero y confirmar que solo ve sus propias citas.
- Confirmar que rutas protegidas responden 401/403 sin sesion.
- Descargar XLSX/PDF de reportes.
- Revisar logs del backend y errores CORS en navegador.
- Confirmar que no hay variables reales dentro del repositorio.

### Problemas comunes en produccion

- Conexion a base de datos: revisar host, puerto, usuario, contrasena, nombre de base y permisos del hosting.
- CORS: `CORS_ORIGIN` debe coincidir exactamente con el dominio del frontend, incluyendo `https://`.
- Cookie no se mantiene: usar HTTPS, `SESSION_COOKIE_SECURE=true` y `SESSION_COOKIE_SAMESITE=None` si frontend y API estan en dominios/subdominios distintos.
- 404 al recargar React: falta redireccion SPA hacia `index.html`.
- Variables no detectadas: en Vite las variables deben existir antes de `npm run build`; en Flask deben existir antes de iniciar el proceso.
- Migraciones: ejecutar `backend\scripts\migrate.py` una sola vez por despliegue y revisar `schema_migrations`.
- Dominio o SSL: esperar propagacion DNS y verificar certificado para dominio y subdominio.

## Rutas frontend

- `/`: pagina principal.
- `/reservas`: formulario publico de reservas.
- `/login`: acceso para admin y barberos.
- `/admin`: panel administrador con calendario/resumen.
- `/admin/gestion`: servicios, barberos, clientes, dias bloqueados, horarios y configuracion.
- `/barberos/:usuario`: panel del barbero autenticado.
- `/inventario`: inventario y ventas.
- `/reportes`: resumen y exportes.

## API principal

En desarrollo local, la API usa prefijo `http://127.0.0.1:5000/api`. En produccion, React debe usar `VITE_API_URL` o `/api` con proxy del hosting.

Autenticacion:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Catalogo y administracion:

- `GET /barbers`
- `POST /barbers`
- `PUT /barbers/<id>`
- `GET /services`
- `POST /services`
- `PUT /services/<id>`
- `GET /clients`
- `GET /clients/<id>/reservations`
- `GET /settings`
- `PUT /settings`
- `GET /blocked-days`
- `POST /blocked-days`
- `DELETE /blocked-days/<id>`
- `GET /schedules`
- `PUT /schedules`

Reservas:

- `GET /reservations`
- `GET /reservations/availability`
- `POST /reservations`
- `PATCH /reservations/<id>/status`

Inventario:

- `GET /inventory`
- `POST /inventory`
- `PUT /inventory/<id>`
- `DELETE /inventory/<id>`
- `POST /inventory/<id>/sales`

Reportes:

- `GET /reports/summary`
- `GET /reports/export`
- `GET /reports/export/xlsx`
- `GET /reports/export/pdf`

WhatsApp:

- `POST /whatsapp/reminders/process`

Salud:

- `GET /api/health`

## Roles y permisos

Admin:

- ve todas las reservas;
- gestiona servicios, barberos, clientes, dias bloqueados, horarios y configuracion;
- gestiona inventario;
- descarga reportes;
- procesa recordatorios WhatsApp.

Barbero:

- accede a su panel por `/barberos/:usuario`;
- solo ve sus propias citas;
- puede cambiar estado de sus citas.

Publico:

- puede entrar a `/reservas`;
- puede consultar disponibilidad;
- puede crear reservas.

## Reserva publica

El formulario publico solicita:

- nombre;
- apellido;
- telefono exacto de 8 digitos numericos;
- uno o varios servicios;
- barbero;
- fecha;
- hora.

No solicita correo ni comentario.

Reglas importantes:

- el apellido es obligatorio;
- el telefono solo acepta 8 digitos numericos;
- se puede seleccionar mas de un servicio;
- el total se calcula con la suma de los servicios seleccionados;
- el backend guarda la relacion en `reserva_servicios`;
- no se permite duplicar una cita con el mismo barbero, fecha y hora;
- si el barbero es diferente, la misma hora puede estar disponible;
- los dias bloqueados rechazan reservas;
- los servicios tipo Skin Care requieren separacion de una hora contra otro Skin Care del mismo barbero;
- una cita cancelada libera el horario;
- marcar `No asistio` incrementa strikes del cliente.

## Horarios configurables

Los horarios se gestionan desde `/admin/gestion`.

Funcionalidad disponible:

- ver horarios por barbero;
- agregar franjas;
- quitar franjas;
- cambiar dia;
- cambiar hora de inicio y fin;
- activar o desactivar franjas;
- guardar horario de un barbero;
- aplicar el mismo horario a todos los barberos.

Reglas de validacion:

- las horas usan formato `HH:MM`;
- solo se aceptan bloques de 30 minutos;
- la hora de inicio debe ser menor que la hora final;
- no se permiten franjas solapadas activas en el mismo dia;
- debe existir al menos una franja enviada.

La disponibilidad publica usa `horarios_barbero`, por lo que los cambios de horario afectan inmediatamente las reservas.

## Dias bloqueados

Desde `/admin/gestion` se pueden bloquear fechas:

- para toda la barberia;
- para un barbero especifico.

El backend evita duplicados por fecha y alcance. Si una fecha esta bloqueada, la reserva publica la rechaza.

## Inventario

Desde `/inventario` el admin puede:

- crear productos;
- editar stock, unidad, precio y stock minimo;
- desactivar productos;
- registrar ventas;
- descontar stock automaticamente;
- impedir ventas mayores al stock disponible.

Las ventas quedan en `ventas_inventario` para reportes.

## Reportes

Desde `/reportes` se puede consultar:

- total de reservas;
- confirmadas;
- atendidas;
- canceladas;
- no-shows;
- ingresos por citas atendidas;
- ingresos por productos;
- estadisticas por mes;
- estadisticas por barbero;
- servicios mas usados;
- clientes frecuentes;
- stock bajo.

Exportes:

- `GET /api/reports/export/xlsx`: XLSX real.
- `GET /api/reports/export/pdf`: PDF real.
- `GET /api/reports/export`: CSV legado por compatibilidad.

El calculo de ingresos evita duplicar totales cuando una reserva tiene multiples servicios.

## WhatsApp

Al crear una reserva se registra:

- mensaje de confirmacion;
- recordatorio programado.

Los registros se guardan en `recordatorios`.

Si `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` estan vacios, el mensaje queda como `Pendiente`. Eso es esperado en desarrollo.

Procesar recordatorios pendientes por script:

```powershell
cd C:\dev\BARBERIA
backend\.venv\Scripts\python.exe backend\scripts\process_whatsapp_reminders.py
```

Procesar por API con sesion admin:

```text
POST /api/whatsapp/reminders/process
```

Solo se intentan enviar recordatorios de reservas en estado `Confirmada`. Si la cita fue cancelada, atendida o marcada como no-show, el recordatorio se omite.

## Verificacion rapida

Backend:

```powershell
cd C:\dev\BARBERIA
backend\.venv\Scripts\python.exe -m compileall backend\app backend\scripts
```

Frontend:

```powershell
cd C:\dev\BARBERIA\frontend
npm.cmd run build
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "data": {
    "status": "ready"
  }
}
```

## Checklist QA manual

Reservas:

- crear reserva publica valida con nombre, apellido y telefono de 8 digitos;
- rechazar telefono con menos de 8 digitos;
- rechazar telefono con mas de 8 digitos;
- rechazar telefono con letras, espacios o simbolos;
- seleccionar multiples servicios;
- confirmar que el total sea la suma correcta;
- confirmar que el resumen liste todos los servicios;
- confirmar que WhatsApp registre apellido y servicios;
- bloquear doble reserva con mismo barbero, fecha y hora;
- permitir misma hora con barbero diferente;
- rechazar reserva en dia bloqueado;
- rechazar Skin Care sin separacion de una hora;
- cancelar cita y confirmar que libera horario;
- marcar `No asistio` y confirmar strike en la siguiente cita.

Roles:

- login admin;
- login barbero;
- admin ve todas las citas;
- barbero solo ve sus citas;
- usuario sin sesion vuelve a `/login` en rutas privadas.

Admin:

- crear/editar servicio;
- activar/desactivar servicio;
- crear/editar barbero;
- evitar usuario duplicado;
- cambiar contrasena de barbero;
- buscar cliente;
- ver historial de cliente;
- bloquear dia general;
- bloquear dia por barbero;
- editar horario de un barbero;
- aplicar horario a todos.

Inventario:

- crear producto;
- registrar venta;
- confirmar descuento de stock;
- rechazar venta sin stock suficiente;
- confirmar alerta de stock bajo.

Reportes:

- ver resumen;
- descargar XLSX;
- descargar PDF;
- confirmar que una cita con multiples servicios no duplique ingresos.

Visual:

- revisar desktop y mobile:
  - `/reservas`;
  - `/login`;
  - `/admin`;
  - `/admin/gestion`;
  - `/barberos/luis`;
  - `/reportes`.

## Pruebas ya realizadas en esta actualizacion

Se valido con la base real de XAMPP y datos de prueba eliminados al terminar:

- backend compila con `compileall`;
- frontend compila con `npm.cmd run build`;
- health check correcto;
- login admin correcto;
- login barbero correcto;
- telefono invalido rechazado;
- reserva multi-servicio correcta;
- doble reserva mismo barbero bloqueada;
- misma hora con otro barbero permitida;
- dia bloqueado rechaza reserva;
- Skin Care respeta separacion de una hora;
- cancelar libera horario;
- `No asistio` incrementa strikes;
- siguiente cita muestra strike;
- WhatsApp registra apellido y servicios;
- admin ve citas de ambos barberos;
- barbero solo ve sus citas;
- inventario descuenta stock;
- inventario rechaza venta sin stock;
- XLSX descarga correctamente;
- PDF descarga correctamente;
- reportes no duplican ingresos por multiples servicios;
- rutas principales cargan en desktop y mobile con Playwright.

## Problemas comunes

MySQL no conecta:

- verificar que XAMPP MySQL este iniciado;
- confirmar que el puerto sea `3306`;
- revisar `backend\.env`;
- probar:

```powershell
netstat -ano | findstr ":3306"
```

Puerto frontend ocupado:

- Vite usa `127.0.0.1:5173` con `strictPort`;
- cerrar el proceso que ocupa el puerto o cambiar `frontend/vite.config.js`.

Sesion no se mantiene:

- revisar `CORS_ORIGIN`;
- verificar que el frontend use `http://127.0.0.1:5173`;
- en desarrollo mantener `SESSION_COOKIE_SECURE=false`.

PDF falla por dependencia grafica:

- el sistema tiene fallback basico;
- si se quiere el PDF con formato avanzado, reinstalar `reportlab` y dependencias del entorno Python.

WhatsApp queda pendiente:

- es normal si `WHATSAPP_TOKEN` o `WHATSAPP_PHONE_NUMBER_ID` estan vacios;
- para envio real deben configurarse credenciales de Meta Cloud API.

Caracteres raros en `No asistio`:

- algunas instalaciones antiguas pueden tener el enum guardado con codificacion distinta;
- el backend normaliza y detecta el valor real desde MySQL para no romper strikes.

## Notas de mantenimiento

- No hacer `DROP` de tablas en una base con datos reales.
- No renombrar tablas sin migracion.
- No guardar contrasenas en texto plano.
- No reintroducir correo ni comentario en reserva publica sin aprobacion.
- Mantener apellido obligatorio.
- Mantener telefono como exactamente 8 digitos numericos.
- Mantener el CSV `GET /api/reports/export` como legado hasta decidir formalmente si se elimina.
- Antes de commitear, revisar `git diff` porque hay cambios acumulados de varias etapas.

## Actualizacion `fronted-completo`

Esta rama agrega una mejora visual y administrativa enfocada en la pagina principal y en contenido editable desde el panel admin.

Alcance previsto:

- nota informativa debajo del horario de atencion;
- botones funcionales para Facebook, Instagram y WhatsApp;
- conteo animado de seguidores/contactos de Facebook, Instagram y WhatsApp, conectado a `configuracion_sistema`;
- mensajes visibles en `/reservas` si no cargan servicios o barberos por conexion de base de datos;
- configuracion comentada de enlaces de redes sociales;
- seccion de ubicacion con mapa, boton de Google Maps y boton de Waze;
- configuracion comentada de mapa, Google Maps, Waze y direccion textual;
- footer responsivo conservando el credito de desarrollo;
- correccion de recortes, espaciados y contenedores del inicio;
- seccion de amenidades separada de servicios;
- servicios presentados como bloque visual propio usando datos reales cuando la API responda;
- carruseles esteticos en secciones con fondo/blur;
- controles de carrusel mas estables en desktop y movil;
- administracion de fotos desde `/admin/gestion`: agregar, editar y borrar;
- textos profesionales diferentes para cada barbero;
- edicion de descripcion de barberos desde administracion;
- conteo animado desde 0 hasta el valor configurado;
- comentarios de configuracion y bloques principales en frontend y backend;
- validacion de enlaces externos con `target="_blank"` y `rel="noopener noreferrer"`;
- validacion de imagenes por extension y tipo permitido.

Nuevos endpoints previstos:

- `GET /api/gallery`
- `POST /api/gallery`
- `PUT /api/gallery/<id>`
- `DELETE /api/gallery/<id>`

Base de datos prevista:

- nueva tabla `galeria_fotos` para imagenes administrables;
- nuevo campo `descripcion` en `barberos` para textos editables.

Migracion de esta rama:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -e "source C:/dev/BARBERIA/backend/database/migrations/actualizacion_4_fronted_completo.sql"
```

El backend tambien asegura estas estructuras al usar las rutas de catalogo/galeria, para mantener compatibilidad con bases que aun no tengan la migracion aplicada.

Verificacion esperada al cerrar esta rama:

- `backend\.venv\Scripts\python.exe -m compileall backend\app backend\scripts`
- `npm.cmd run build`
- prueba visual en desktop, tablet y movil de `/`, `/admin/gestion`, `/reservas`, `/login`, `/reportes` y `/barberos/luis`;
- prueba admin de agregar, editar y borrar foto;
- prueba admin de editar descripcion de barbero;
- confirmacion de que redes, Google Maps, Waze y WhatsApp abren correctamente.
