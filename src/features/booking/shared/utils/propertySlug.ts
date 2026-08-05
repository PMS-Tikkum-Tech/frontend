const slugify = (value?: string | null) => {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const createBookingPropertySlug = (id: number | string, name?: string | null) => {
  const suffix = slugify(name);
  return suffix ? `${id}-${suffix}` : String(id);
};

export const parseBookingPropertyId = (propertySlug?: string | string[] | null) => {
  const raw = Array.isArray(propertySlug) ? propertySlug[0] : propertySlug;
  const publicId = raw?.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  )?.[0];
  if (publicId) {
    // Catalog IDs are opaque strings at runtime. The cast preserves the
    // pre-existing component contract while the remaining UI types migrate.
    return publicId as unknown as number;
  }

  const idPart = raw?.match(/^\d+/)?.[0];
  const propertyId = Number(idPart);

  return Number.isFinite(propertyId) && propertyId > 0 ? propertyId : null;
};
