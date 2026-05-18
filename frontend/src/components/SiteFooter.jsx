// Footer comun: conserva copyright y credito del desarrollador sin tapar contenido.
export default function SiteFooter() {
  return (
    <footer className="footer-section text-center">
      <div className="container">
        <p>
          Copyright © 2025 <span className="brand">Wicho's Barber Shop</span> |
          Desarrollado por <a href="#" className="author" aria-label="Desarrollado por Luis Merida">Luis Mérida</a>
        </p>
        <p className="rights">Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
