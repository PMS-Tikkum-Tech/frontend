"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    src: "/1.jpeg",
    alt: "Hunian KIKOST dengan area kamar yang nyaman",
  },
  {
    src: "/2.jpeg",
    alt: "Interior hunian KIKOST yang rapi dan modern",
  },
  {
    src: "/3.jpeg",
    alt: "Fasilitas hunian KIKOST untuk aktivitas harian",
  },
];

type HomeHeroCarouselProps = {
  imageClassName?: string;
};

export default function HomeHeroCarousel({
  imageClassName = "object-center",
}: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const shiftSlide = (direction: -1 | 1) => {
    setActiveIndex((current) => {
      return (current + direction + slides.length) % slides.length;
    });
  };

  return (
    <div
      className="absolute inset-0 z-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={index === activeIndex ? slide.alt : ""}
          aria-hidden={index !== activeIndex}
          loading={index === 0 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "auto"}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          } ${imageClassName}`}
        />
      ))}

      <button
        type="button"
        onClick={() => shiftSlide(-1)}
        className="absolute left-3 top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/85 text-slate-900 shadow-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/80"
        aria-label="Foto sebelumnya"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => shiftSlide(1)}
        className="absolute right-3 top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/85 text-slate-900 shadow-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/80"
        aria-label="Foto berikutnya"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/40 bg-slate-950/30 px-2.5 py-2 backdrop-blur">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex
                ? "w-7 bg-white"
                : "w-2.5 bg-white/55 hover:bg-white/80"
            }`}
            aria-label={`Tampilkan foto ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
