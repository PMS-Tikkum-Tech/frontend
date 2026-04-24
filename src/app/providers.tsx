"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import GlobalToast from "@/components/ui/GlobalToast";
import IntroSplash from "@/components/ui/IntroSplash";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <IntroSplash />
        {children}
        <GlobalToast />
      </AuthProvider>
    </LanguageProvider>
  );
}
