import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kyra Stay PMS",
  description: "Property Management System - Kyra Stay",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
