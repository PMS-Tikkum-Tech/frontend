export type ExistingPaymentHrefInput = {
  propertyId?: number | null;
  unitId?: number | null;
  bookingVersion?: "v1" | "v2";
};

export const buildExistingPaymentHref = ({
  propertyId,
  unitId,
  bookingVersion = "v2",
}: ExistingPaymentHrefInput) => {
  if (!propertyId || !unitId) {
    return "/tenant/pembayaran/buat";
  }

  const params = new URLSearchParams({
    property_id: String(propertyId),
    unit_id: String(unitId),
  });

  if (bookingVersion === "v2") {
    params.set("booking_version", "v2");
  }

  return `/tenant/pembayaran/buat?${params.toString()}`;
};
