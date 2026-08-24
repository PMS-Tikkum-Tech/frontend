"use client";

import type { ReactNode } from "react";
import { LogOut, Wrench } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";

export default function StaffLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <RoleGuard allowedRoles={["technician", "housekeeper"]}>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[#1E2746] p-2 text-white"><Wrench size={18} /></span>
              <div><p className="font-semibold text-slate-900">Kikost Operasional</p><p className="text-xs text-slate-500">{user?.name}</p></div>
            </div>
            <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><LogOut size={15} /> Keluar</button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </RoleGuard>
  );
}
