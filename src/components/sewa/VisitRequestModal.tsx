"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, MessageSquareText, X } from "lucide-react";

type VisitRequestSubmitPayload = {
  preferredDate: string;
  preferredTime: string;
  note: string;
};

type VisitRequestModalProps = {
  isOpen: boolean;
  propertyName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: VisitRequestSubmitPayload) => Promise<void> | void;
};

const getTodayDateInput = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const getTomorrowDateInput = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localDate = new Date(
    tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000
  );
  return localDate.toISOString().slice(0, 10);
};

const MODAL_TRANSITION_MS = 220;

export default function VisitRequestModal({
  isOpen,
  propertyName,
  isSubmitting,
  onClose,
  onSubmit,
}: VisitRequestModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const todayDate = useMemo(() => getTodayDateInput(), []);

  useEffect(() => {
    let frameId: number | null = null;

    if (isOpen) {
      frameId = window.requestAnimationFrame(() => {
        setIsRendered(true);
        setIsVisible(true);
        setPreferredDate(getTomorrowDateInput());
        setPreferredTime("10:00");
        setNote("");
        setError(null);
      });

      return () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setIsVisible(false);
    });
    const timeoutId = window.setTimeout(() => {
      setIsRendered(false);
    }, MODAL_TRANSITION_MS);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, propertyName]);

  if (!isRendered) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!preferredDate || !preferredTime) {
      setError("Tanggal dan jam survei wajib diisi.");
      return;
    }

    if (preferredDate < todayDate) {
      setError("Tanggal survei tidak boleh kurang dari hari ini.");
      return;
    }

    try {
      await onSubmit({
        preferredDate,
        preferredTime,
        note: note.trim(),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal mengirim permintaan survei. Silakan coba lagi."
      );
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
        aria-label="Tutup modal"
      />

      <div
        className={`relative z-[81] w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ajukan Jadwal Survei Kost
            </h2>
            <p className="mt-1 text-xs text-slate-500">{propertyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
            aria-label="Tutup"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <CalendarDays size={14} />
                Tanggal Survei
              </span>
              <input
                type="date"
                min={todayDate}
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Clock3 size={14} />
                Jam Survei
              </span>
              <input
                type="time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <MessageSquareText size={14} />
              Catatan Tambahan (opsional)
            </span>
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Contoh: Saya tersedia setelah jam kuliah."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Permintaan Survei"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
