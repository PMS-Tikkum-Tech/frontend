import { redirect } from "next/navigation";

export default async function BookingV2PropertyRoomsAliasPage({
  params,
}: {
  params: Promise<{ propertySlug: string }>;
}) {
  const { propertySlug } = await params;
  redirect(`/booking/v2/${propertySlug}/rooms`);
}
