import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { createInventoryItem, deleteInventoryItem, getInventory, updateInventoryItem } from "../services/api.js";

const EMPTY_FORM = { id: "", nombre: "", cantidad: "", unidad: "" };

// Renderiza el modulo de administracion de inventario.
export default function Inventory() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");

  // Carga los insumos desde Flask.
  async function loadInventory() {
    const data = await getInventory();
    setItems(data);
  }

  // Actualiza los campos del formulario de insumo.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Guarda un insumo nuevo o actualiza uno existente.
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const payload = { nombre: form.nombre, cantidad: Number(form.cantidad), unidad: form.unidad };
    if (form.id) {
      await updateInventoryItem(form.id, payload);
      setMessage("Insumo actualizado.");
    } else {
      await createInventoryItem(payload);
      setMessage("Insumo creado.");
    }
    setForm(EMPTY_FORM);
    await loadInventory();
  }

  // Pasa el insumo seleccionado al formulario para editar.
  function editItem(item) {
    setForm({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad });
  }

  // Elimina el insumo seleccionado y recarga la tabla.
  async function removeItem(id) {
    await deleteInventoryItem(id);
    await loadInventory();
  }

  // Limpia el formulario activo.
  function cancelEdit() {
    setForm(EMPTY_FORM);
  }

  // Carga inventario al abrir la pantalla.
  useEffect(() => {
    loadInventory().catch(console.error);
  }, []);

  return (
    <main className="inventory-page">
      <PageHeader title="Control de Inventario" subtitle="Gestiona los insumos y materiales usados en los servicios" backTo="/admin" />
      <section className="contenedor">
        <section className="formulario">
          <h2>Agregar o Modificar Insumo</h2>
          {message && <div className="alert alert-success">{message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="inputs">
              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del insumo..." required />
              <input name="cantidad" type="number" value={form.cantidad} onChange={handleChange} placeholder="Cantidad..." min="0" required />
              <input name="unidad" value={form.unidad} onChange={handleChange} placeholder="Unidad (ej. piezas, frascos...)" />
            </div>
            <div className="acciones-form">
              <button type="submit">Guardar</button>
              <button type="button" onClick={cancelEdit}>Cancelar</button>
            </div>
          </form>
        </section>
        <section className="tabla">
          <h2>Inventario Actual</h2>
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Cantidad</th><th>Unidad</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.nombre}</td>
                  <td>{item.cantidad}</td>
                  <td>{item.unidad}</td>
                  <td>
                    <button type="button" onClick={() => editItem(item)}>Editar</button>
                    <button type="button" onClick={() => removeItem(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
