"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "success" | "error";

export type ToastAction = {
  label: string;
  href: string;
};

export type ToastState = {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
} | null;

const ERROR_TOAST_DURATION_MS = 10_000;

let globalToastState: ToastState = null;
let globalToastTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(toast: ToastState) => void>();

const publishToastState = () => {
  listeners.forEach((listener) => listener(globalToastState));
};

const clearGlobalToast = () => {
  if (globalToastTimeout) {
    clearTimeout(globalToastTimeout);
    globalToastTimeout = null;
  }

  globalToastState = null;
  publishToastState();
};

const showGlobalToast = (
  message: string,
  variant: ToastVariant,
  durationMs: number,
  action?: ToastAction
) => {
  if (globalToastTimeout) {
    clearTimeout(globalToastTimeout);
  }

  globalToastState = { message, variant, action };
  publishToastState();

  globalToastTimeout = setTimeout(() => {
    globalToastState = null;
    globalToastTimeout = null;
    publishToastState();
  }, durationMs);
};

export function useTransientToast(durationMs = 3000) {
  const [toast, setToast] = useState<ToastState>(globalToastState);

  const clearToast = () => {
    clearGlobalToast();
  };

  const showToast = (
    message: string,
    variant: ToastVariant,
    options?: {
      action?: ToastAction;
      durationMs?: number;
    }
  ) => {
    const timeout =
      options?.durationMs ||
      (variant === "error" ? ERROR_TOAST_DURATION_MS : durationMs);
    showGlobalToast(message, variant, timeout, options?.action);
  };

  const showSuccessToast = (
    message: string,
    options?: {
      action?: ToastAction;
      durationMs?: number;
    }
  ) => {
    showToast(message, "success", options);
  };

  const showErrorToast = (
    message: string,
    options?: {
      action?: ToastAction;
      durationMs?: number;
    }
  ) => {
    showToast(message, "error", options);
  };

  useEffect(() => {
    listeners.add(setToast);

    return () => {
      listeners.delete(setToast);
    };
  }, []);

  return {
    toast,
    clearToast,
    showSuccessToast,
    showErrorToast,
  };
}
