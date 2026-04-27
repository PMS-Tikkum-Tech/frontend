import { Suspense } from "react";
import EmailVerificationRedirectPage from "@/components/auth/EmailVerificationRedirectPage";

export default function FirebaseEmailActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500">
          Menyiapkan verifikasi email...
        </div>
      }
    >
      <EmailVerificationRedirectPage />
    </Suspense>
  );
}
