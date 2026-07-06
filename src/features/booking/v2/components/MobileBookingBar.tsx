"use client";

export default function MobileBookingBar({
  priceLabel,
  selectedRoomLabel,
  onOpen,
}: {
  priceLabel: string;
  selectedRoomLabel?: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {priceLabel}
            <span className="font-normal text-slate-500"> / paket</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {selectedRoomLabel || "Pilih kamar untuk lanjut"}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
        >
          Pilih kamar
        </button>
      </div>
    </div>
  );
}
