"use client";

import { Heart } from "lucide-react";
import {
  loadBookingV2FavoriteIds,
  saveBookingV2FavoriteIds,
} from "../store/bookingV2Store";

export default function FavoriteButton({
  propertyId,
  isFavorite,
  onToggle,
  className = "",
}: {
  propertyId: number;
  isFavorite: boolean;
  onToggle?: (nextValue: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={isFavorite ? "Hapus dari favorit" : "Simpan ke favorit"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        const ids = loadBookingV2FavoriteIds();
        const nextValue = !ids.has(propertyId);
        if (nextValue) {
          ids.add(propertyId);
        } else {
          ids.delete(propertyId);
        }
        saveBookingV2FavoriteIds(ids);
        onToggle?.(nextValue);
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-sm transition active:scale-95 ${className}`}
    >
      <Heart
        size={18}
        className={isFavorite ? "fill-sky-600 text-sky-600" : "text-slate-900"}
      />
    </button>
  );
}
