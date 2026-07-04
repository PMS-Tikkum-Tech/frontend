"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { BookingV2Property } from "@/features/booking/shared/adapters/propertyAdapter";
import { formatFacilityLabel } from "@/lib/facility-labels";
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
      className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] border border-[#e2dfff] bg-white p-1 shadow-[0_8px_24px_rgba(52,35,184,0.07)] outline-none transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(52,35,184,0.13)] focus-visible:ring-2 focus-visible:ring-[#3423b8] ${
        isSelected
          ? "bg-[#f0eeff] ring-2 ring-[#3423b8]"
          : "hover:border-[#c8c2ff]"
      }`}
    >
      <div className="relative">
        <ImageCarousel
          images={property.images}
          alt={property.name}
          className="aspect-[4/3] rounded-[16px]"
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

      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--color-text-primary)]">
            {property.name}
          </h2>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
            {property.propertyTypeLabel}
          </span>
        </div>
        <p className="mt-2 flex min-h-10 items-start gap-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#6f63d7]" />
          <span className="line-clamp-2">{property.address}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-[#f5f3ff] px-3 py-2.5">
            <p className="text-slate-500">Unit tersedia</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-[#3423b8]">
              <Building2 size={13} />
              {property.availableUnits} dari {property.totalUnits}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-slate-500">Kondisi</p>
            <p className="mt-1 line-clamp-1 font-semibold text-slate-800">
              {property.conditionLabel}
            </p>
          </div>
        </div>

        {property.facilities.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {property.facilities.slice(0, 3).map((facility) => (
              <span
                key={facility}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600"
              >
                {formatFacilityLabel(facility)}
              </span>
            ))}
            {property.facilities.length > 3 ? (
              <span className="rounded-full bg-[#eeecff] px-2.5 py-1 text-[10px] font-semibold text-[#3423b8]">
                +{property.facilities.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Mulai dari
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {property.priceLabel}
              <span className="ml-1 font-normal text-slate-400">/bulan</span>
            </p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3423b8] text-white transition group-hover:bg-[#24147d]">
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </article>
  );
}
