# Wicho's Barber Shop

Aplicacion convertida a backend Flask y frontend React. El codigo viejo en PHP/HTML/JS/CSS fue reemplazado por carpetas separadas por responsabilidad.

## Estructura

- `backend/`: API Flask modular.
- `backend/app/routes/`: rutas separadas por modulo (`auth`, `reservations`, `inventory`, `reports`, `health`).
- `frontend/`: aplicacion React con Vite.
- `frontend/src/pages/`: pantallas principales.
- `frontend/src/components/`: componentes reutilizables.
- `frontend/src/services/api.js`: cliente HTTP hacia Flask.
- `frontend/public/fotos/`: imagenes usadas por React.
- `requirements.txt`: dependencias Python del backend.

## Backend

1. Crear o activar entorno:

```powershell
backend\.venv\Scripts\Activate.ps1
```

2. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

3. Configurar variables:

```powershell
Copy-Item backend\.env.example backend\.env
```

4. Ejecutar API:

```powershell
python backend\run.py
```

La API queda en `http://127.0.0.1:5000/api`.

## Base de Datos

Usa MySQL de XAMPP con base `BARBERIA`. El archivo `backend/schema.sql` crea las tablas principales y datos iniciales.

Usuarios iniciales:

- `admin` / `abc123`
- `luis` / `abc123`
- `douglas` / `abc123`

## Frontend

1. Entrar a la carpeta:

```powershell
cd frontend
```

2. Instalar dependencias:

```powershell
npm.cmd install
```

3. Ejecutar React:

```powershell
npm.cmd run dev
```

El frontend queda en `http://127.0.0.1:5173`.
