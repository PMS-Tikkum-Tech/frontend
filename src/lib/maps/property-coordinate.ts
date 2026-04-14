export type PropertyCoordinate = {
  lat: number;
  lng: number;
};

type CoordinateRange = {
  min: number;
  max: number;
};

const LATITUDE_RANGE: CoordinateRange = { min: -90, max: 90 };
const LONGITUDE_RANGE: CoordinateRange = { min: -180, max: 180 };
const COORDINATE_CACHE_KEY = "kyra_property_coordinate_cache_v1";

const geocodeCache = new Map<string, PropertyCoordinate | null>();
const pendingGeocodeRequests = new Map<string, Promise<PropertyCoordinate | null>>();

let isGeocodeCacheLoaded = false;

const parseCoordinateValue = (value: unknown, range: CoordinateRange) => {
  let parsed: number | null = null;

  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (normalized !== "") {
      const numeric = Number.parseFloat(normalized);
      if (Number.isFinite(numeric)) {
        parsed = numeric;
      }
    }
  }

  if (parsed === null || !Number.isFinite(parsed)) {
    return null;
  }

  if (parsed < range.min || parsed > range.max) {
    return null;
  }

  return parsed;
};

const normalizeAddressKey = (address?: string | null) => {
  if (!address) {
    return "";
  }

  return address.trim().toLowerCase().replace(/\s+/g, " ");
};

const loadGeocodeCache = () => {
  if (isGeocodeCacheLoaded || typeof window === "undefined") {
    return;
  }

  isGeocodeCacheLoaded = true;

  try {
    const raw = window.localStorage.getItem(COORDINATE_CACHE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Record<
      string,
      { lat?: unknown; lng?: unknown } | null
    >;

    Object.entries(parsed).forEach(([key, value]) => {
      if (!key) {
        return;
      }

      if (!value) {
        geocodeCache.set(key, null);
        return;
      }

      const lat = parseCoordinateValue(value.lat, LATITUDE_RANGE);
      const lng = parseCoordinateValue(value.lng, LONGITUDE_RANGE);
      if (lat === null || lng === null) {
        geocodeCache.set(key, null);
        return;
      }

      geocodeCache.set(key, { lat, lng });
    });
  } catch {
    geocodeCache.clear();
  }
};

const saveGeocodeCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serialized = Object.fromEntries(geocodeCache.entries());
    window.localStorage.setItem(COORDINATE_CACHE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage write error to avoid breaking user flow.
  }
};

const getCachedCoordinate = (key: string) => {
  loadGeocodeCache();

  if (!geocodeCache.has(key)) {
    return undefined;
  }

  const cached = geocodeCache.get(key);
  if (!cached) {
    return null;
  }

  return { ...cached };
};

const setCachedCoordinate = (key: string, value: PropertyCoordinate | null) => {
  geocodeCache.set(key, value ? { ...value } : null);
  saveGeocodeCache();
};

export const resolveBackendCoordinate = (
  latitude: unknown,
  longitude: unknown
): PropertyCoordinate | null => {
  const lat = parseCoordinateValue(latitude, LATITUDE_RANGE);
  const lng = parseCoordinateValue(longitude, LONGITUDE_RANGE);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

export const geocodePropertyAddress = async (
  address?: string | null,
  propertyName?: string | null
): Promise<PropertyCoordinate | null> => {
  const cacheKey = normalizeAddressKey(address);
  if (!cacheKey) {
    return null;
  }

  const cached = getCachedCoordinate(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = pendingGeocodeRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const queryText = [propertyName?.trim(), address?.trim(), "Bogor", "Jawa Barat", "Indonesia"]
        .filter((item): item is string => Boolean(item))
        .join(", ");

      const params = new URLSearchParams({
        format: "jsonv2",
        limit: "1",
        countrycodes: "id",
        q: queryText,
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "id",
          },
        }
      );

      if (!response.ok) {
        setCachedCoordinate(cacheKey, null);
        return null;
      }

      const payload = (await response.json()) as Array<{
        lat?: unknown;
        lon?: unknown;
      }>;

      if (!Array.isArray(payload) || payload.length === 0) {
        setCachedCoordinate(cacheKey, null);
        return null;
      }

      const firstResult = payload[0];
      const lat = parseCoordinateValue(firstResult?.lat, LATITUDE_RANGE);
      const lng = parseCoordinateValue(firstResult?.lon, LONGITUDE_RANGE);
      if (lat === null || lng === null) {
        setCachedCoordinate(cacheKey, null);
        return null;
      }

      const coordinate = { lat, lng };
      setCachedCoordinate(cacheKey, coordinate);
      return coordinate;
    } catch {
      setCachedCoordinate(cacheKey, null);
      return null;
    } finally {
      pendingGeocodeRequests.delete(cacheKey);
    }
  })();

  pendingGeocodeRequests.set(cacheKey, request);
  return request;
};
