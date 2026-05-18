# Seguridad de Wicho's Barber Shop

## Problema corregido

Se reforzo el acceso directo a rutas privadas como `/admin`, `/admin/gestion`, `/inventario`, `/reportes` y `/barberos/:usuario`. El frontend ya no renderiza paneles privados antes de validar la sesion, y el backend valida cada API sensible con sesion activa y rol.

## Rutas protegidas

- Frontend: `/admin`, `/admin/gestion`, `/inventario`, `/reportes`, `/barberos/:usuario`.
- Backend admin: reservas internas, reportes, inventario, clientes, horarios, dias bloqueados, configuracion, carga/edicion/borrado de galeria, creacion/edicion de servicios y barberos.
- Backend usuarios: `/api/users` permite listar, crear y editar usuarios solo con rol `Admin`.
- Backend barbero: lectura de sus reservas y cambio de estado solo para citas del barbero autenticado.
- Consultas con `include_inactive=1`: requieren administrador.

## Login y sesion

El login se realiza contra `/api/auth/login`. Flask guarda la identidad en una cookie de sesion firmada, `httpOnly`, con `SameSite` configurable y expiracion por `SESSION_LIFETIME_MINUTES`.

El frontend consulta `/api/auth/me` antes de mostrar rutas privadas. Si no hay sesion, redirige a `/login`. Si el rol no corresponde, redirige a un panel seguro.

## Roles

- `Admin`: acceso completo al panel administrativo y APIs de gestion.
- `Barbero`: acceso a su panel y a sus reservas.

Cada request protegido valida que el usuario siga activo en la tabla `usuarios`.

El administrador puede crear usuarios desde `/admin/gestion`, asignarles rol, estado, contraseña inicial y, cuando el rol sea `Barbero`, vincularlos a un barbero existente. El sistema impide que un administrador se quite a si mismo el rol `Admin` o se inactive accidentalmente.

## Contrasenas

Las contrasenas se almacenan como hash `scrypt` usando Werkzeug. El backend nunca devuelve `pass_hash` ni imprime contrasenas. Si aparece un usuario antiguo con contrasena plana, el login la actualiza a hash solo si coincide.

Reglas minimas al crear o cambiar contrasenas:

- minimo 8 caracteres;
- al menos una letra;
- al menos un numero;
- confirmacion desde el panel para evitar errores de escritura.

## Variables de entorno

Usar `.env.example` como plantilla. Variables principales:

- `SECRET_KEY`
- `SESSION_LIFETIME_MINUTES`
- `SESSION_COOKIE_SAMESITE`
- `SESSION_COOKIE_SECURE`
- `FRONTEND_ORIGIN`
- `MAX_CONTENT_LENGTH`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

No subir `.env` real ni contrasenas reales al repositorio.

## Imagenes

La galeria administrativa permite solo `jpg`, `jpeg`, `png` y `webp`, valida MIME type y limita la carga a 4 MB por defecto. Los archivos se renombran con UUID antes de guardarse.

## Migraciones

- `backend/database/migrations/actualizacion_8_seguridad.sql`: agrega columnas de auditoria a `usuarios`.

## Pruebas realizadas

- `/api/reservations` sin sesion devuelve `401`.
- `/api/services?include_inactive=1` sin admin devuelve `401`.
- Login admin correcto devuelve dashboard `/admin`.
- `/api/auth/me` con sesion admin devuelve usuario sin contrasena.
- Admin puede consultar recursos con `include_inactive=1`.
- Login barbero correcto devuelve dashboard `/barberos/luis`.
- Barbero intentando `/api/reports/summary` recibe `403`.
- `/api/users` sin sesion devuelve `401`.
- Barbero intentando crear usuarios recibe `403`.
- Admin puede listar, crear y actualizar usuarios.
- Usuario creado por admin queda guardado con hash `scrypt`; el usuario de prueba fue eliminado despues de verificar.
- Contrasena debil al crear usuario devuelve `400`.
- Logout invalida la sesion; luego `/api/auth/me` devuelve `401`.
- Verificacion directa de usuarios locales: `admin`, `luis` y `douglas` usan hash `scrypt`.
- `backend\.venv\Scripts\python.exe -m compileall backend\app backend\scripts` paso.
- `npm.cmd run build` paso.

## Recomendaciones futuras

- Rotar contrasenas iniciales despues de instalar.
- Usar `SESSION_COOKIE_SECURE=true` en HTTPS.
- Agregar proteccion CSRF si se expone el panel fuera de entorno local.
- Registrar auditoria de cambios administrativos importantes.
- Considerar rate limiting para `/api/auth/login`.
