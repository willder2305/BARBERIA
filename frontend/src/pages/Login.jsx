import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, login } from "../services/api.js";

function dashboardFor(user) {
  if (user?.rol === "Admin") return "/admin";
  if (user?.rol === "Barbero") return `/barberos/${user.usuario}`;
  return "";
}

// Renderiza y procesa el formulario de inicio de sesion.
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: "", pass: "" });
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // Si ya existe sesion valida, evita mostrar login y redirige al panel seguro.
  useEffect(() => {
    let alive = true;
    getMe()
      .then((user) => {
        if (alive) navigate(dashboardFor(user), { replace: true });
      })
      .catch(() => {
        if (alive) setCheckingSession(false);
      });
    return () => {
      alive = false;
    };
  }, [navigate]);

  // Actualiza el estado local cuando el usuario escribe.
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Envia credenciales a Flask y redirige al panel asignado.
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const session = await login(form);
      navigate(session.dashboard);
    } catch (err) {
      setError(err.message);
    }
  }

  if (checkingSession) {
    return (
      <main className="login-page">
        <div className="login-box">
          <p className="subtitle">Validando sesion...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-box">
        <h2><i className="fa-solid fa-scissors" /> Wicho's Barber Shop</h2>
        <p className="subtitle">Accede a tu panel</p>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3 text-start">
            <label className="form-label" htmlFor="usuario">Usuario</label>
            <input id="usuario" name="usuario" className="form-control" value={form.usuario} onChange={handleChange} required />
          </div>
          <div className="mb-3 text-start">
            <label className="form-label" htmlFor="pass">Contraseña</label>
            <input id="pass" name="pass" type="password" className="form-control" value={form.pass} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-login">Iniciar Sesión</button>
        </form>
        <p className="note mt-3">© 2025 Wicho's Barber Shop</p>
      </div>
    </main>
  );
}
