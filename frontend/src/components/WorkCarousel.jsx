import { useEffect, useRef } from "react";

// Renderiza el carrusel de trabajos con interaccion 3D al pasar el cursor.
export default function WorkCarousel({ images }) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);

  // Desplaza el carrusel hacia la izquierda o derecha.
  function scrollCarousel(direction) {
    if (!trackRef.current) return;
    const distance = trackRef.current.clientWidth * 0.82;
    trackRef.current.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  // Pausa o reactiva el avance automatico durante la interaccion del usuario.
  function setCarouselPaused(value) {
    pausedRef.current = value;
  }

  // Avanza automaticamente el carrusel cada 2 segundos.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (pausedRef.current) return;
      if (!trackRef.current) return;
      const track = trackRef.current;
      const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      if (nearEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      scrollCarousel(1);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Calcula la inclinacion 3D de la tarjeta segun la posicion del cursor.
  function handlePointerMove(event) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
  }

  // Restaura la tarjeta a su posicion neutral cuando sale el cursor.
  function resetTilt(event) {
    const card = event.currentTarget;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      className="work-carousel-shell"
      aria-label="Carrusel de trabajos realizados"
      onPointerEnter={() => setCarouselPaused(true)}
      onPointerLeave={() => setCarouselPaused(false)}
      onFocus={() => setCarouselPaused(true)}
      onBlur={() => setCarouselPaused(false)}
    >
      <button
        type="button"
        className="work-carousel-btn prev"
        aria-label="Ver trabajos anteriores"
        onClick={() => scrollCarousel(-1)}
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      <div className="work-carousel-track" ref={trackRef}>
        {images.map((image, index) => (
          <article
            className="work-carousel-card"
            key={image}
            onPointerMove={handlePointerMove}
            onPointerLeave={resetTilt}
          >
            <img src={`/fotos/${image}`} alt={`Trabajo de barberia ${index + 1}`} />
          </article>
        ))}
      </div>

      <button
        type="button"
        className="work-carousel-btn next"
        aria-label="Ver siguientes trabajos"
        onClick={() => scrollCarousel(1)}
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}
