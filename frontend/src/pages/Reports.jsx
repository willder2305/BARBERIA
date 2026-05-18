import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import PageHeader from "../components/PageHeader.jsx";
import { getReportSummary, reportExportUrl, reportPdfUrl } from "../services/api.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Construye los datos para la grafica de barras mensual.
function buildBarData(monthly) {
  return {
    labels: monthly.map((item) => item.mes),
    datasets: [
      {
        label: "Reservas Atendidas",
        data: monthly.map((item) => Number(item.atendidas || item.completadas || 0)),
        backgroundColor: "#00ffaa",
      },
      {
        label: "No Shows",
        data: monthly.map((item) => Number(item.no_show || 0)),
        backgroundColor: "#ff5555",
      },
    ],
  };
}

// Construye los datos para la grafica circular por estado.
function buildDoughnutData(summary) {
  return {
    labels: ["Confirmadas", "Atendidas", "Canceladas", "No Show"],
    datasets: [
      {
        data: [summary.reservasConfirmadas, summary.reservasCompletadas, summary.reservasCanceladas, summary.reservasNoShow],
        backgroundColor: ["#00bfff", "#00ff80", "#ffb000", "#ff5555"],
      },
    ],
  };
}

// Renderiza el modulo de reportes basado en datos reales de reservas.
export default function Reports() {
  const [summary, setSummary] = useState({
    totalReservas: 0,
    reservasCompletadas: 0,
    reservasConfirmadas: 0,
    reservasCanceladas: 0,
    reservasNoShow: 0,
    ingresosTotales: 0,
    ingresosProductos: 0,
    mensual: [],
    porBarbero: [],
    porServicio: [],
    clientesFrecuentes: [],
    stockBajo: [],
  });

  // Carga el resumen estadistico desde Flask.
  async function loadSummary() {
    const data = await getReportSummary();
    setSummary(data);
  }

  // Carga reportes al montar la pantalla.
  useEffect(() => {
    loadSummary().catch(console.error);
  }, []);

  return (
    <main className="reports-page">
      <PageHeader title="Reportes del Sistema" subtitle="Consulta estadísticas de reservas, desempeño e ingresos" backTo="/admin" />
      <section className="contenedor">
        <section className="resumen">
          <article className="metric-card"><h3>Reservas Totales</h3><p>{summary.totalReservas}</p></article>
          <article className="metric-card"><h3>Confirmadas</h3><p>{summary.reservasConfirmadas}</p></article>
          <article className="metric-card"><h3>Atendidas</h3><p>{summary.reservasCompletadas}</p></article>
          <article className="metric-card"><h3>Canceladas</h3><p>{summary.reservasCanceladas}</p></article>
          <article className="metric-card"><h3>No Show</h3><p>{summary.reservasNoShow}</p></article>
          <article className="metric-card"><h3>Ingresos Servicios</h3><p>Q{Number(summary.ingresosTotales).toFixed(2)}</p></article>
          <article className="metric-card"><h3>Ventas Productos</h3><p>Q{Number(summary.ingresosProductos).toFixed(2)}</p></article>
        </section>
        <section className="graficas">
          <h2>Gráficas de Desempeño</h2>
          <div className="chart-grid">
            <div className="chart-box"><Bar data={buildBarData(summary.mensual)} options={{ plugins: { legend: { labels: { color: "#fff" } } }, scales: { x: { ticks: { color: "#fff" } }, y: { ticks: { color: "#fff" } } } }} /></div>
            <div className="chart-box"><Doughnut data={buildDoughnutData(summary)} options={{ plugins: { legend: { labels: { color: "#fff" } } } }} /></div>
          </div>
        </section>
        <section className="report-lists">
          <article>
            <h3>Servicios mas solicitados</h3>
            {summary.porServicio.map((item) => <p key={item.servicio}>{item.servicio}: {item.total}</p>)}
          </article>
          <article>
            <h3>Desempeno por barbero</h3>
            {summary.porBarbero.map((item) => <p key={item.barbero}>{item.barbero}: {item.total} citas, Q{Number(item.ingresos || 0).toFixed(2)}</p>)}
          </article>
          <article>
            <h3>Clientes frecuentes / strikes</h3>
            {summary.clientesFrecuentes.map((item) => <p key={item.telefono}>{item.nombre} ({item.telefono}): {item.total_citas} citas, {item.strikes || 0} strikes</p>)}
          </article>
          <article>
            <h3>Stock bajo</h3>
            {summary.stockBajo.length === 0 ? <p>Sin alertas.</p> : summary.stockBajo.map((item) => <p key={item.id}>{item.nombre}: {item.cantidad}/{item.stock_minimo}</p>)}
          </article>
        </section>
        <section className="acciones">
          <a className="report-export-button" href={reportExportUrl()}>Exportar Excel</a>
          <a className="report-export-button" href={reportPdfUrl()}>Generar PDF</a>
        </section>
      </section>
    </main>
  );
}
