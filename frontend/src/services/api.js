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
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(endpoint(path), {
    credentials: "include",
    headers,
    ...options,
  });
  return parseResponse(response);
}

// Ejecuta peticiones multipart para subir imagenes sin forzar Content-Type.
async function requestForm(path, formData, method = "POST") {
  const response = await fetch(endpoint(path), {
    method,
    credentials: "include",
    body: formData,
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

export function getMe() {
  return request("/auth/me");
}

// Cierra la sesion httpOnly mantenida por Flask.
export function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

// Obtiene todas las reservas o las filtra por barbero.
export function getReservations(barberId = 0) {
  const suffix = barberId ? `?barbero_id=${barberId}` : "";
  return request(`/reservations${suffix}`);
}

// Lista barberos activos desde la base de datos.
export function getBarbers(includeInactive = false) {
  return request(`/barbers${includeInactive ? "?include_inactive=1" : ""}`);
}

// Lista servicios activos desde la base de datos.
export function getServices(includeInactive = false) {
  return request(`/services${includeInactive ? "?include_inactive=1" : ""}`);
}

export function createService(data) {
  return request("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateService(id, data) {
  return request(`/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function createBarber(data) {
  return request("/barbers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBarber(id, data) {
  return request(`/barbers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getUsers() {
  return request("/users");
}

export function createUser(data) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(id, data) {
  return request(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getSettings() {
  return request("/settings");
}

export function updateSettings(data) {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getBlockedDays() {
  return request("/blocked-days");
}

export function createBlockedDay(data) {
  return request("/blocked-days", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteBlockedDay(id) {
  return request(`/blocked-days/${id}`, {
    method: "DELETE",
  });
}

export function getSchedules(barberId = 0) {
  const suffix = barberId ? `?barbero_id=${barberId}` : "";
  return request(`/schedules${suffix}`);
}

export function getGallery(includeInactive = false) {
  return request(`/gallery${includeInactive ? "?include_inactive=1" : ""}`);
}

export function createGalleryItem(formData) {
  return requestForm("/gallery", formData, "POST");
}

export function updateGalleryItem(id, formData) {
  return requestForm(`/gallery/${id}`, formData, "PUT");
}

export function deleteGalleryItem(id) {
  return request(`/gallery/${id}`, {
    method: "DELETE",
  });
}

export function updateSchedules(data) {
  return request("/schedules", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getClients(query = "") {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  return request(`/clients${suffix}`);
}

export function getClientReservations(id) {
  return request(`/clients/${id}/reservations`);
}

// Obtiene los horarios del dia y marca ocupados/bloqueados.
export function getAvailability({ barberId, fecha, serviceId, serviceIds = [] }) {
  const params = new URLSearchParams({ barbero_id: barberId, fecha });
  if (serviceId) params.set("service_id", serviceId);
  if (serviceIds.length) params.set("service_ids", serviceIds.join(","));
  return request(`/reservations/availability?${params.toString()}`);
}

// Crea una nueva reserva desde el formulario publico.
export function createReservation(data) {
  return request("/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Actualiza el estado de una reserva existente.
export function updateReservationStatus(id, estado, motivo = "") {
  return request(`/reservations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ estado, motivo }),
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

// Registra venta de inventario y descuenta stock.
export function registerInventorySale(id, cantidad) {
  return request(`/inventory/${id}/sales`, {
    method: "POST",
    body: JSON.stringify({ cantidad }),
  });
}

// Obtiene el resumen estadistico para reportes.
export function getReportSummary() {
  return request("/reports/summary");
}

export function reportExportUrl() {
  return endpoint("/reports/export/xlsx");
}

export function reportPdfUrl() {
  return endpoint("/reports/export/pdf");
}
