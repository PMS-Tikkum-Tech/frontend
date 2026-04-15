export type PropertyCoordinate = {
  lat: number;
  lng: number;
};

export type GoogleGeocodedAddress = {
  coordinate: PropertyCoordinate;
  formattedAddress: string;
  placeId: string | null;
  locationType: "ROOFTOP" | "RANGE_INTERPOLATED" | "GEOMETRIC_CENTER" | "APPROXIMATE" | null;
  partialMatch: boolean;
};

type CoordinateRange = {
  min: number;
  max: number;
};

const LATITUDE_RANGE: CoordinateRange = { min: -90, max: 90 };
const LONGITUDE_RANGE: CoordinateRange = { min: -180, max: 180 };
const COORDINATE_CACHE_KEY = "kyra_property_coordinate_cache_v3";
const GOOGLE_GEOCODE_CACHE_KEY = "kyra_google_geocode_cache_v3";

const geocodeCache = new Map<string, PropertyCoordinate | null>();
const pendingGeocodeRequests = new Map<string, Promise<PropertyCoordinate | null>>();
const googleGeocodeCache = new Map<string, GoogleGeocodedAddress | null>();
const pendingGoogleGeocodeRequests = new Map<
  string,
  Promise<GoogleGeocodedAddress | null>
>();

let isGeocodeCacheLoaded = false;
let isGoogleGeocodeCacheLoaded = false;

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

const normalizeAddressText = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const splitAddressSegments = (address: string) =>
  normalizeAddressText(address)
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

const isLikelyPlusCodeSegment = (segment: string) =>
  /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,8}(?:\s.*)?$/i.test(
    segment
  );

const isLowSignalSegment = (segment: string) =>
  /^RT\.?\s*\d+/i.test(segment) || /^RW\.?\s*\d+/i.test(segment);

const simplifyAdministrativeSegment = (segment: string) =>
  segment
    .replace(
      /^(Kecamatan|Kelurahan|Desa|Kota|Kabupaten|Provinsi)\s+/i,
      ""
    )
    .trim();

const ensureIndonesiaSuffix = (value: string) => {
  const normalized = normalizeAddressText(value);
  if (!normalized) {
    return "";
  }

  if (/\bindonesia\b/i.test(normalized)) {
    return normalized;
  }

  return `${normalized}, Indonesia`;
};

const buildAddressQueryCandidates = (
  address?: string | null,
  propertyName?: string | null
) => {
  const segments = splitAddressSegments(address || "").filter(
    (segment) => !isLikelyPlusCodeSegment(segment) && !isLowSignalSegment(segment)
  );

  const simplifiedSegments = segments
    .map(simplifyAdministrativeSegment)
    .filter(Boolean);

  const tailSegments = segments.slice(Math.max(0, segments.length - 4));
  const tailSimplifiedSegments = simplifiedSegments.slice(
    Math.max(0, simplifiedSegments.length - 4)
  );

  const candidates: string[] = [];
  const addCandidate = (parts: Array<string | null | undefined>) => {
    const candidate = ensureIndonesiaSuffix(
      parts
        .filter((part): part is string => Boolean(part))
        .map((part) => normalizeAddressText(part))
        .filter(Boolean)
        .join(", ")
    );

    if (!candidate || candidates.includes(candidate)) {
      return;
    }

    candidates.push(candidate);
  };

  addCandidate([propertyName?.trim(), ...segments]);
  addCandidate([propertyName?.trim(), ...simplifiedSegments]);
  addCandidate([propertyName?.trim(), ...tailSegments]);
  addCandidate([propertyName?.trim(), ...tailSimplifiedSegments]);
  addCandidate(segments);
  addCandidate(simplifiedSegments);
  addCandidate(tailSegments);
  addCandidate(tailSimplifiedSegments);

  return candidates;
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

const loadGoogleGeocodeCache = () => {
  if (isGoogleGeocodeCacheLoaded || typeof window === "undefined") {
    return;
  }

  isGoogleGeocodeCacheLoaded = true;

  try {
    const raw = window.localStorage.getItem(GOOGLE_GEOCODE_CACHE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Record<
      string,
      | {
          formattedAddress?: unknown;
          placeId?: unknown;
          partialMatch?: unknown;
          locationType?: unknown;
          coordinate?: {
            lat?: unknown;
            lng?: unknown;
          } | null;
        }
      | null
    >;

    Object.entries(parsed).forEach(([key, value]) => {
      if (!key) {
        return;
      }

      if (!value?.coordinate) {
        googleGeocodeCache.set(key, null);
        return;
      }

      const lat = parseCoordinateValue(value.coordinate.lat, LATITUDE_RANGE);
      const lng = parseCoordinateValue(value.coordinate.lng, LONGITUDE_RANGE);
      if (lat === null || lng === null) {
        googleGeocodeCache.set(key, null);
        return;
      }

      const locationType =
        value.locationType === "ROOFTOP" ||
        value.locationType === "RANGE_INTERPOLATED" ||
        value.locationType === "GEOMETRIC_CENTER" ||
        value.locationType === "APPROXIMATE"
          ? value.locationType
          : null;

      googleGeocodeCache.set(key, {
        coordinate: { lat, lng },
        formattedAddress:
          typeof value.formattedAddress === "string" ? value.formattedAddress : "",
        placeId: typeof value.placeId === "string" ? value.placeId : null,
        partialMatch: Boolean(value.partialMatch),
        locationType,
      });
    });
  } catch {
    googleGeocodeCache.clear();
  }
};

const saveGoogleGeocodeCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serialized = Object.fromEntries(googleGeocodeCache.entries());
    window.localStorage.setItem(
      GOOGLE_GEOCODE_CACHE_KEY,
      JSON.stringify(serialized)
    );
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

const getCachedGoogleGeocode = (key: string) => {
  loadGoogleGeocodeCache();

  if (!googleGeocodeCache.has(key)) {
    return undefined;
  }

  const cached = googleGeocodeCache.get(key);
  if (!cached) {
    return null;
  }

  return {
    ...cached,
    coordinate: { ...cached.coordinate },
  };
};

const setCachedCoordinate = (key: string, value: PropertyCoordinate | null) => {
  geocodeCache.set(key, value ? { ...value } : null);
  saveGeocodeCache();
};

const setCachedGoogleGeocode = (
  key: string,
  value: GoogleGeocodedAddress | null
) => {
  googleGeocodeCache.set(
    key,
    value
      ? {
          ...value,
          coordinate: { ...value.coordinate },
        }
      : null
  );
  saveGoogleGeocodeCache();
};

const GOOGLE_LOCATION_TYPE_PRIORITY: Record<
  NonNullable<GoogleGeocodedAddress["locationType"]>,
  number
> = {
  ROOFTOP: 4,
  RANGE_INTERPOLATED: 3,
  GEOMETRIC_CENTER: 2,
  APPROXIMATE: 1,
};

type GoogleGeocodingApiResult = {
  formatted_address?: unknown;
  place_id?: unknown;
  partial_match?: unknown;
  geometry?: {
    location?: {
      lat?: unknown;
      lng?: unknown;
    };
    location_type?: unknown;
  };
  types?: unknown;
};

const getGoogleLocationTypePriority = (value: unknown) => {
  if (
    value === "ROOFTOP" ||
    value === "RANGE_INTERPOLATED" ||
    value === "GEOMETRIC_CENTER" ||
    value === "APPROXIMATE"
  ) {
    return GOOGLE_LOCATION_TYPE_PRIORITY[value];
  }

  return 0;
};

const getGoogleResultTypeBonus = (types: unknown) => {
  if (!Array.isArray(types)) {
    return 0;
  }

  if (
    types.includes("street_address") ||
    types.includes("premise") ||
    types.includes("subpremise")
  ) {
    return 2;
  }

  if (types.includes("route")) {
    return 1;
  }

  return 0;
};

const pickBestGoogleGeocodeResult = (
  results: GoogleGeocodingApiResult[]
): GoogleGeocodingApiResult | null => {
  const ranked = results
    .filter((item) => {
      const lat = parseCoordinateValue(item.geometry?.location?.lat, LATITUDE_RANGE);
      const lng = parseCoordinateValue(item.geometry?.location?.lng, LONGITUDE_RANGE);
      return lat !== null && lng !== null;
    })
    .map((item) => {
      const locationTypePriority = getGoogleLocationTypePriority(
        item.geometry?.location_type
      );
      const precisionBonus = getGoogleResultTypeBonus(item.types);
      const partialPenalty = item.partial_match ? -3 : 0;

      return {
        item,
        score: locationTypePriority * 10 + precisionBonus + partialPenalty,
      };
    })
    .sort((first, second) => second.score - first.score);

  return ranked[0]?.item || null;
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
      const candidates = buildAddressQueryCandidates(address, propertyName);
      for (const queryText of candidates) {
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
          continue;
        }

        const payload = (await response.json()) as Array<{
          lat?: unknown;
          lon?: unknown;
        }>;

        if (!Array.isArray(payload) || payload.length === 0) {
          continue;
        }

        const firstResult = payload[0];
        const lat = parseCoordinateValue(firstResult?.lat, LATITUDE_RANGE);
        const lng = parseCoordinateValue(firstResult?.lon, LONGITUDE_RANGE);
        if (lat === null || lng === null) {
          continue;
        }

        const coordinate = { lat, lng };
        setCachedCoordinate(cacheKey, coordinate);
        return coordinate;
      }

      setCachedCoordinate(cacheKey, null);
      return null;
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

export const geocodePropertyAddressWithGoogle = async (
  address?: string | null,
  propertyName?: string | null
): Promise<GoogleGeocodedAddress | null> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
  if (!apiKey) {
    return null;
  }

  const cacheKey = normalizeAddressKey(address);
  if (!cacheKey) {
    return null;
  }

  const cached = getCachedGoogleGeocode(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = pendingGoogleGeocodeRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const candidates = buildAddressQueryCandidates(address, propertyName);
      for (const queryText of candidates) {
        const params = new URLSearchParams({
          address: queryText,
          key: apiKey,
          language: "id",
          region: "id",
          components: "country:ID",
        });

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
        );

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as {
          status?: unknown;
          error_message?: unknown;
          results?: GoogleGeocodingApiResult[];
        };

        if (payload.status === "ZERO_RESULTS") {
          continue;
        }

        if (payload.status !== "OK") {
          const googleError =
            typeof payload.error_message === "string"
              ? payload.error_message
              : null;
          if (googleError) {
            throw new Error(
              googleError || "Google Geocoding API mengembalikan status yang tidak valid."
            );
          }
          continue;
        }

        const bestResult = pickBestGoogleGeocodeResult(payload.results || []);
        if (!bestResult) {
          continue;
        }

        const lat = parseCoordinateValue(
          bestResult.geometry?.location?.lat,
          LATITUDE_RANGE
        );
        const lng = parseCoordinateValue(
          bestResult.geometry?.location?.lng,
          LONGITUDE_RANGE
        );

        if (lat === null || lng === null) {
          continue;
        }

        const locationType =
          bestResult.geometry?.location_type === "ROOFTOP" ||
          bestResult.geometry?.location_type === "RANGE_INTERPOLATED" ||
          bestResult.geometry?.location_type === "GEOMETRIC_CENTER" ||
          bestResult.geometry?.location_type === "APPROXIMATE"
            ? bestResult.geometry.location_type
            : null;

        const geocoded: GoogleGeocodedAddress = {
          coordinate: { lat, lng },
          formattedAddress:
            typeof bestResult.formatted_address === "string"
              ? bestResult.formatted_address
              : queryText,
          placeId:
            typeof bestResult.place_id === "string" ? bestResult.place_id : null,
          locationType,
          partialMatch: Boolean(bestResult.partial_match),
        };

        setCachedGoogleGeocode(cacheKey, geocoded);
        return geocoded;
      }

      setCachedGoogleGeocode(cacheKey, null);
      return null;
    } finally {
      pendingGoogleGeocodeRequests.delete(cacheKey);
    }
  })();

  pendingGoogleGeocodeRequests.set(cacheKey, request);
  return request;
};
