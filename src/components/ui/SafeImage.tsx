"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

export const DEFAULT_IMAGE_FALLBACK_SRC = "/bg.jpg";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: ImageProps["src"] | null;
  fallbackSrc?: string;
};

const normalizeSrc = (
  src: SafeImageProps["src"],
  fallbackSrc: string,
): ImageProps["src"] => {
  if (typeof src === "string") {
    const trimmed = src.trim();
    return trimmed || fallbackSrc;
  }

  return src || fallbackSrc;
};

export default function SafeImage({
  src,
  alt,
  fallbackSrc = DEFAULT_IMAGE_FALLBACK_SRC,
  onError,
  unoptimized = true,
  ...props
}: SafeImageProps) {
  const normalizedSrc = useMemo(
    () => normalizeSrc(src, fallbackSrc),
    [fallbackSrc, src],
  );
  const srcKey = typeof normalizedSrc === "string" ? normalizedSrc : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [srcKey]);

  const imageSrc =
    srcKey && failedSrc === srcKey && srcKey !== fallbackSrc
      ? fallbackSrc
      : normalizedSrc;

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      unoptimized={unoptimized}
      onError={(event) => {
        onError?.(event);
        if (srcKey && srcKey !== fallbackSrc) {
          setFailedSrc(srcKey);
        }
      }}
    />
  );
}
