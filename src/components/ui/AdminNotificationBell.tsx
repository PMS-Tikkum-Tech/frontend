"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import {
  getAdminManualRentalBookings,
  getAdminPayments,
} from "@/lib/dashboard/admin.api";

const STORAGE_KEY = "admin_notif_read_ids";

interface NotifItem {
  id: string;
  type: "pending_payment" | "overdue";
  label: string;
  detail: string;
  href: string;
  createdAt?: string | null;
}

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([
        getAdminManualRentalBookings({ page: 1, per_page: 50 }),
        getAdminPayments({ page: 1, per_page: 50 }),
      ]);

      const notifs: NotifItem[] = [];

      bookingsRes.data
        .filter((b) => b.booking_status === "pending_review")
        .forEach((b) => {
          const tenantName = b.tenant?.full_name || "Penyewa";
          const propertyDetail = [b.property?.name, b.unit?.name]
            .filter(Boolean)
            .join(" · ");
          notifs.push({
            id: `booking-${b.id}`,
            type: "pending_payment",
            label: "Pembayaran Menunggu ACC",
            detail: propertyDetail
              ? `${tenantName} · ${propertyDetail}`
              : tenantName,
            href: "/admin/billing",
            createdAt: b.payment_submitted_at || b.created_at,
          });
        });

      paymentsRes.data
        .filter((p) => p.status === "overdue" || p.status === "waiting")
        .filter((p) => {
          if (p.status === "overdue") return true;
          if (!p.due_date) return false;
          return new Date(p.due_date) < new Date();
        })
        .forEach((p) => {
          const tenantName = p.tenant?.full_name || "Penyewa";
          const propertyDetail = [p.property?.name, p.unit?.name]
            .filter(Boolean)
            .join(" · ");
          notifs.push({
            id: `payment-${p.id}`,
            type: "overdue",
            label: "Tagihan Jatuh Tempo",
            detail: propertyDetail
              ? `${tenantName} · ${propertyDetail}`
              : tenantName,
            href: "/admin/billing",
            createdAt: p.due_date,
          });
        });

      setItems(notifs);
    } catch {
      // silent fail — notification is best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;

  const handleOpen = () => {
    if (!open) {
      // Mark all current items as read when opening
      const newReadIds = new Set(readIds);
      items.forEach((item) => newReadIds.add(item.id));
      setReadIds(newReadIds);
      saveReadIds(newReadIds);
    }
    setOpen((prev) => !prev);
  };

  const handleMarkAllRead = () => {
    const newReadIds = new Set(readIds);
    items.forEach((item) => newReadIds.add(item.id));
    setReadIds(newReadIds);
    saveReadIds(newReadIds);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifikasi"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">
              Notifikasi
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-600"
              >
                <CheckCheck size={13} />
                Tandai semua
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Memuat...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Tidak ada notifikasi
              </div>
            ) : (
              items.map((item) => {
                const isRead = readIds.has(item.id);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col gap-0.5 border-b border-slate-100 px-4 py-3 transition last:border-0 ${
                      isRead
                        ? "bg-slate-50 hover:bg-slate-100"
                        : "bg-white hover:bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          isRead ? "text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p
                      className={`pl-4 text-[11px] leading-snug ${
                        isRead ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {item.detail}
                    </p>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <Link
              href="/admin/billing"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
            >
              Lihat semua tagihan &amp; pembayaran →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
