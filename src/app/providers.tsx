"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import GlobalToast from "@/components/ui/GlobalToast";
import IntroSplash from "@/components/ui/IntroSplash";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <IntroSplash />
      {children}
      <GlobalToast />
    </AuthProvider>
  );
}
