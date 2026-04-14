"use client";

import type { LucideIcon } from "lucide-react";
import { BellRing, Building2, UserRound, Wallet, Wrench } from "lucide-react";

interface Activity {
  id: number;
  type: "payment" | "maintenance" | "tenant" | "property";
  title: string;
  description: string;
  time: string;
}

interface ActivityListProps {
  activities?: Activity[];
  isLoading?: boolean;
}

function getTypeMeta(type: Activity["type"]) {
  switch (type) {
    case "payment":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-700",
        icon: Wallet,
      };
    case "maintenance":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        iconBg: "bg-amber-100 text-amber-700",
        icon: Wrench,
      };
    case "tenant":
      return {
        badge: "bg-sky-100 text-sky-700 border-sky-200",
        iconBg: "bg-sky-100 text-sky-700",
        icon: UserRound,
      };
    case "property":
      return {
        badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
        iconBg: "bg-indigo-100 text-indigo-700",
        icon: Building2,
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        iconBg: "bg-slate-100 text-slate-700",
        icon: BellRing,
      };
  }
}

export default function ActivityList({
  activities = [],
  isLoading = false,
}: ActivityListProps) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Aktivitas Terbaru</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {isLoading ? "..." : `${activities.length} aktivitas`}
        </span>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Belum ada aktivitas terbaru.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {activities.map((activity) => {
            const meta = getTypeMeta(activity.type);
            const Icon = meta.icon as LucideIcon;

            return (
              <article
                key={activity.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-sky-200 hover:bg-sky-50/60"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}
                  >
                    <Icon size={16} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                      >
                        {activity.title}
                      </span>
                      <span className="text-[11px] text-slate-500">{activity.time}</span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
