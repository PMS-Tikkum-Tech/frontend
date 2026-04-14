"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { ToastState } from "@/hooks/useTransientToast";

const TOAST_TRANSITION_MS = 220;

export default function ToastMessage({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  const [renderedToast, setRenderedToast] = useState<ToastState>(toast);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setRenderedToast(toast);
      const frameId = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(
      () => setRenderedToast(null),
      TOAST_TRANSITION_MS
    );

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!renderedToast) {
    return null;
  }

  const isSuccess = renderedToast.variant === "success";

  return (
    <div className="fixed right-5 top-24 z-[70] w-full max-w-sm">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-200 ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0 pointer-events-none"
        } ${
          isSuccess
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
        )}

        <div className="flex-1">
          <p className="text-sm font-medium">{renderedToast.message}</p>
          {renderedToast.action ? (
            <Link
              href={renderedToast.action.href}
              onClick={onClose}
              className="mt-1 inline-flex text-xs font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {renderedToast.action.label}
            </Link>
          ) : null}
        </div>

        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-white/70"
          aria-label="Tutup notifikasi"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
