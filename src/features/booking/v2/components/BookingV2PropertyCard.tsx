import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import type { BookingV2Property } from "@/features/booking/shared/adapters/propertyAdapter";

export default function BookingV2PropertyCard({
  property,
}: {
  property: BookingV2Property;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/10]">
        <Image
          src={property.imageUrl}
          alt={property.name}
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {property.propertyTypeLabel}
          </span>
          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            {property.availabilityLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h2 className="line-clamp-2 text-base font-semibold text-slate-900">
            {property.name}
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-slate-600">
            <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <span className="line-clamp-2">{property.address}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Harga mulai</p>
            <p className="mt-1 font-semibold text-slate-900">{property.priceLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Unit tersedia</p>
            <p className="mt-1 inline-flex items-center gap-1 font-semibold text-slate-900">
              <Building2 size={13} />
              {property.availableUnits}
            </p>
          </div>
        </div>

        <Link
          href={`/booking/v2/${property.slug}/rooms`}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Pilih Kamar
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
