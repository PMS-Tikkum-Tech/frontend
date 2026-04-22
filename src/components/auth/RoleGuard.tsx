"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDefaultRouteByRole } from "@/lib/auth";
import type { UserRole } from "@/types/auth";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      const redirectTarget = pathname
        ? `/auth?next=${encodeURIComponent(pathname)}`
        : "/auth";
      router.replace(redirectTarget);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace(getDefaultRouteByRole(user.role));
    }
  }, [allowedRoles, isAuthenticated, isLoading, pathname, router, user]);

  if (!isLoading && (!isAuthenticated || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  if (!isLoading && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">
          Mengalihkan ke halaman sesuai peran...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
