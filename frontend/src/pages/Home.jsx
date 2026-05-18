import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter.jsx";
import WorkCarousel from "../components/WorkCarousel.jsx";
import { getBarbers, getServices, getSettings } from "../services/api.js";

const works = ["work1.jpg", "work2.jpg", "work3.jpg", "work4.jpg", "work5.jpg", "work6.jpg", "work7.jpg", "work8.jpg", "work9.jpg"];

const fallbackServices = [
  { id: "corte", nombre: "Corte de Cabello", precio: 40, requiere_separacion: 0 },
  { id: "barba", nombre: "Tallado de Barba", precio: 20, requiere_separacion: 0 },
  { id: "skin", nombre: "Skin Care", precio: 25, requiere_separacion: 1 },
];

const fallbackBarbers = [
  { id: 1, nombre: "Wicho" },
  { id: 2, nombre: "Douglas" },
];

export default function Home() {
  const [services, setServices] = useState(fallbackServices);
  const [barbers, setBarbers] = useState(fallbackBarbers);
  const [settings, setSettings] = useState({
    facebook_followers: "150",
    instagram_followers: "300",
    tiktok_followers: "58",
  });

  useEffect(() => {
    Promise.all([getServices(), getBarbers(), getSettings()])
      .then(([serviceRows, barberRows, settingRows]) => {
        if (serviceRows.length) setServices(serviceRows);
        if (barberRows.length) setBarbers(barberRows);
        setSettings((current) => ({
          ...current,
          ...Object.fromEntries(settingRows.map((item) => [item.clave, item.valor])),
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <header className="home-header">
        <div className="header-overlay" />
        <div className="header-top container">
          <div className="logo-box">
            <img src="/fotos/logo2.png" alt="Logo Wicho's Barber Shop" className="logo-img" />
          </div>
          <nav className="nav-buttons">
            <Link to="/login">Iniciar Sesion</Link>
            <Link to="/faq">FAQ</Link>
            <a href="#about">Sobre Nosotros</a>
            <Link to="/reservas" className="btn-cta">Reservar Ahora</Link>
          </nav>
        </div>
      </header>

      <section className="social-section">
        <div className="container text-center">
          <div className="row justify-content-center">
            <div className="col-md-4 social-box">
              <i className="fab fa-facebook fa-3x" />
              <p className="social-text">Fans en Facebook</p>
              <h3 className="count">{settings.facebook_followers}</h3>
            </div>
            <div className="col-md-4 social-box">
              <i className="fab fa-instagram fa-3x" />
              <p className="social-text">Seguidores en Instagram</p>
              <h3 className="count">{settings.instagram_followers}</h3>
            </div>
            <div className="col-md-4 social-box">
              <i className="fab fa-tiktok fa-3x" />
              <p className="social-text">Seguidores en TikTok</p>
              <h3 className="count">{settings.tiktok_followers}</h3>
            </div>
          </div>
          <p className="follow-text mt-4">Siguenos en nuestras redes sociales</p>
        </div>
      </section>

      <section id="about" className="about-section container text-center">
        <h2>Quienes Somos</h2>
        <div className="row">
          {[
            ["Mision", "Brindar una experiencia unica de barberia de lujo con servicios de calidad."],
            ["Vision", "Convertirnos en la barberia mas reconocida de la region."],
            ["Valores", "Compromiso, excelencia, innovacion y confianza."],
          ].map(([title, text]) => (
            <div className="col-md-4" key={title}>
              <div className="about-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="experiencias-section text-center bg-carrusel">
        <h2>Servicios Activos</h2>
        <p className="subtitle">Precios configurados desde el panel administrador</p>
        <div className="container experiencias-grid">
          {services.map((service) => (
            <div className="experiencia" key={service.id}>
              <i className={`fas ${service.requiere_separacion ? "fa-spa" : "fa-scissors"} fa-2x`} />
              <p>{service.nombre}</p>
              <strong>Q{Number(service.precio).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="work-section text-center">
        <div className="container">
          <h2>Nuestro Trabajo</h2>
          <WorkCarousel images={works} />
        </div>
      </section>

      <section className="barbers-section text-center bg-carrusel">
        <h2>Conoce a Nuestros Barbers</h2>
        <p className="section-subtitle">Profesionales apasionados por darte el mejor estilo</p>
        <div className="barbers-container">
          {barbers.map((barber) => (
            <div className="flip-card" key={barber.id}>
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <img src={Number(barber.id) === 1 ? "/fotos/1.jpg" : "/fotos/2.jpg"} alt={barber.nombre} className="barber-img" />
                  <h3>{barber.nombre}</h3>
                </div>
                <div className="flip-card-back">
                  <h3>{barber.nombre}</h3>
                  <p>Atiende todos los servicios activos de la barberia.</p>
                  <p>Cada cliente debe salir con un estilo que lo haga sentir unico.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="schedule-section">
        <div className="container text-center">
          <h2>Horarios</h2>
          <div className="schedule-grid">
            <div className="schedule-card">
              <h3>Lunes - Sabado</h3>
              <p>9:00 am - 1:00 pm</p>
              <p>2:00 pm - 7:00 pm</p>
            </div>
            <div className="schedule-card closed">
              <h3>Domingo</h3>
              <p className="cerrado">CERRADO</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section text-center bg-carrusel">
        <div className="container">
          <h2>Agenda tu cita ahora</h2>
          <p>Reserva en linea y asegura tu horario favorito. Rapido y sencillo.</p>
          <Link to="/reservas" className="btn-reservar">Reservar Ahora</Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
