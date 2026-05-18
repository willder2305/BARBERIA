import { useNavigate } from "react-router-dom";
import { logout } from "../services/api.js";

// Cierra la sesion en backend y reemplaza el historial para evitar volver al panel.
export default function LogoutButton({ className = "btn btn-outline-danger" }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <button type="button" className={className} onClick={handleLogout}>
      Cerrar sesion
    </button>
  );
}
