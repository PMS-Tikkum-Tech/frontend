"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { BookingV2Property } from "@/features/booking/shared/adapters/propertyAdapter";
import ImageCarousel from "./ImageCarousel";
import FavoriteButton from "./FavoriteButton";

export default function PropertyCard({
  property,
  isFavorite,
  isSelected,
  onSelect,
  onFavoriteChange,
}: {
  property: BookingV2Property;
  isFavorite: boolean;
  isSelected?: boolean;
  onSelect?: (propertyId: number) => void;
  onFavoriteChange?: (propertyId: number, isFavorite: boolean) => void;
}) {
  const router = useRouter();
  const detailHref = `/booking/v2/property/${property.slug}`;

  const openDetail = () => {
    router.push(detailHref);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onSelect?.(property.id)}
      className={`group cursor-pointer rounded-[18px] p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500 ${
        isSelected ? "bg-slate-950/5 ring-2 ring-slate-950" : "hover:bg-slate-50"
      }`}
    >
      <div className="relative">
        <ImageCarousel
          images={property.images}
          alt={property.name}
          className="aspect-square rounded-2xl"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {property.availableUnits > 0 ? (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
              Tersedia sekarang
            </span>
          ) : null}
          {property.availableUnits > 0 && property.availableUnits <= 2 ? (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
              Sisa {property.availableUnits} kamar
            </span>
          ) : null}
        </div>
        <FavoriteButton
          propertyId={property.id}
          isFavorite={isFavorite}
          onToggle={(nextValue) => onFavoriteChange?.(property.id, nextValue)}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="px-0.5 pb-2 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {property.name}
          </h2>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
            {property.propertyTypeLabel}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-[var(--color-text-secondary)]">
          {property.location}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {property.distanceText}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {property.availableUnits} kamar tersedia
        </p>
        <p className="mt-2 text-sm text-slate-900">
          <span className="font-semibold">{property.priceLabel}</span>{" "}
          <span className="text-[var(--color-text-secondary)]">per bulan</span>
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 opacity-0 transition group-hover:opacity-100">
          Lihat detail
          <ArrowRight size={13} />
        </span>
      </div>
    </article>
  );
}
