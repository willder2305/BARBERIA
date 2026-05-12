const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

// Construye la URL completa del endpoint solicitado.
function endpoint(path) {
  return `${API_URL}${path}`;
}

// Procesa una respuesta JSON y lanza error cuando la API responde mal.
async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Error de comunicacion con el servidor.");
  }
  return payload.data;
}

// Ejecuta una peticion HTTP JSON contra Flask.
async function request(path, options = {}) {
  const response = await fetch(endpoint(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  return parseResponse(response);
}

// Valida credenciales de usuario.
export function login(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// Obtiene todas las reservas o las filtra por barbero.
export function getReservations(barberId = 0) {
  const suffix = barberId ? `?barbero_id=${barberId}` : "";
  return request(`/reservations${suffix}`);
}

// Crea una nueva reserva desde el formulario publico.
export function createReservation(data) {
  return request("/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Actualiza el estado de una reserva existente.
export function updateReservationStatus(id, estado) {
  return request(`/reservations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

// Lista los insumos del inventario.
export function getInventory() {
  return request("/inventory");
}

// Crea un insumo nuevo en inventario.
export function createInventoryItem(data) {
  return request("/inventory", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Actualiza un insumo existente.
export function updateInventoryItem(id, data) {
  return request(`/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Elimina un insumo por id.
export function deleteInventoryItem(id) {
  return request(`/inventory/${id}`, {
    method: "DELETE",
  });
}

// Obtiene el resumen estadistico para reportes.
export function getReportSummary() {
  return request("/reports/summary");
}
