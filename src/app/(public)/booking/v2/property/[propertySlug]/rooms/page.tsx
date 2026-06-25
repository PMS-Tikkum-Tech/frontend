import { redirect } from "next/navigation";

export default function BookingV2PropertyRoomsAliasPage({
  params,
}: {
  params: { propertySlug: string };
}) {
  redirect(`/booking/v2/${params.propertySlug}/rooms`);
}
