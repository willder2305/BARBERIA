import { Link } from "react-router-dom";

// Muestra una cabecera interna con boton opcional para volver.
export default function PageHeader({ title, subtitle, backTo }) {
  return (
    <header className="panel-header">
      <div className="top-bar">
        {backTo && (
          <Link to={backTo} className="btn-volver">
            ← Volver
          </Link>
        )}
        <h1>{title}</h1>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
