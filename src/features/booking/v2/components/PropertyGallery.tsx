"use client";

import { useEffect, useState } from "react";
import { Grid2X2, X } from "lucide-react";
import ImageCarousel from "./ImageCarousel";
import SafeBookingImage from "./SafeBookingImage";

export default function PropertyGallery({
  images,
  propertyName,
}: {
  images: string[];
  propertyName: string;
}) {
  const [open, setOpen] = useState(false);
  const galleryImages = images.length > 0 ? images : ["/bg-1200.webp"];
  const displayImages = galleryImages.slice(0, 5);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <section aria-label={`Galeri ${propertyName}`}>
        <div className="md:hidden">
          <ImageCarousel
            images={galleryImages}
            alt={propertyName}
            className="aspect-[4/3] rounded-2xl"
          />
        </div>

        <div className="relative hidden overflow-hidden rounded-2xl md:grid md:h-[420px] md:grid-cols-4 md:grid-rows-2 md:gap-2">
          {displayImages.map((image, index) => {
            const isPrimary = index === 0;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setOpen(true)}
                className={`group relative overflow-hidden bg-slate-100 ${
                  isPrimary ? "col-span-2 row-span-2" : ""
                }`}
              >
                <SafeBookingImage
                  src={image}
                  alt={`${propertyName} ${index + 1}`}
                  sizes={isPrimary ? "50vw" : "25vw"}
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </button>
            );
          })}
          {displayImages.length < 5
            ? Array.from({ length: 5 - displayImages.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400"
                >
                  Foto belum tersedia
                </div>
              ))
            : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute bottom-4 right-4 hidden h-10 items-center gap-2 rounded-lg border border-slate-950 bg-white px-4 text-xs font-semibold text-slate-950 shadow-sm md:inline-flex"
          >
            <Grid2X2 size={15} />
            Lihat semua foto
          </button>
        </div>
      </section>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Semua foto properti"
          className="fixed inset-0 z-[100] overflow-y-auto bg-white"
        >
          <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
            <p className="text-sm font-semibold text-slate-950">{propertyName}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700"
              aria-label="Tutup galeri"
            >
              <X size={17} />
            </button>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 px-5 py-6 md:grid-cols-2">
            {galleryImages.map((image, index) => (
              <div
                key={`${image}-modal-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100"
              >
                <SafeBookingImage
                  src={image}
                  alt={`${propertyName} ${index + 1}`}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
