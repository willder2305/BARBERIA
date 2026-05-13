import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter.jsx";
import WorkCarousel from "../components/WorkCarousel.jsx";

const works = ["work1.jpg", "work2.jpg", "work3.jpg", "work4.jpg", "work5.jpg", "work6.jpg", "work7.jpg", "work8.jpg", "work9.jpg"];

// Renderiza la pagina publica principal de la barberia.
export default function Home() {
  return (
    <>
      <header className="home-header">
        <div className="header-overlay" />
        <div className="header-top container">
          <div className="logo-box">
            <img src="/fotos/logo2.png" alt="Logo Wicho's Barber Shop" className="logo-img" />
          </div>
          <nav className="nav-buttons">
            <Link to="/login">Iniciar Sesión</Link>
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
              <h3 className="count">150</h3>
            </div>
            <div className="col-md-4 social-box">
              <i className="fab fa-instagram fa-3x" />
              <p className="social-text">Seguidores en Instagram</p>
              <h3 className="count">300</h3>
            </div>
            <div className="col-md-4 social-box">
              <i className="fab fa-tiktok fa-3x" />
              <p className="social-text">Seguidores en TikTok</p>
              <h3 className="count">58</h3>
            </div>
          </div>
          <p className="follow-text mt-4">Síguenos en nuestras redes sociales</p>
        </div>
      </section>

      <section id="about" className="about-section container text-center">
        <h2>¿Quiénes Somos?</h2>
        <div className="row">
          {[
            ["Misión", "Brindar una experiencia única de barbería de lujo con servicios de calidad."],
            ["Visión", "Convertirnos en la barbería más reconocida de la región."],
            ["Valores", "Compromiso, excelencia, innovación y confianza."],
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
        <h2>Experiencias Premium</h2>
        <p className="subtitle">Porque tu visita merece más que un simple corte</p>
        <div className="container experiencias-grid">
          {[
            ["fa-glass-cheers", "Bebidas"],
            ["fa-cookie-bite", "Snacks"],
            ["fa-gamepad", "Videojuegos"],
            ["fa-water", "Lavado de Cabello"],
            ["fa-spa", "Materiales Premium"],
            ["fa-chair", "Zona de Confort"],
            ["fa-tv", "Entretenimiento"],
            ["fa-music", "Ambiente Musical"],
            ["fa-user-tie", "Atención Personalizada"],
          ].map(([icon, label]) => (
            <div className="experiencia" key={label}>
              <i className={`fas ${icon} fa-2x`} />
              <p>{label}</p>
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
          {[
            ["Wicho", "/fotos/1.jpg", "Experto en cortes clásicos, modernos y tallados precisos."],
            ["Douglas", "/fotos/2.jpg", "Especialista en fades, desvanecidos y arreglos de barba."],
          ].map(([name, image, text]) => (
            <div className="flip-card" key={name}>
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <img src={image} alt={name} className="barber-img" />
                  <h3>{name}</h3>
                </div>
                <div className="flip-card-back">
                  <h3>{name}</h3>
                  <p>{text}</p>
                  <p>Cada cliente debe salir con un estilo que lo haga sentir único.</p>
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
              <h3>Lunes - Sábado</h3>
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
          <p>Reserva en línea y asegura tu horario favorito. Rápido y sencillo.</p>
          <Link to="/reservas" className="btn-reservar">Reservar Ahora</Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
