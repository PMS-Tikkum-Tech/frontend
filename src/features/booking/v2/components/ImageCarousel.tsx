"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type TouchEvent } from "react";
import SafeBookingImage from "./SafeBookingImage";

export default function ImageCarousel({
  images,
  alt,
  className = "",
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const safeImages = images.length > 0 ? images : ["/bg-1200.webp"];
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeImage = safeImages[activeIndex] || safeImages[0];
  const canSlide = safeImages.length > 1;

  const shiftImage = (direction: -1 | 1) => {
    if (!canSlide) {
      return;
    }

    setActiveIndex((current) => {
      return (current + direction + safeImages.length) % safeImages.length;
    });
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(delta) < 40) {
      return;
    }

    shiftImage(delta > 0 ? -1 : 1);
  };

  return (
    <div
      className={`group relative overflow-hidden bg-slate-100 ${className}`}
      onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
      onTouchEnd={handleTouchEnd}
    >
      <SafeBookingImage
        src={activeImage}
        alt={alt}
        className="object-cover transition duration-300 group-hover:scale-[1.025]"
      />

      {canSlide ? (
        <>
          <button
            type="button"
            aria-label="Foto sebelumnya"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              shiftImage(-1);
            }}
            className="absolute left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-sm transition hover:scale-105 group-hover:inline-flex"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Foto berikutnya"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              shiftImage(1);
            }}
            className="absolute right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-sm transition hover:scale-105 group-hover:inline-flex"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {safeImages.slice(0, 5).map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`Buka foto ${index + 1}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveIndex(index);
                }}
                className={`h-1.5 rounded-full transition ${
                  index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
