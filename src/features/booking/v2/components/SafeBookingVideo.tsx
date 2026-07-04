"use client";

import { PlayCircle } from "lucide-react";
import { useState } from "react";

type SafeBookingVideoProps = {
  src?: string | null;
  className?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
};

export default function SafeBookingVideo({
  src,
  className = "",
  fallbackTitle = "Video tidak dapat dimuat",
  fallbackDescription = "Silakan unggah ulang video atau periksa tautannya.",
}: SafeBookingVideoProps) {
  const normalizedSrc = src?.trim() || "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !normalizedSrc || failedSrc === normalizedSrc;

  if (showFallback) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 px-4 text-center text-slate-500 ${className}`}
      >
        <div className="max-w-xs">
          <PlayCircle size={24} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {fallbackTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {fallbackDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <video
      src={normalizedSrc}
      controls
      preload="metadata"
      className={className}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}
