"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SelesaiDaftarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth?mode=register");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      Mengalihkan...
    </div>
  );
}
