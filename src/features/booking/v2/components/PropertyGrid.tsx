"use client";

import type { BookingV2Property } from "@/features/booking/shared/adapters/propertyAdapter";
import PropertyCard from "./PropertyCard";

export default function PropertyGrid({
  properties,
  favoriteIds,
  selectedPropertyId,
  onSelectProperty,
  onFavoriteChange,
}: {
  properties: BookingV2Property[];
  favoriteIds: Set<number>;
  selectedPropertyId?: number | null;
  onSelectProperty?: (propertyId: number) => void;
  onFavoriteChange?: (propertyId: number, isFavorite: boolean) => void;
}) {
  return (
    <div className="grid items-stretch gap-5 sm:grid-cols-2">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isFavorite={favoriteIds.has(property.id)}
          isSelected={selectedPropertyId === property.id}
          onSelect={onSelectProperty}
          onFavoriteChange={onFavoriteChange}
        />
      ))}
    </div>
  );
}
