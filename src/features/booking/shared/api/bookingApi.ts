import {
  createTenantBookingPayment,
  getPublicProperties,
  getPublicPropertyUnits,
  type PublicPropertySummary,
  type PublicPropertyUnitSummary,
  type TenantBookingPaymentPayload,
} from "@/lib/dashboard/tenant.api";

export type BookingApiQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export const fetchBookingProperties = (params?: BookingApiQueryParams) => {
  return getPublicProperties(params);
};

export const fetchBookingPropertyRooms = (
  propertyId: number | string,
  params?: BookingApiQueryParams
) => {
  return getPublicPropertyUnits(propertyId, params);
};

export const findBookingPropertyById = async (propertyId: number) => {
  const perPage = 100;
  const firstPage = await getPublicProperties({
    page: 1,
    per_page: perPage,
    sort: "newest",
  });
  let found =
    firstPage.data.find((property: PublicPropertySummary) => property.id === propertyId) ||
    null;
  const totalPages = firstPage.meta?.total_pages || 1;

  for (let page = 2; !found && page <= totalPages; page += 1) {
    const nextPage = await getPublicProperties({
      page,
      per_page: perPage,
      sort: "newest",
    });
    found =
      nextPage.data.find(
        (property: PublicPropertySummary) => property.id === propertyId
      ) || null;
  }

  return found;
};

export const findBookingRoomById = async (
  propertyId: number,
  roomId: number
) => {
  const perPage = 100;
  const firstPage = await getPublicPropertyUnits(propertyId, {
    page: 1,
    per_page: perPage,
    sort: "price_asc",
  });
  let found =
    firstPage.data.find((room: PublicPropertyUnitSummary) => room.id === roomId) ||
    null;
  const totalPages = firstPage.meta?.total_pages || 1;

  for (let page = 2; !found && page <= totalPages; page += 1) {
    const nextPage = await getPublicPropertyUnits(propertyId, {
      page,
      per_page: perPage,
      sort: "price_asc",
    });
    found =
      nextPage.data.find((room: PublicPropertyUnitSummary) => room.id === roomId) ||
      null;
  }

  return found;
};

export const submitBookingPayment = (payload: TenantBookingPaymentPayload) => {
  return createTenantBookingPayment(payload);
};
