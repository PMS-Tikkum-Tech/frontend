"use client";

import { ReactNode } from "react";
import PublicHeader from "@/components/header/PublicHeader";
import RoleGuard from "@/components/auth/RoleGuard";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["tenant"]}>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f8f8ff]">
        {/* HEADER */}
        <PublicHeader />
        <div className="h-1 bg-[linear-gradient(90deg,#3423b8_0%,#5747ca_72%,#d8ff3e_100%)]" />

        {/* CONTENT */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
