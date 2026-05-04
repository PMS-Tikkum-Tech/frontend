"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const PHONE_AUTH_APP_NAME = "phone-auth";

const getPhoneAuthApp = () => {
  const existing = getApps().find((app) => app.name === PHONE_AUTH_APP_NAME);
  if (existing) return existing;

  return initializeApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_PHONE_API_KEY,
      authDomain:
        process.env.NEXT_PUBLIC_FIREBASE_PHONE_AUTH_DOMAIN ||
        `${process.env.NEXT_PUBLIC_FIREBASE_PHONE_PROJECT_ID || "kynarastay-8e5db"}.firebaseapp.com`,
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PHONE_PROJECT_ID || "kynarastay-8e5db",
      appId: process.env.NEXT_PUBLIC_FIREBASE_PHONE_APP_ID,
    },
    PHONE_AUTH_APP_NAME
  );
};

export const getPhoneFirebaseAuth = () => {
  const auth = getAuth(getPhoneAuthApp());
  auth.languageCode = "id";
  return auth;
};
