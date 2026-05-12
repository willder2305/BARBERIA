// Renderiza el pie de pagina comun del sitio.
export default function SiteFooter() {
  return (
    <footer className="footer-section text-center">
      <div className="container">
        <p>
          Copyright © 2025 <span className="brand">Wicho's Barber Shop</span> |
          Desarrollado por <a href="#" className="author">Luis Mérida</a>
        </p>
        <p className="rights">Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
