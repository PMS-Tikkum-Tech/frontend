"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { LanguageCode } from "@/lib/i18n";

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

const LANGUAGE_OPTIONS: Array<{ value: LanguageCode; label: string }> = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];

export default function LanguageSwitcher({
  compact = false,
  className = "",
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const title = language === "en" ? "Language" : "Bahasa";

  return (
    <div
      data-no-translate="true"
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm shadow-slate-200/60 backdrop-blur ${className}`.trim()}
    >
      {!compact ? (
        <div className="flex items-center gap-1.5 pl-3 pr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Languages size={13} />
          <span>{title}</span>
        </div>
      ) : null}

      <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5">
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.value === language;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setLanguage(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition sm:px-3.5 ${
                isActive
                  ? "bg-green-600 text-white shadow-sm shadow-green-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {compact ? option.value.toUpperCase() : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
