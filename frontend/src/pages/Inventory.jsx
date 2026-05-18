import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { createInventoryItem, deleteInventoryItem, getInventory, registerInventorySale, updateInventoryItem } from "../services/api.js";

const EMPTY_FORM = {
  id: "",
  nombre: "",
  descripcion: "",
  cantidad: "",
  unidad: "",
  precio_venta: "",
  stock_minimo: "",
  estado: "Activo",
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [saleQty, setSaleQty] = useState({});

  async function loadInventory() {
    const data = await getInventory();
    setItems(data);
  }

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const payload = {
      ...form,
      cantidad: Number(form.cantidad),
      precio_venta: Number(form.precio_venta),
      stock_minimo: Number(form.stock_minimo),
    };
    if (form.id) {
      await updateInventoryItem(form.id, payload);
      setMessage("Producto actualizado.");
    } else {
      await createInventoryItem(payload);
      setMessage("Producto creado.");
    }
    setForm(EMPTY_FORM);
    await loadInventory();
  }

  function editItem(item) {
    setForm({
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      unidad: item.unidad,
      precio_venta: item.precio_venta,
      stock_minimo: item.stock_minimo,
      estado: item.estado,
    });
  }

  async function deactivateItem(id) {
    if (!window.confirm("Desactivar producto sin borrar historial?")) return;
    await deleteInventoryItem(id);
    await loadInventory();
  }

  async function sellItem(id) {
    const cantidad = Number(saleQty[id] || 0);
    if (cantidad <= 0) {
      setMessage("Ingresa una cantidad vendida valida.");
      return;
    }
    await registerInventorySale(id, cantidad);
    setMessage("Venta registrada y stock actualizado.");
    setSaleQty({ ...saleQty, [id]: "" });
    await loadInventory();
  }

  useEffect(() => {
    loadInventory().catch(console.error);
  }, []);

  return (
    <main className="inventory-page">
      <PageHeader title="Control de Inventario" subtitle="Gestiona productos, ventas y alertas de stock bajo" backTo="/admin" />
      <section className="contenedor">
        <section className="formulario">
          <h2>Agregar o Modificar Producto</h2>
          {message && <div className="alert alert-success">{message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="inputs inventory-inputs">
              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre..." required />
              <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripcion..." />
              <input name="cantidad" type="number" value={form.cantidad} onChange={handleChange} placeholder="Stock..." min="0" required />
              <input name="unidad" value={form.unidad} onChange={handleChange} placeholder="Unidad..." />
              <input name="precio_venta" type="number" step="0.01" value={form.precio_venta} onChange={handleChange} placeholder="Precio venta..." min="0" />
              <input name="stock_minimo" type="number" value={form.stock_minimo} onChange={handleChange} placeholder="Stock minimo..." min="0" />
              <select name="estado" value={form.estado} onChange={handleChange}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div className="acciones-form">
              <button type="submit">Guardar</button>
              <button type="button" onClick={() => setForm(EMPTY_FORM)}>Cancelar</button>
            </div>
          </form>
        </section>
        <section className="tabla">
          <h2>Inventario Actual</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Producto</th><th>Stock</th><th>Precio</th><th>Estado</th><th>Venta</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={item.stock_bajo ? "low-stock-row" : ""}>
                    <td>{item.nombre}<small>{item.descripcion}</small></td>
                    <td>{item.cantidad} {item.unidad}<small>Min: {item.stock_minimo}</small></td>
                    <td>Q{Number(item.precio_venta).toFixed(2)}</td>
                    <td>{item.estado}{item.stock_bajo && <span className="stock-alert">Stock bajo</span>}</td>
                    <td>
                      <input className="sale-input" type="number" min="1" value={saleQty[item.id] || ""} onChange={(event) => setSaleQty({ ...saleQty, [item.id]: event.target.value })} />
                      <button type="button" onClick={() => sellItem(item.id)}>Vender</button>
                    </td>
                    <td>
                      <button type="button" onClick={() => editItem(item)}>Editar</button>
                      <button type="button" onClick={() => deactivateItem(item.id)}>Desactivar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
