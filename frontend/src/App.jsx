import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import BarberDashboard from "./pages/BarberDashboard.jsx";
import FAQ from "./pages/FAQ.jsx";
import Home from "./pages/Home.jsx";
import Inventory from "./pages/Inventory.jsx";
import Login from "./pages/Login.jsx";
import Reports from "./pages/Reports.jsx";
import Reservations from "./pages/Reservations.jsx";

// Define las rutas principales de la aplicacion React.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/reservas" element={<Reservations />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/barberos/luis" element={<BarberDashboard barberName="Luis" />} />
        <Route path="/barberos/douglas" element={<BarberDashboard barberName="Douglas" />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
