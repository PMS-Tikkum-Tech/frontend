"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  DoorOpen,
  Home,
  MapPin,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import SafeImage from "@/components/ui/SafeImage";
import { Property } from "@/types/dashboard";

export default function PropertyCard({ data }: { data: Property }) {
  const totalUnits = data.totalUnits || 0;
  const occupiedUnits = data.occupiedUnits || 0;
  const vacantUnits = data.vacantUnits || 0;
  const maintenanceUnits = data.maintenanceUnits || 0;
  const occupancyProgress =
    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const statusColor =
    data.status === "occupied"
      ? "border-green-200 bg-green-50 text-green-700"
      : data.status === "booking"
        ? "border-violet-200 bg-violet-50 text-violet-700"
      : data.status === "maintenance"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  const statusLabel =
    data.status === "occupied"
      ? "Terisi"
      : data.status === "booking"
        ? "Booking"
      : data.status === "maintenance"
        ? "Perawatan"
      : "Kosong";

  return (
    <Link href={`/admin/properties/${data.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative">
          <div className="relative h-52 w-full overflow-hidden">
            <SafeImage
              src={data.image || "/bg.jpg"}
              alt={data.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />

          <span
            className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}
          >
            {statusLabel}
          </span>

          <span className="absolute right-3 top-3 rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            ID #{data.id}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <h3 className="line-clamp-1 text-base font-semibold text-slate-900">
              {data.name}
            </h3>

            <p className="mt-2 flex min-h-[2.5rem] items-start gap-2 text-sm leading-5 text-slate-500">
              <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span className="line-clamp-2">{data.address}</span>
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat
                icon={<Home size={13} />}
                label="Terisi"
                value={String(occupiedUnits)}
              />
              <MiniStat
                icon={<DoorOpen size={13} />}
                label="Kosong"
                value={String(vacantUnits)}
              />
              <MiniStat
                icon={<Wrench size={13} />}
                label="Rawat"
                value={String(maintenanceUnits)}
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Building2 size={12} />
                  Okupansi
                </span>
                <span>{totalUnits > 0 ? `${occupancyProgress}%` : "-"}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1E2746]"
                  style={{ width: `${Math.max(0, Math.min(occupancyProgress, 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#1E2746]">
            Kelola Properti
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center">
      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
