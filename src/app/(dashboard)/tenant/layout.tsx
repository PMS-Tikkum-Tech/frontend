"use client";

import { ReactNode } from "react";
import PublicHeader from "@/components/header/PublicHeader";
import RoleGuard from "@/components/auth/RoleGuard";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["tenant"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
        {/* HEADER */}
        <PublicHeader />

        {/* CONTENT */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
