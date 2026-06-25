# Booking Versioning Implementation Notes

- Booking Version 1 remains the existing `/sewa` to `/tenant/pembayaran/buat` flow.
- Booking Version 2 is frontend-only and uses existing manual rental catalog and booking APIs.
- Booking Version 2 keeps the existing public KIKOST header. Search and filters are rendered below that header.
- No backend route, model, migration, serializer, payment callback, or payment provider was added.
- Search/listing data is loaded from `manual_rentals/catalog/properties` through the existing frontend API client.
- Property detail and room selection load units from `manual_rentals/catalog` through the existing `getPublicPropertyUnits` wrapper.
- V2 adapters convert the existing backend fields into UI-friendly property and room shapes without changing payload names sent to backend.
- Room selection uses grouped CSS grid because the current API exposes building/block/name data, not fixed room coordinates.
- The detail map is shown only when backend latitude/longitude exists. Without coordinates, the UI shows an explicit fallback note instead of a fake location.
- Availability follows backend catalog status. The frontend does not create a production room hold countdown.
- Favorite is local-only in `kikost_booking_v2_favorites` because there is no Booking V2 account-level favorite contract.
- Draft selection is local-only in `kikost_booking_v2_draft`; availability, booking, and payment status are always revalidated from backend.
- Payment stays on the existing tenant payment form and submits through `/api/v1/manual_rentals/bookings`.
- Route aliases under `/booking/v2/property/:propertySlug/*` redirect into the existing V2 summary/customer/payment flow to avoid adding backend behavior.
