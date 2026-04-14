"use client";

import type { TenantFavoriteProperty } from "@/lib/dashboard/tenant.api";

type FavoritesListener = (items: TenantFavoriteProperty[]) => void;

let favoritesCache: TenantFavoriteProperty[] | null = null;
const listeners = new Set<FavoritesListener>();

const emit = () => {
  if (!favoritesCache) {
    return;
  }

  listeners.forEach((listener) => listener(favoritesCache as TenantFavoriteProperty[]));
};

export const getTenantFavoritesCache = () => favoritesCache;

export const setTenantFavoritesCache = (items: TenantFavoriteProperty[]) => {
  favoritesCache = items;
  emit();
};

export const subscribeTenantFavoritesCache = (listener: FavoritesListener) => {
  listeners.add(listener);

  if (favoritesCache) {
    listener(favoritesCache);
  }

  return () => {
    listeners.delete(listener);
  };
};

export const patchFavoriteState = (
  items: TenantFavoriteProperty[],
  propertyId: number,
  params: {
    isFavorite: boolean;
    favoriteId?: number | null;
  }
) => {
  return items.map((item) => {
    if (item.property.id !== propertyId) {
      return item;
    }

    return {
      ...item,
      is_favorite: params.isFavorite,
      favorite_id:
        params.favoriteId !== undefined
          ? params.favoriteId
          : params.isFavorite
            ? item.favorite_id
            : null,
    };
  });
};
