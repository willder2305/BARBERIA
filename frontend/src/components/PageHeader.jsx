import { Link } from "react-router-dom";
import LogoutButton from "./LogoutButton.jsx";

// Muestra una cabecera interna protegida con retorno y cierre de sesion.
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
        <LogoutButton className="btn btn-outline-danger" />
      </div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
