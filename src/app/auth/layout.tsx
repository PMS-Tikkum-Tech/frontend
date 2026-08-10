import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KIKOST",
  description: "Sistem Manajemen Properti - KIKOST",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
