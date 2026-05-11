"use client";

import { getFirebaseAuth } from "@/lib/firebase";

export const getPhoneFirebaseAuth = () => {
  return getFirebaseAuth();
};
