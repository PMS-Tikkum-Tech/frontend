import { Suspense } from "react";
import EmailVerificationRedirectPage from "@/components/auth/EmailVerificationRedirectPage";

export default function VerificationRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="font-plus-jakarta flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500">
          Menyiapkan halaman verifikasi email...
        </div>
      }
    >
      <EmailVerificationRedirectPage />
    </Suspense>
  );
}
