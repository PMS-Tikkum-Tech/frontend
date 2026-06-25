"use client";

import { useCallback, useState } from "react";
import {
  loadBookingV2Draft,
  mergeBookingV2Draft,
  saveBookingV2Draft,
  type BookingV2Draft,
} from "../store/bookingV2Store";

export const useBookingV2Draft = () => {
  const [draft, setDraft] = useState<BookingV2Draft | null>(() =>
    loadBookingV2Draft()
  );

  const saveDraft = useCallback((nextDraft: BookingV2Draft) => {
    const saved = saveBookingV2Draft(nextDraft);
    setDraft(saved);
    return saved;
  }, []);

  const mergeDraft = useCallback((nextDraft: BookingV2Draft) => {
    const saved = mergeBookingV2Draft(nextDraft);
    setDraft(saved);
    return saved;
  }, []);

  return {
    draft,
    saveDraft,
    mergeDraft,
  };
};
