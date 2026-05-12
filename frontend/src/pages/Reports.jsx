import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import PageHeader from "../components/PageHeader.jsx";
import { getReportSummary } from "../services/api.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Construye los datos para la grafica de barras mensual.
function buildBarData(monthly) {
  return {
    labels: monthly.map((item) => item.mes),
    datasets: [
      {
        label: "Reservas Completadas",
        data: monthly.map((item) => Number(item.completadas || 0)),
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
    labels: ["Completadas", "No Show"],
    datasets: [
      {
        data: [summary.reservasCompletadas, summary.reservasNoShow],
        backgroundColor: ["#00ff80", "#ff5555"],
      },
    ],
  };
}

// Renderiza el modulo de reportes basado en datos reales de reservas.
export default function Reports() {
  const [summary, setSummary] = useState({
    totalReservas: 0,
    reservasCompletadas: 0,
    reservasNoShow: 0,
    ingresosTotales: 0,
    mensual: [],
  });

  // Carga el resumen estadistico desde Flask.
  async function loadSummary() {
    const data = await getReportSummary();
    setSummary(data);
  }

  // Exporta un CSV simple con el resumen actual.
  function exportCsv() {
    const csv = [
      "Metrica,Valor",
      `Reservas Totales,${summary.totalReservas}`,
      `Completadas,${summary.reservasCompletadas}`,
      `No Show,${summary.reservasNoShow}`,
      `Ingresos Totales,${summary.ingresosTotales}`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-barberia.csv";
    link.click();
    URL.revokeObjectURL(url);
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
          <article className="metric-card"><h3>Completadas</h3><p>{summary.reservasCompletadas}</p></article>
          <article className="metric-card"><h3>No Show</h3><p>{summary.reservasNoShow}</p></article>
          <article className="metric-card"><h3>Ingresos Totales</h3><p>Q{Number(summary.ingresosTotales).toFixed(2)}</p></article>
        </section>
        <section className="graficas">
          <h2>Gráficas de Desempeño</h2>
          <div className="chart-grid">
            <div className="chart-box"><Bar data={buildBarData(summary.mensual)} options={{ plugins: { legend: { labels: { color: "#fff" } } }, scales: { x: { ticks: { color: "#fff" } }, y: { ticks: { color: "#fff" } } } }} /></div>
            <div className="chart-box"><Doughnut data={buildDoughnutData(summary)} options={{ plugins: { legend: { labels: { color: "#fff" } } } }} /></div>
          </div>
        </section>
        <section className="acciones">
          <button type="button" onClick={exportCsv}>Exportar CSV</button>
          <button type="button" onClick={() => window.print()}>Generar PDF</button>
        </section>
      </section>
    </main>
  );
}
