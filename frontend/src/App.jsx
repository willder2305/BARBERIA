import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminManagement from "./pages/AdminManagement.jsx";
import BarberDashboard from "./pages/BarberDashboard.jsx";
import FAQ from "./pages/FAQ.jsx";
import Home from "./pages/Home.jsx";
import Inventory from "./pages/Inventory.jsx";
import Login from "./pages/Login.jsx";
import Reports from "./pages/Reports.jsx";
import Reservations from "./pages/Reservations.jsx";
import { getMe } from "./services/api.js";

function dashboardFor(user) {
  if (user?.rol === "Admin") return "/admin";
  if (user?.rol === "Barbero") return `/barberos/${user.usuario}`;
  return "/login";
}

function ProtectedRoute({ roles, children }) {
  const [state, setState] = useState({ loading: true, user: null, error: "" });

  useEffect(() => {
    let alive = true;
    getMe()
      .then((user) => {
        if (alive) setState({ loading: false, user, error: "" });
      })
      .catch((err) => {
        if (alive) setState({ loading: false, user: null, error: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <main className="dashboard-page auth-loading">
        <p>Validando sesion...</p>
      </main>
    );
  }

  if (!state.user) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(state.user.rol)) {
    return <Navigate to={dashboardFor(state.user)} replace />;
  }
  return children;
}

// Define las rutas principales de la aplicacion React.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/reservas" element={<Reservations />} />
        <Route path="/admin" element={<ProtectedRoute roles={["Admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/gestion" element={<ProtectedRoute roles={["Admin"]}><AdminManagement /></ProtectedRoute>} />
        <Route path="/barberos/:usuario" element={<ProtectedRoute roles={["Barbero"]}><BarberDashboard /></ProtectedRoute>} />
        <Route path="/inventario" element={<ProtectedRoute roles={["Admin"]}><Inventory /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute roles={["Admin"]}><Reports /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
