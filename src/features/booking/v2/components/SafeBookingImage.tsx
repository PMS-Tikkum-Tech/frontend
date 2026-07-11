"use client";

import { useMemo, useState } from "react";
import SafeImage from "@/components/ui/SafeImage";

const DEFAULT_FALLBACK_SRC = "/bg.jpg";

type SafeBookingImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
};

export default function SafeBookingImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
}: SafeBookingImageProps) {
  const normalizedSrc = useMemo(() => src || fallbackSrc, [fallbackSrc, src]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = failedSrc === normalizedSrc ? fallbackSrc : normalizedSrc;

  return (
    <SafeImage
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (failedSrc !== normalizedSrc) {
          setFailedSrc(normalizedSrc);
        }
      }}
    />
  );
}
