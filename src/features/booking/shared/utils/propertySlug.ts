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
  const idPart = raw?.match(/^\d+/)?.[0];
  const propertyId = Number(idPart);

  return Number.isFinite(propertyId) && propertyId > 0 ? propertyId : null;
};
