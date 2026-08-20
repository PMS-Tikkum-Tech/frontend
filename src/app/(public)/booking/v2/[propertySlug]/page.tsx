import { redirect } from "next/navigation";

export default async function BookingV2PropertyAliasPage({
  params,
}: {
  params: Promise<{ propertySlug: string }>;
}) {
  const { propertySlug } = await params;
  redirect(`/booking/v2/property/${propertySlug}`);
}
