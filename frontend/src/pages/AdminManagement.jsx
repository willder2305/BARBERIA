import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import {
  createBlockedDay,
  createGalleryItem,
  createService,
  createUser,
  deleteBlockedDay,
  deleteGalleryItem,
  getBarbers,
  getBlockedDays,
  getClientReservations,
  getClients,
  getGallery,
  getSchedules,
  getServices,
  getSettings,
  getUsers,
  updateGalleryItem,
  updateSchedules,
  updateService,
  updateSettings,
  updateUser,
} from "../services/api.js";

const EMPTY_SERVICE = { id: "", nombre: "", precio: "", descripcion: "", requiere_separacion: false, estado: "Activo" };
const EMPTY_USER = { id: "", nombre: "", usuario: "", rol: "Admin", id_barbero: "", telefono: "", descripcion: "", estado: "Activo", password: "", confirmPassword: "" };
const EMPTY_BLOCK = { fecha: "", id_barbero: "", motivo: "" };
const EMPTY_GALLERY = { id: "", titulo: "", descripcion: "", image_url: "", activo: true, file: null };
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api").replace(/\/api\/?$/, "");
const DEFAULT_SCHEDULE_ROWS = [
  { dia_semana: 1, hora_inicio: "09:00", hora_fin: "13:00", activo: true },
  { dia_semana: 1, hora_inicio: "14:00", hora_fin: "19:00", activo: true },
  { dia_semana: 2, hora_inicio: "09:00", hora_fin: "13:00", activo: true },
  { dia_semana: 2, hora_inicio: "14:00", hora_fin: "19:00", activo: true },
  { dia_semana: 3, hora_inicio: "09:00", hora_fin: "13:00", activo: true },
  { dia_semana: 3, hora_inicio: "14:00", hora_fin: "19:00", activo: true },
  { dia_semana: 4, hora_inicio: "09:00", hora_fin: "13:00", activo: true },
  { dia_semana: 4, hora_inicio: "14:00", hora_fin: "19:00", activo: true },
  { dia_semana: 5, hora_inicio: "09:00", hora_fin: "13:00", activo: true },
  { dia_semana: 5, hora_inicio: "14:00", hora_fin: "19:00", activo: true },
  { dia_semana: 6, hora_inicio: "09:00", hora_fin: "13:00", activo: true },
  { dia_semana: 6, hora_inicio: "14:00", hora_fin: "19:00", activo: true },
];
const DAY_NAMES = ["", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function normalizeDate(value) {
  return String(value || "").slice(0, 10);
}

export default function AdminManagement() {
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);
  const [settings, setSettings] = useState({});
  const [gallery, setGallery] = useState([]);
  const [galleryForm, setGalleryForm] = useState(EMPTY_GALLERY);
  const [scheduleBarberId, setScheduleBarberId] = useState("");
  const [scheduleRows, setScheduleRows] = useState(DEFAULT_SCHEDULE_ROWS);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [settingsSavedModal, setSettingsSavedModal] = useState(false);

  async function loadAll() {
    const [serviceRows, barberRows, blockRows, settingRows, clientRows, galleryRows, userRows] = await Promise.all([
      getServices(true),
      getBarbers(true),
      getBlockedDays(),
      getSettings(),
      getClients(),
      getGallery(true),
      getUsers(),
    ]);
    setServices(serviceRows);
    setBarbers(barberRows);
    setBlockedDays(blockRows);
    setSettings(Object.fromEntries(settingRows.map((item) => [item.clave, item.valor])));
    setClients(clientRows);
    setGallery(galleryRows);
    setUsers(userRows);
    if (!scheduleBarberId && barberRows.length) {
      setScheduleBarberId(String(barberRows[0].id));
      await loadSchedules(barberRows[0].id);
    }
  }

  async function loadSchedules(barberId = scheduleBarberId) {
    if (!barberId) return;
    const rows = await getSchedules(Number(barberId));
    setScheduleRows(rows.length ? rows.map((row) => ({ ...row, activo: Boolean(row.activo) })) : DEFAULT_SCHEDULE_ROWS);
  }

  async function searchClients(event) {
    event.preventDefault();
    try {
      setClients(await getClients(clientSearch));
      setSelectedClient(null);
      setClientHistory([]);
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function selectClient(client) {
    try {
      setSelectedClient(client);
      setClientHistory(await getClientReservations(client.id));
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function saveService(event) {
    event.preventDefault();
    try {
      const payload = { ...serviceForm, precio: Number(serviceForm.precio), requiere_separacion: Boolean(serviceForm.requiere_separacion) };
      if (serviceForm.id) {
        await updateService(serviceForm.id, payload);
        setMessage("Servicio actualizado.");
      } else {
        await createService(payload);
        setMessage("Servicio creado.");
      }
      setMessageType("success");
      setServiceForm(EMPTY_SERVICE);
      await loadAll();
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    try {
      const payload = { ...userForm, id_barbero: userForm.rol === "Barbero" ? userForm.id_barbero : "" };
      // El frontend confirma contrasena, pero el backend conserva la validacion autoritativa.
      if (payload.password || !payload.id) {
        if (payload.password !== payload.confirmPassword) {
          setMessageType("danger");
          setMessage("La confirmacion de contrasena no coincide.");
          return;
        }
      }
      delete payload.confirmPassword;
      if (payload.id && !payload.password) {
        delete payload.password;
      }
      if (payload.id) {
        await updateUser(payload.id, payload);
        setMessage(payload.password ? "Usuario y contrasena actualizados." : "Usuario actualizado.");
      } else {
        await createUser(payload);
        setMessage("Usuario creado.");
      }
      setMessageType("success");
      setUserForm(EMPTY_USER);
      await loadAll();
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function saveGallery(event) {
    event.preventDefault();
    try {
      const formData = new FormData();
      formData.append("titulo", galleryForm.titulo);
      formData.append("descripcion", galleryForm.descripcion);
      formData.append("image_url", galleryForm.image_url);
      formData.append("activo", galleryForm.activo ? "1" : "0");
      if (galleryForm.file) formData.append("file", galleryForm.file);

      if (galleryForm.id) {
        await updateGalleryItem(galleryForm.id, formData);
        setMessage("Foto actualizada.");
      } else {
        await createGalleryItem(formData);
        setMessage("Foto agregada.");
      }
      setMessageType("success");
      setGalleryForm(EMPTY_GALLERY);
      await loadAll();
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function removeGalleryPhoto(photoId) {
    try {
      await deleteGalleryItem(photoId);
      setMessageType("success");
      setMessage("Foto eliminada.");
      if (galleryForm.id === photoId) setGalleryForm(EMPTY_GALLERY);
      await loadAll();
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function saveBlock(event) {
    event.preventDefault();
    try {
      await createBlockedDay(blockForm);
      setMessageType("success");
      setMessage("Dia bloqueado.");
      setBlockForm(EMPTY_BLOCK);
      await loadAll();
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      await updateSettings(settings);
      setMessage("");
      setSettingsSavedModal(true);
      await loadAll();
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  function updateScheduleRow(index, field, value) {
    setScheduleRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  async function saveSchedules(applyAll = false) {
    try {
      await updateSchedules({
        barbero_id: Number(scheduleBarberId),
        apply_all: applyAll,
        schedules: scheduleRows,
      });
      setMessageType("success");
      setMessage(applyAll ? "Horario aplicado a todos los barberos." : "Horario actualizado.");
      if (!applyAll) await loadSchedules(scheduleBarberId);
    } catch (err) {
      setMessageType("danger");
      setMessage(err.message);
    }
  }

  useEffect(() => {
    loadAll().catch((err) => {
      setMessageType("danger");
      setMessage(err.message);
    });
  }, []);

  return (
    <main className="management-page">
      <PageHeader title="Administracion" subtitle="Gestiona servicios, barberos, dias bloqueados y configuracion" backTo="/admin" />
      {settingsSavedModal && (
        <div className="modal-backdrop-custom" role="dialog" aria-modal="true" aria-labelledby="settings-saved-title">
          <div className="modal-card settings-saved-modal">
            <div className="modal-header-custom">
              <h5 id="settings-saved-title">
                <i className="fa-solid fa-circle-check" /> Configuracion guardada
              </h5>
              <button type="button" className="btn-close btn-close-white" aria-label="Cerrar" onClick={() => setSettingsSavedModal(false)} />
            </div>
            <div className="modal-body-custom">
              <p>El cambio fue realizado correctamente.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-success" onClick={() => setSettingsSavedModal(false)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
      <section className="management-grid">
        {message && <div className={`alert alert-${messageType} management-message`}>{message}</div>}

        <article className="management-card">
          <h2>Servicios</h2>
          <form onSubmit={saveService} className="stack-form">
            <input value={serviceForm.nombre} onChange={(event) => setServiceForm({ ...serviceForm, nombre: event.target.value })} placeholder="Nombre" required />
            <input type="number" min="0" step="0.01" value={serviceForm.precio} onChange={(event) => setServiceForm({ ...serviceForm, precio: event.target.value })} placeholder="Precio" required />
            <input value={serviceForm.descripcion} onChange={(event) => setServiceForm({ ...serviceForm, descripcion: event.target.value })} placeholder="Descripcion corta" />
            <label className="check-row">
              <input type="checkbox" checked={serviceForm.requiere_separacion} onChange={(event) => setServiceForm({ ...serviceForm, requiere_separacion: event.target.checked })} />
              Requiere separacion skincare
            </label>
            <select value={serviceForm.estado} onChange={(event) => setServiceForm({ ...serviceForm, estado: event.target.value })}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button type="submit">{serviceForm.id ? "Actualizar" : "Crear"} servicio</button>
          </form>
          <div className="mini-list">
            {services.map((service) => (
              <button type="button" key={service.id} onClick={() => setServiceForm({ ...service, requiere_separacion: Boolean(service.requiere_separacion) })}>
                {service.nombre} - Q{Number(service.precio).toFixed(2)} - {service.estado}
              </button>
            ))}
          </div>
        </article>

        <article className="management-card">
          <h2>Usuarios y barberos</h2>
          <form onSubmit={saveUser} className="stack-form">
            <input value={userForm.nombre} onChange={(event) => setUserForm({ ...userForm, nombre: event.target.value })} placeholder="Nombre completo" required />
            <input value={userForm.usuario} onChange={(event) => setUserForm({ ...userForm, usuario: event.target.value })} placeholder="Usuario de acceso" required />
            <select value={userForm.rol} onChange={(event) => setUserForm({ ...userForm, rol: event.target.value, id_barbero: event.target.value === "Admin" ? "" : userForm.id_barbero })}>
              <option value="Admin">Administrador</option>
              <option value="Barbero">Barbero</option>
            </select>
            {userForm.rol === "Barbero" && (
              <>
                {userForm.id && (
                  <select value={userForm.id_barbero || ""} onChange={(event) => setUserForm({ ...userForm, id_barbero: event.target.value })}>
                    <option value="">Crear nuevo perfil de barbero</option>
                    {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nombre}</option>)}
                  </select>
                )}
                <input value={userForm.telefono} onChange={(event) => setUserForm({ ...userForm, telefono: event.target.value })} placeholder="Telefono del barbero" />
                <textarea value={userForm.descripcion} onChange={(event) => setUserForm({ ...userForm, descripcion: event.target.value })} placeholder="Descripcion profesional visible en el inicio" rows="4" />
              </>
            )}
            <select value={userForm.estado} onChange={(event) => setUserForm({ ...userForm, estado: event.target.value })}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder={userForm.id ? "Nueva contrasena (opcional)" : "Contrasena inicial"} required={!userForm.id} />
            <input type="password" value={userForm.confirmPassword} onChange={(event) => setUserForm({ ...userForm, confirmPassword: event.target.value })} placeholder="Confirmar contrasena" required={!userForm.id || Boolean(userForm.password)} />
            <div className="inline-actions">
              <button type="submit">{userForm.id ? "Actualizar" : "Crear"} usuario</button>
              {userForm.id && <button type="button" onClick={() => setUserForm(EMPTY_USER)}>Nuevo usuario</button>}
            </div>
          </form>
          <div className="mini-list">
            {users.map((user) => (
              <button type="button" key={user.id} onClick={() => setUserForm({ id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol, id_barbero: user.id_barbero ? String(user.id_barbero) : "", telefono: user.barber_telefono || "", descripcion: user.barber_descripcion || "", estado: user.estado, password: "", confirmPassword: "" })}>
                {user.usuario} - {user.rol}{user.barbero ? ` (${user.barbero})` : ""} - {user.estado}
              </button>
            ))}
          </div>
        </article>

        <article className="management-card management-card-wide">
          <h2>Galeria de fotos</h2>
          {/* Administracion de fotos: permite agregar, editar y borrar imagenes usadas por los carruseles del inicio. */}
          <form onSubmit={saveGallery} className="stack-form gallery-form">
            <input value={galleryForm.titulo} onChange={(event) => setGalleryForm({ ...galleryForm, titulo: event.target.value })} placeholder="Titulo de la foto" required />
            <input value={galleryForm.descripcion} onChange={(event) => setGalleryForm({ ...galleryForm, descripcion: event.target.value })} placeholder="Descripcion corta" />
            <input value={galleryForm.image_url} onChange={(event) => setGalleryForm({ ...galleryForm, image_url: event.target.value })} placeholder="URL opcional, por ejemplo /fotos/work1.jpg" />
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setGalleryForm({ ...galleryForm, file: event.target.files?.[0] || null })} />
            <label className="check-row">
              <input type="checkbox" checked={galleryForm.activo} onChange={(event) => setGalleryForm({ ...galleryForm, activo: event.target.checked })} />
              Visible en carruseles
            </label>
            <div className="inline-actions">
              <button type="submit">{galleryForm.id ? "Actualizar foto" : "Agregar foto"}</button>
              {galleryForm.id && <button type="button" onClick={() => setGalleryForm(EMPTY_GALLERY)}>Nueva foto</button>}
            </div>
          </form>
          <div className="gallery-admin-grid">
            {gallery.map((photo) => (
              <article className="gallery-admin-card" key={photo.id}>
                <img src={photo.image_url?.startsWith("/api/") ? `${API_ORIGIN}${photo.image_url}` : photo.image_url} alt={photo.titulo} />
                <div>
                  <h3>{photo.titulo}</h3>
                  <p>{photo.descripcion || "Sin descripcion"}</p>
                  <span>{photo.activo ? "Visible" : "Oculta"}</span>
                </div>
                <div className="gallery-admin-actions">
                  <button type="button" onClick={() => setGalleryForm({ ...photo, file: null })}>Editar</button>
                  <button type="button" className="danger-lite" onClick={() => removeGalleryPhoto(photo.id)}>Borrar</button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="management-card">
          <h2>Dias bloqueados</h2>
          <form onSubmit={saveBlock} className="stack-form">
            <input type="date" value={blockForm.fecha} onChange={(event) => setBlockForm({ ...blockForm, fecha: event.target.value })} required />
            <select value={blockForm.id_barbero} onChange={(event) => setBlockForm({ ...blockForm, id_barbero: event.target.value })}>
              <option value="">Toda la barberia</option>
              {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nombre}</option>)}
            </select>
            <input value={blockForm.motivo} onChange={(event) => setBlockForm({ ...blockForm, motivo: event.target.value })} placeholder="Motivo" />
            <button type="submit">Bloquear dia</button>
          </form>
          <div className="mini-list">
            {blockedDays.map((day) => (
              <button type="button" key={day.id} onClick={async () => { await deleteBlockedDay(day.id); await loadAll(); }}>
                {normalizeDate(day.fecha)} - {day.barbero ? `Solo ${day.barbero}` : "Toda la barberia"} - quitar
              </button>
            ))}
          </div>
        </article>

        <article className="management-card management-card-wide">
          <h2>Horarios</h2>
          <div className="schedule-toolbar">
            <select value={scheduleBarberId} onChange={async (event) => { setScheduleBarberId(event.target.value); await loadSchedules(event.target.value); }}>
              {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nombre}</option>)}
            </select>
            <button type="button" onClick={() => setScheduleRows([...scheduleRows, { dia_semana: 1, hora_inicio: "09:00", hora_fin: "09:30", activo: true }])}>Agregar franja</button>
            <button type="button" onClick={() => setScheduleRows(DEFAULT_SCHEDULE_ROWS)}>Horario base</button>
          </div>
          <div className="schedule-editor">
            {scheduleRows.map((row, index) => (
              <div className="schedule-row" key={`${row.id || "new"}-${index}`}>
                <select value={row.dia_semana} onChange={(event) => updateScheduleRow(index, "dia_semana", Number(event.target.value))}>
                  {DAY_NAMES.slice(1).map((day, dayIndex) => <option key={day} value={dayIndex + 1}>{day}</option>)}
                </select>
                <input type="time" step="1800" value={row.hora_inicio} onChange={(event) => updateScheduleRow(index, "hora_inicio", event.target.value)} />
                <input type="time" step="1800" value={row.hora_fin} onChange={(event) => updateScheduleRow(index, "hora_fin", event.target.value)} />
                <label className="check-row compact">
                  <input type="checkbox" checked={Boolean(row.activo)} onChange={(event) => updateScheduleRow(index, "activo", event.target.checked)} />
                  Activo
                </label>
                <button type="button" className="danger-lite" onClick={() => setScheduleRows(scheduleRows.filter((_, rowIndex) => rowIndex !== index))}>Quitar</button>
              </div>
            ))}
          </div>
          <div className="schedule-actions">
            <button type="button" onClick={() => saveSchedules(false)}>Guardar barbero</button>
            <button type="button" onClick={() => saveSchedules(true)}>Aplicar a todos</button>
          </div>
        </article>

        <article className="management-card">
          <h2>Clientes</h2>
          <form onSubmit={searchClients} className="stack-form">
            <input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar por nombre o telefono" />
            <button type="submit">Buscar clientes</button>
          </form>
          <div className="mini-list">
            {clients.map((client) => (
              <button type="button" key={client.id} onClick={() => selectClient(client)}>
                {client.nombre} {client.apellido || ""} - {client.telefono} - {client.total_citas} citas - {client.strikes || 0} faltas
              </button>
            ))}
          </div>
          {selectedClient && (
            <div className="client-history">
              <h3>{selectedClient.nombre} {selectedClient.apellido || ""}</h3>
              <p>{selectedClient.telefono} - {selectedClient.strikes || 0} faltas</p>
              {clientHistory.length === 0 ? (
                <p>Sin historial de citas.</p>
              ) : (
                clientHistory.map((item) => (
                  <p key={item.id}>
                    {normalizeDate(item.fecha)} {item.hora} - {item.barbero} - {item.servicios || "Sin servicios"} - {item.estado}
                  </p>
                ))
              )}
            </div>
          )}
        </article>

        <article className="management-card">
          <h2>Configuracion</h2>
          <form onSubmit={saveSettings} className="stack-form">
            {[
              "facebook_followers",
              "instagram_followers",
              "whatsapp_followers",
              "tiktok_followers",
              "stats_clients",
              "stats_years",
              "stats_styles",
              "telefono_barberia",
              "horario_general",
              "recordatorio_horas_antes",
              "social_facebook_url",
              "social_instagram_url",
              "social_whatsapp_url",
              "location_map_embed_url",
              "location_google_maps_url",
              "location_waze_url",
              "location_address",
            ].map((key) => (
              <label key={key}>
                {key}
                <input value={settings[key] || ""} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} />
              </label>
            ))}
            <button type="submit">Guardar configuracion</button>
          </form>
        </article>
      </section>
    </main>
  );
}
