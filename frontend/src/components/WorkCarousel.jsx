import { useEffect, useMemo, useRef } from "react";

const fallbackImages = ["/fotos/work1.jpg", "/fotos/work2.jpg", "/fotos/work3.jpg"];

function normalizeImage(image) {
  if (typeof image === "string") return image.startsWith("/") || image.startsWith("http") ? image : `/fotos/${image}`;
  return image?.image_url || image?.url || "";
}

// Carrusel reutilizable de trabajos: autoplay, controles estables y fallback si no hay imagenes.
export default function WorkCarousel({ images = [] }) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const lockedRef = useRef(false);
  const safeImages = useMemo(() => {
    const normalized = images.map(normalizeImage).filter(Boolean);
    return normalized.length ? normalized : fallbackImages;
  }, [images]);

  // Desplaza el carrusel evitando dobles clics que dejen el estado visual inestable.
  function scrollCarousel(direction) {
    if (!trackRef.current || lockedRef.current) return;
    lockedRef.current = true;
    const track = trackRef.current;
    const distance = Math.max(track.clientWidth * 0.82, 220);
    const nextLeft = Math.max(0, Math.min(track.scrollLeft + direction * distance, track.scrollWidth - track.clientWidth));
    track.scrollTo({ left: nextLeft, behavior: "smooth" });
    window.setTimeout(() => {
      lockedRef.current = false;
    }, 420);
  }

  // Pausa o reactiva el avance automatico durante interacciones del usuario.
  function setCarouselPaused(value) {
    pausedRef.current = value;
  }

  // Autoplay con reinicio controlado al llegar al final.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (pausedRef.current || !trackRef.current) return;
      const track = trackRef.current;
      const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      if (nearEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      scrollCarousel(1);
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, [safeImages.length]);

  // Inclinacion 3D suave de las cards, desactivable en tactil al no recibir pointer move.
  function handlePointerMove(event) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
  }

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
      <button type="button" className="work-carousel-btn prev" aria-label="Ver trabajos anteriores" onClick={() => scrollCarousel(-1)}>
        <i className="fa-solid fa-chevron-left" />
      </button>

      <div className="work-carousel-track" ref={trackRef}>
        {safeImages.map((image, index) => (
          <article className="work-carousel-card" key={`${image}-${index}`} onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
            <img src={image} alt={`Trabajo de barberia ${index + 1}`} loading="lazy" />
          </article>
        ))}
      </div>

      <button type="button" className="work-carousel-btn next" aria-label="Ver siguientes trabajos" onClick={() => scrollCarousel(1)}>
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}
