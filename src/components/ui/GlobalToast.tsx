"use client";

import ToastMessage from "@/components/ui/ToastMessage";
import { useTransientToast } from "@/hooks/useTransientToast";

export default function GlobalToast() {
  const { toast, clearToast } = useTransientToast();

  return <ToastMessage toast={toast} onClose={clearToast} />;
}
