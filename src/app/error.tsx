"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-red-600">
        Terjadi kesalahan pada sistem.
      </h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[#1E2746] text-white rounded-lg"
      >
        Coba Lagi
      </button>
    </div>
  );
}
