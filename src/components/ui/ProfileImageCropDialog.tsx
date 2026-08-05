"use client";

import {
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, Undo2, X } from "lucide-react";

const CROP_FRAME_SIZE = 320;
const OUTPUT_SIZE = 720;

type CropResult = {
  file: File;
  previewUrl: string;
};

type LoadedImage = {
  src: string;
  width: number;
  height: number;
  type: string;
  name: string;
};

type ProfileImageCropDialogProps = {
  open: boolean;
  file: File | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onApply: (result: CropResult) => void;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getOutputMimeType = (type: string) => {
  return type === "image/png" ? "image/png" : "image/jpeg";
};

const getOutputExtension = (type: string) => {
  return type === "image/png" ? "png" : "jpg";
};

export default function ProfileImageCropDialog({
  open,
  file,
  confirmLabel = "Gunakan Foto Ini",
  onClose,
  onApply,
}: ProfileImageCropDialogProps) {
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setLoadedImage(null);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setError(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      imageElementRef.current = image;
      setLoadedImage({
        src: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
        type: file.type,
        name: file.name,
      });
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setError(null);
    };
    image.onerror = () => {
      setError("Gagal memuat gambar. Coba pilih file lain.");
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;

    return () => {
      imageElementRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, open]);

  const baseScale = useMemo(() => {
    if (!loadedImage) {
      return 1;
    }

    return Math.max(
      CROP_FRAME_SIZE / loadedImage.width,
      CROP_FRAME_SIZE / loadedImage.height
    );
  }, [loadedImage]);

  const scaledWidth = loadedImage ? loadedImage.width * baseScale * zoom : 0;
  const scaledHeight = loadedImage ? loadedImage.height * baseScale * zoom : 0;
  const maxOffsetX = Math.max(0, (scaledWidth - CROP_FRAME_SIZE) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - CROP_FRAME_SIZE) / 2);

  useEffect(() => {
    setOffsetX((current) => clamp(current, -maxOffsetX, maxOffsetX));
    setOffsetY((current) => clamp(current, -maxOffsetY, maxOffsetY));
  }, [maxOffsetX, maxOffsetY]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isApplying) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isApplying, onClose, open]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) {
        return;
      }

      const nextOffsetX = clamp(
        dragStateRef.current.originX + event.clientX - dragStateRef.current.startX,
        -maxOffsetX,
        maxOffsetX
      );
      const nextOffsetY = clamp(
        dragStateRef.current.originY + event.clientY - dragStateRef.current.startY,
        -maxOffsetY,
        maxOffsetY
      );

      setOffsetX(nextOffsetX);
      setOffsetY(nextOffsetY);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!dragStateRef.current || event.touches.length === 0) {
        return;
      }

      event.preventDefault();
      const touch = event.touches[0];
      const nextOffsetX = clamp(
        dragStateRef.current.originX + touch.clientX - dragStateRef.current.startX,
        -maxOffsetX,
        maxOffsetX
      );
      const nextOffsetY = clamp(
        dragStateRef.current.originY + touch.clientY - dragStateRef.current.startY,
        -maxOffsetY,
        maxOffsetY
      );

      setOffsetX(nextOffsetX);
      setOffsetY(nextOffsetY);
    };

    const handleTouchEnd = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [maxOffsetX, maxOffsetY]);

  if (!open || !file) {
    return null;
  }

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setError(null);
  };

  const handlePointerStart = (
    clientX: number,
    clientY: number,
    preventDefault?: () => void
  ) => {
    if (!loadedImage) {
      return;
    }

    preventDefault?.();
    dragStateRef.current = {
      startX: clientX,
      startY: clientY,
      originX: offsetX,
      originY: offsetY,
    };
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    handlePointerStart(event.clientX, event.clientY, () => event.preventDefault());
  };

  const handleApply = async () => {
    if (!loadedImage || !imageElementRef.current) {
      setError("Gambar belum siap diproses.");
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const outputMimeType = getOutputMimeType(loadedImage.type);
      const outputExtension = getOutputExtension(outputMimeType);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas tidak tersedia.");
      }

      const exportScale = OUTPUT_SIZE / CROP_FRAME_SIZE;
      context.translate(
        OUTPUT_SIZE / 2 + offsetX * exportScale,
        OUTPUT_SIZE / 2 + offsetY * exportScale
      );
      context.scale(baseScale * zoom * exportScale, baseScale * zoom * exportScale);
      context.drawImage(
        imageElementRef.current,
        -loadedImage.width / 2,
        -loadedImage.height / 2,
        loadedImage.width,
        loadedImage.height
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputMimeType, 0.92);
      });

      if (!blob) {
        throw new Error("Gagal membuat file gambar.");
      }

      const baseName = loadedImage.name.replace(/\.[^.]+$/, "") || "foto-profil";
      const nextFile = new File([blob], `${baseName}-profil.${outputExtension}`, {
        type: outputMimeType,
        lastModified: Date.now(),
      });

      onApply({
        file: nextFile,
        previewUrl: URL.createObjectURL(blob),
      });
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Gagal memproses foto profil."
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="absolute right-6 top-6 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Tutup pengaturan foto profil"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 pt-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:pt-6">
          <div>
            <div className="rounded-[28px] border border-slate-200 bg-slate-100 p-4">
              <div
                className="relative mx-auto h-80 w-80 cursor-grab overflow-hidden rounded-[28px] bg-slate-900 active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onTouchStart={(event) => {
                  if (event.touches.length === 0) {
                    return;
                  }

                  const touch = event.touches[0];
                  handlePointerStart(touch.clientX, touch.clientY, () =>
                    event.preventDefault()
                  );
                }}
              >
                {loadedImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={loadedImage.src}
                      alt="Pratinjau crop foto profil"
                      draggable={false}
                      className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                      style={{
                        width: loadedImage.width,
                        height: loadedImage.height,
                        maxWidth: "none",
                        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${baseScale * zoom})`,
                        transformOrigin: "center center",
                      }}
                    />
                    <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.48)]" />
                    <div className="pointer-events-none absolute left-1/2 top-4 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-white/25" />
                    <div className="pointer-events-none absolute left-4 top-1/2 h-px w-[calc(100%-2rem)] -translate-y-1/2 bg-white/25" />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-300">
                    Menyiapkan gambar...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label
                    htmlFor="profile-image-zoom"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Perbesar Foto
                  </label>
                  <p className="text-xs text-slate-500">
                    Perbesar untuk menentukan fokus wajah atau objek utama.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <input
                id="profile-image-zoom"
                name="profile_image_zoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">
                File yang dipilih
              </p>
              <p className="mt-2 break-all text-sm text-slate-600">
                {loadedImage?.name || file.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Hasil akhir akan disimpan sebagai foto profil baru.
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isApplying}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Undo2 size={15} />
                Atur Ulang
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!loadedImage || isApplying}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={15} />
                {isApplying ? "Memproses..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
