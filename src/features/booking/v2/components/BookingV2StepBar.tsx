import { CheckCircle2 } from "lucide-react";

const STEPS = [
  "Properti",
  "Kamar",
  "Ringkasan",
  "Data",
  "Pembayaran",
] as const;

type BookingV2Step = (typeof STEPS)[number];

export default function BookingV2StepBar({ current }: { current: BookingV2Step }) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="overflow-x-auto border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-2 px-6 py-3">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = step === current;

          return (
            <div
              key={step}
              className={`inline-flex min-w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isCurrent
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {isDone ? <CheckCircle2 size={13} /> : <span>{index + 1}</span>}
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
