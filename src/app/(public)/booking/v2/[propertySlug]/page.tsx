import { redirect } from "next/navigation";

export default function BookingV2PropertyAliasPage({
  params,
}: {
  params: { propertySlug: string };
}) {
  redirect(`/booking/v2/property/${params.propertySlug}`);
}
