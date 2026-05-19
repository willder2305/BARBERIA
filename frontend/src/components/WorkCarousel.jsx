import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const fallbackImages = ["/fotos/work1.jpg", "/fotos/work2.jpg", "/fotos/work3.jpg"];

function normalizeImage(image) {
  if (typeof image === "string") return image.startsWith("/") || image.startsWith("http") ? image : `/fotos/${image}`;
  return image?.image_url || image?.url || "";
}

// Carrusel reutilizable de trabajos: infinito, automatico y con navegacion por zonas laterales.
export default function WorkCarousel({ images = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const directionRef = useRef(1);
  const hoverDirectionRef = useRef(0);
  const safeImages = useMemo(() => {
    const normalized = images.map(normalizeImage).filter(Boolean);
    return normalized.length ? normalized : fallbackImages;
  }, [images]);

  const moveCarousel = useCallback(
    (direction = 1) => {
      if (!safeImages.length) return;
      directionRef.current = direction;
      setActiveIndex((current) => (current + direction + safeImages.length) % safeImages.length);
    },
    [safeImages.length],
  );

  const visibleImages = useMemo(() => {
    return [-1, 0, 1].map((position) => {
      const index = (activeIndex + position + safeImages.length) % safeImages.length;
      return {
        image: safeImages[index],
        index,
        position,
      };
    });
  }, [activeIndex, safeImages]);

  // Autoplay infinito; conserva la ultima direccion marcada por el usuario.
  useEffect(() => {
    if (safeImages.length <= 1) return undefined;
    const intervalId = window.setInterval(() => {
      moveCarousel(directionRef.current);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [moveCarousel, safeImages.length]);

  // Si el cursor entra en los laterales, avanza hacia ese lado sin mostrar controles.
  useEffect(() => {
    if (safeImages.length <= 1) return undefined;
    const intervalId = window.setInterval(() => {
      if (!hoverDirectionRef.current) return;
      moveCarousel(hoverDirectionRef.current);
    }, 760);

    return () => window.clearInterval(intervalId);
  }, [moveCarousel, safeImages.length]);

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const sideZone = rect.width * 0.28;

    if (pointerX < sideZone) {
      hoverDirectionRef.current = -1;
      directionRef.current = -1;
      return;
    }

    if (pointerX > rect.width - sideZone) {
      hoverDirectionRef.current = 1;
      directionRef.current = 1;
      return;
    }

    hoverDirectionRef.current = 0;
  }

  function resetHoverDirection() {
    hoverDirectionRef.current = 0;
  }

  return (
    <div
      className="work-carousel-shell"
      aria-label="Carrusel de trabajos realizados"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetHoverDirection}
    >
      <div className="work-carousel-track">
        {visibleImages.map(({ image, index, position }) => (
          <article
            className={`work-carousel-card ${position === 0 ? "is-center" : `is-side ${position < 0 ? "is-left" : "is-right"}`}`}
            key={`${image}-${index}-${position}`}
          >
            <img src={image} alt={`Trabajo de barberia ${index + 1}`} loading={position === 0 ? "eager" : "lazy"} />
          </article>
        ))}
      </div>
    </div>
  );
}
