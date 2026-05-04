"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDueDate, getDueDateDeadline } from "@/lib/due-date";

const SECOND_IN_MS = 1000;
const MINUTE_IN_SECONDS = 60;
const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
const URGENT_THRESHOLD_MS = 60 * 60 * 1000;

const padTime = (value: number) => value.toString().padStart(2, "0");

const formatRemainingTime = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / SECOND_IN_MS));
  const days = Math.floor(totalSeconds / DAY_IN_SECONDS);
  const hours = Math.floor((totalSeconds % DAY_IN_SECONDS) / HOUR_IN_SECONDS);
  const minutes = Math.floor(
    (totalSeconds % HOUR_IN_SECONDS) / MINUTE_IN_SECONDS
  );
  const seconds = totalSeconds % MINUTE_IN_SECONDS;

  if (days > 0) {
    return `${days} hari ${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
};

type DeadlineCountdownProps = {
  value?: string | null;
  className?: string;
  prefix?: string;
  expiredLabel?: string;
  unavailableLabel?: string;
  variant?: "badge" | "text" | "light";
};

export default function DeadlineCountdown({
  value,
  className = "",
  prefix = "Sisa waktu",
  expiredLabel = "Waktu pembayaran telah berakhir",
  unavailableLabel = "Batas pembayaran belum tersedia",
  variant = "badge",
}: DeadlineCountdownProps) {
  const deadline = useMemo(() => getDueDateDeadline(value), [value]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= deadline.getTime()) {
        window.clearInterval(intervalId);
      }
    }, SECOND_IN_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deadline]);

  if (!deadline) {
    return (
      <span
        className={`inline-flex items-center rounded-full text-xs font-medium text-slate-500 ${className}`}
      >
        {unavailableLabel}
      </span>
    );
  }

  const remainingMs = deadline.getTime() - now;
  const isExpired = remainingMs <= 0;
  const isUrgent = remainingMs > 0 && remainingMs <= URGENT_THRESHOLD_MS;
  const label = isExpired
    ? expiredLabel
    : `${prefix}: ${formatRemainingTime(remainingMs)}`;

  if (variant === "text") {
    return (
      <span
        title={formatDueDate(value)}
        className={`inline-flex items-center text-xs font-semibold ${
          isExpired
            ? "text-red-700"
            : isUrgent
              ? "text-amber-700"
              : "text-emerald-700"
        } ${className}`}
      >
        {label}
      </span>
    );
  }

  if (variant === "light") {
    return (
      <span
        title={formatDueDate(value)}
        className={`inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      title={formatDueDate(value)}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isExpired
          ? "border-red-200 bg-red-50 text-red-700"
          : isUrgent
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
      } ${className}`}
    >
      {label}
    </span>
  );
}
