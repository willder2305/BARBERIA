import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter.jsx";
import WorkCarousel from "../components/WorkCarousel.jsx";
import { getBarbers, getGallery, getServices, getSettings } from "../services/api.js";

const apiOrigin = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api").replace(/\/api\/?$/, "");

const fallbackWorks = ["work1.jpg", "work2.jpg", "work3.jpg", "work4.jpg", "work5.jpg", "work6.jpg", "work7.jpg", "work8.jpg", "work9.jpg"].map((image) => `/fotos/${image}`);
const blurredFallbacks = ["/fotos/fondo2.jpg", "/fotos/fondo3.jpg", "/fotos/fondo4.jpg", "/fotos/fondo5.jpg"];

const fallbackServices = [
  { id: "corte", nombre: "Corte de Cabello", precio: 40, descripcion: "Corte limpio, asesorado y terminado con detalle.", requiere_separacion: 0 },
  { id: "barba", nombre: "Tallado de Barba", precio: 20, descripcion: "Perfilado de barba con lineas definidas.", requiere_separacion: 0 },
  { id: "combo", nombre: "Corte + Barba", precio: 60, descripcion: "Servicio combinado para una imagen completa.", requiere_separacion: 0 },
  { id: "skin", nombre: "Skin Care", precio: 25, descripcion: "Limpieza facial con separacion especial de agenda.", requiere_separacion: 1 },
];

const fallbackBarbers = [
  { id: 1, nombre: "Luis", descripcion: "Especialista en cortes modernos, degradados limpios y acabados detallados para un estilo fresco." },
  { id: 2, nombre: "Douglas", descripcion: "Barbero enfocado en barba, perfilado clasico y asesoria personalizada para cada cliente." },
];

const amenities = [
  { title: "Bebidas", icon: "fa-champagne-glasses" },
  { title: "Snacks", icon: "fa-cookie-bite" },
  { title: "Videojuegos", icon: "fa-gamepad" },
  { title: "Lavado de Cabello", icon: "fa-water" },
  { title: "Materiales Premium", icon: "fa-spa" },
  { title: "Zona de Confort", icon: "fa-chair" },
  { title: "Entretenimiento", icon: "fa-tv" },
  { title: "Ambiente Musical", icon: "fa-music" },
  { title: "Atencion Personalizada", icon: "fa-user-tie" },
];

/* CONFIGURACION DE REDES SOCIALES:
   Cambiar estos enlaces por los enlaces oficiales del negocio.
   Facebook: colocar aqui el enlace de la pagina oficial.
   Instagram: colocar aqui el enlace del perfil oficial.
   WhatsApp: colocar aqui el numero en formato internacional dentro de wa.me.
*/
const defaultSocialLinks = {
  facebook: "https://www.facebook.com/share/1Nt5KyAxm3/",
  instagram: "https://www.instagram.com/wichos_barbershop29?igsh=MWcwNnlqajVoZjFlbA==",
  whatsapp: "https://wa.me/50246700501",
};

/* CONFIGURACION DE UBICACION:
   Cambiar mapEmbedUrl por la URL embebida de Google Maps.
   Cambiar googleMapsUrl por el enlace directo de Google Maps.
   Cambiar wazeUrl por el enlace directo de Waze.
   Cambiar address por la direccion textual oficial del negocio.
*/
const defaultLocationConfig = {
  mapEmbedUrl: "https://www.google.com/maps?q=15.3115042,-91.4783088&z=17&output=embed",
  googleMapsUrl: "https://www.google.com/maps/place/Wicho%27s+Barbershop/@15.3115042,-91.4783088,17z/data=!3m1!4b1!4m6!3m5!1s0x858c15986e09fe0f:0xb0790cf30245b04e!8m2!3d15.3115042!4d-91.4783088!16s%2Fg%2F11vsppxdnj",
  wazeUrl: "https://waze.com/ul?ll=15.3115042%2C-91.4783088&navigate=yes&zoom=17",
  address: "Wicho's Barbershop, Huehuetenango, Guatemala",
};

const defaultStats = {
  facebook: 150,
  instagram: 300,
  whatsapp: 58,
};

function resolveAssetUrl(value) {
  if (!value) return "";
  if (value.startsWith("/api/")) return `${apiOrigin}${value}`;
  if (value.startsWith("/fotos/")) return value;
  if (value.startsWith("http")) return value;
  return `/fotos/${value}`;
}

// Conteo animado: inicia en 0 y corre una sola vez cuando la tarjeta entra al viewport.
function AnimatedCount({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStarted(true);
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    const finalValue = Number(value) || 0;
    let frame = 0;
    const totalFrames = 42;
    const interval = window.setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      setDisplay(Math.round(finalValue * progress));
      if (progress >= 1) window.clearInterval(interval);
    }, 24);
    return () => window.clearInterval(interval);
  }, [started, value]);

  return <strong ref={ref}>{display.toLocaleString("es-GT")}{suffix}</strong>;
}

// Carrusel de fondo blurred usado en secciones esteticas sin afectar la lectura.
function BlurredCarouselSection({ className = "", images, children }) {
  const [index, setIndex] = useState(0);
  const safeImages = images.length ? images : blurredFallbacks;

  useEffect(() => {
    if (safeImages.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeImages.length);
    }, 5200);
    return () => window.clearInterval(interval);
  }, [safeImages.length]);

  return (
    <section className={`blur-carousel-section ${className}`} style={{ "--blur-bg": `url("${safeImages[index]}")` }}>
      {children}
    </section>
  );
}

export default function Home() {
  const [services, setServices] = useState(fallbackServices);
  const [barbers, setBarbers] = useState(fallbackBarbers);
  const [gallery, setGallery] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState({
    facebook_followers: "150",
    instagram_followers: "300",
    whatsapp_followers: "58",
  });

  useEffect(() => {
    Promise.all([getServices(), getBarbers(), getSettings(), getGallery()])
      .then(([serviceRows, barberRows, settingRows, galleryRows]) => {
        if (serviceRows.length) setServices(serviceRows);
        if (barberRows.length) setBarbers(barberRows);
        if (galleryRows.length) setGallery(galleryRows);
        setSettings((current) => ({
          ...current,
          ...Object.fromEntries(settingRows.map((item) => [item.clave, item.valor])),
        }));
      })
      .catch(() => {});
  }, []);

  const galleryImages = useMemo(() => {
    const fromGallery = gallery.map((item) => resolveAssetUrl(item.image_url)).filter(Boolean);
    return fromGallery.length ? fromGallery : fallbackWorks;
  }, [gallery]);

  const blurredImages = useMemo(() => {
    const selected = galleryImages.slice(0, 5);
    return selected.length ? selected : blurredFallbacks;
  }, [galleryImages]);

  const socialLinks = {
    facebook: settings.social_facebook_url || defaultSocialLinks.facebook,
    instagram: settings.social_instagram_url || defaultSocialLinks.instagram,
    whatsapp: settings.social_whatsapp_url || defaultSocialLinks.whatsapp,
  };

  const locationConfig = {
    mapEmbedUrl: settings.location_map_embed_url || defaultLocationConfig.mapEmbedUrl,
    googleMapsUrl: settings.location_google_maps_url || defaultLocationConfig.googleMapsUrl,
    wazeUrl: settings.location_waze_url || defaultLocationConfig.wazeUrl,
    address: settings.location_address || defaultLocationConfig.address,
  };

  const statCards = [
    { label: "Fans en Facebook", value: settings.facebook_followers || defaultStats.facebook, suffix: "+", icon: "fa-brands fa-facebook", brand: true },
    { label: "Seguidores en Instagram", value: settings.instagram_followers || defaultStats.instagram, suffix: "+", icon: "fa-brands fa-instagram", brand: true },
    { label: "Contactos en WhatsApp", value: settings.whatsapp_followers || defaultStats.whatsapp, suffix: "+", icon: "fa-brands fa-whatsapp", brand: true },
  ];

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      {/* Carrusel principal / hero: mantiene logo y navegacion sin tapar contenido. */}
      <header className="home-header">
        <div className="header-overlay" />
        <div className="header-top container">
          <div className="logo-box">
            <img src="/fotos/logo2.png" alt="Logo Wicho's Barber Shop" className="logo-img" />
          </div>
          {/* Navbar responsive: en movil se colapsa para evitar enlaces apretados sobre el hero. */}
          <button
            type="button"
            className="nav-toggle"
            aria-label={mobileMenuOpen ? "Cerrar menu principal" : "Abrir menu principal"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <i className={`fa-solid ${mobileMenuOpen ? "fa-xmark" : "fa-bars"}`} />
          </button>
          <nav className={`nav-buttons ${mobileMenuOpen ? "open" : ""}`} aria-label="Navegacion principal">
            <Link to="/login" onClick={closeMobileMenu}>Iniciar Sesion</Link>
            <Link to="/faq" onClick={closeMobileMenu}>FAQ</Link>
            <a href="#about" onClick={closeMobileMenu}>Sobre Nosotros</a>
            <a href="#location" onClick={closeMobileMenu}>Ubicacion</a>
            <Link to="/reservas" className="btn-cta" onClick={closeMobileMenu}>Reservar Ahora</Link>
          </nav>
        </div>
      </header>

      {/* Configuracion de redes sociales y conteo animado de estadisticas. */}
      <section className="social-section">
        <div className="container social-layout">
          <div>
            <p className="eyebrow">Redes oficiales</p>
            <h2>Wicho's Barber Shop</h2>
          </div>
          <div className="social-actions" aria-label="Enlaces a redes sociales">
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="social-link facebook">
              <i className="fab fa-facebook" /> Facebook
            </a>
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
              <i className="fab fa-instagram" /> Instagram
            </a>
            <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="social-link whatsapp">
              <i className="fab fa-whatsapp" /> WhatsApp
            </a>
          </div>
          <div className="stats-grid">
            {statCards.map((item) => (
              <article className="stat-card" key={item.label}>
                <i className={item.brand ? item.icon : `fa-solid ${item.icon}`} />
                <AnimatedCount value={item.value} suffix={item.suffix} />
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Seccion institucional con tarjetas sencillas y legibles. */}
      <section id="about" className="about-section text-center">
        <div className="container">
          <h2>Quienes Somos</h2>
          <div className="row">
            {[
              ["Mision", "Brindar una experiencia unica de barberia con servicios de calidad y trato cercano."],
              ["Vision", "Convertirnos en una barberia referente por estilo, puntualidad y confianza."],
              ["Valores", "Compromiso, excelencia, innovacion y respeto por cada cliente."],
            ].map(([title, text]) => (
              <div className="col-md-4" key={title}>
                <div className="about-card">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seccion de servicios: separada de amenidades e integrada con servicios administrables. */}
      <BlurredCarouselSection className="services-section text-center" images={blurredImages}>
        <div className="container">
          <p className="eyebrow">Servicios</p>
          <h2>Servicios del negocio</h2>
          <div className="service-card-grid">
            {services.map((service) => (
              <article className="service-card-home" key={service.id}>
                <i className={`fas ${service.requiere_separacion ? "fa-spa" : "fa-scissors"}`} />
                <h3>{service.nombre}</h3>
                <p>{service.descripcion || "Servicio profesional realizado por barberos especializados."}</p>
                <strong>Q{Number(service.precio).toFixed(2)}</strong>
              </article>
            ))}
          </div>
        </div>
      </BlurredCarouselSection>

      {/* Seccion de amenidades: beneficios del local separados de los servicios pagados. */}
      <BlurredCarouselSection className="amenities-section text-center" images={blurredImages}>
        <div className="container">
          <h2>Experiencias Premium</h2>
          <p className="section-subtitle">Porque tu visita merece mas que un simple corte</p>
          <div className="amenities-grid">
            {amenities.map((item) => (
              <article className="service-card-home amenity-card" key={item.title}>
                <i className={`fa-solid ${item.icon}`} />
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </BlurredCarouselSection>

      {/* Carrusel de trabajos: usa galeria administrable con fallback a fotos locales. */}
      <section className="work-section text-center">
        <div className="container">
          <h2>Nuestro Trabajo</h2>
          <WorkCarousel images={galleryImages} />
        </div>
      </section>

      {/* Cards de barberos: textos distintos y editables desde administracion. */}
      <BlurredCarouselSection className="barbers-section text-center" images={blurredImages}>
        <h2>Conoce a Nuestros Barbers</h2>
        <p className="section-subtitle">Profesionales apasionados por darte el mejor estilo.</p>
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
                  <p>{barber.descripcion || "Atiende con tecnica, detalle y asesoria personalizada."}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </BlurredCarouselSection>

      {/* Seccion de horarios: muestra dias, horas y nota de variacion por feriados. */}
      <section className="schedule-section">
        <div className="container text-center">
          <p className="eyebrow dark">Agenda</p>
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
          <div className="schedule-note" role="note">
            <i className="fa-solid fa-circle-info" />
            <p>Nota: En dias feriados o festivos, el horario puede variar. Mantente atento a nuestras redes oficiales para conocer actualizaciones de atencion.</p>
          </div>
        </div>
      </section>

      {/* Mapa y ubicacion: los enlaces se cambian en locationConfig o desde configuracion admin. */}
      <section id="location" className="location-section">
        <div className="container location-grid">
          <div className="location-copy">
            <p className="eyebrow dark">Encuentranos en</p>
            <h2>{locationConfig.address}</h2>
            <p>Abre la ubicacion en tu aplicacion favorita y llega directo a tu cita.</p>
            <div className="location-actions">
              <a href={locationConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                <i className="fa-solid fa-map-location-dot" /> Abrir en Google Maps
              </a>
              <a href={locationConfig.wazeUrl} target="_blank" rel="noopener noreferrer">
                <i className="fa-brands fa-waze" /> Abrir en Waze
              </a>
            </div>
          </div>
          <div className="map-shell">
            <iframe title="Mapa de Wicho's Barber Shop" src={locationConfig.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>

      {/* CTA final con fondo blurred en carrusel y boton de reserva. */}
      <BlurredCarouselSection className="cta-section text-center" images={blurredImages}>
        <div className="container">
          <h2>Agenda tu cita ahora</h2>
          <p>Reserva en linea y asegura tu horario favorito. Rapido y sencillo.</p>
          <Link to="/reservas" className="btn-reservar">Reservar Ahora</Link>
        </div>
      </BlurredCarouselSection>

      <SiteFooter />
    </>
  );
}
