"use client";

import {
  FirebaseError,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";

type FirebaseConfigSource = {
  config: FirebaseOptions;
  hasAnyValue: boolean;
  hasRequiredValues: boolean;
  missingRequiredKeys: string[];
  name: string;
};

const defaultFirebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyD9RpfJoiY8hwScCXSzMvw5LWixvg3WrXU",
  authDomain: "kikost-c536d.firebaseapp.com",
  projectId: "kikost-c536d",
  storageBucket: "kikost-c536d.firebasestorage.app",
  messagingSenderId: "1079630604119",
  appId: "1:1079630604119:web:ab1712accbd2733787c012",
  measurementId: "G-6YX9E6BCXV",
};

const buildSource = (
  name: string,
  config: FirebaseOptions
): FirebaseConfigSource => {
  const requiredEntries = {
    apiKey: config.apiKey,
    projectId: config.projectId,
    appId: config.appId,
  };
  const missingRequiredKeys = Object.entries(requiredEntries)
    .filter(([, value]) => !String(value || "").trim())
    .map(([key]) => key);

  return {
    name,
    config,
    hasAnyValue: Object.values(config).some((value) =>
      Boolean(String(value || "").trim())
    ),
    hasRequiredValues: missingRequiredKeys.length === 0,
    missingRequiredKeys,
  };
};

const getFirebaseConfigSource = () => {
  const primary = buildSource("NEXT_PUBLIC_FIREBASE_*", {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });

  if (primary.hasRequiredValues) {
    return primary;
  }

  if (primary.hasAnyValue) {
    throw new FirebaseError(
      "auth/invalid-api-key",
      `Konfigurasi Firebase ${primary.name} belum lengkap. Isi: ${primary.missingRequiredKeys.join(
        ", "
      )}.`
    );
  }

  const phoneAlias = buildSource("NEXT_PUBLIC_FIREBASE_PHONE_*", {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_PHONE_API_KEY,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_PHONE_AUTH_DOMAIN ||
      (process.env.NEXT_PUBLIC_FIREBASE_PHONE_PROJECT_ID
        ? `${process.env.NEXT_PUBLIC_FIREBASE_PHONE_PROJECT_ID}.firebaseapp.com`
        : undefined),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PHONE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_PHONE_APP_ID,
  });

  if (phoneAlias.hasRequiredValues) {
    return phoneAlias;
  }

  if (phoneAlias.hasAnyValue) {
    throw new FirebaseError(
      "auth/invalid-api-key",
      `Konfigurasi Firebase ${phoneAlias.name} belum lengkap. Isi: ${phoneAlias.missingRequiredKeys.join(
        ", "
      )}.`
    );
  }

  return buildSource("default", defaultFirebaseConfig);
};

export const getFirebaseApp = () => {
  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) {
    return existing;
  }

  return initializeApp(getFirebaseConfigSource().config);
};

export const getFirebaseAuth = () => {
  const auth = getAuth(getFirebaseApp());
  auth.languageCode = "id";
  return auth;
};

export const setFirebaseSessionPersistence = async () => {
  await setPersistence(getFirebaseAuth(), browserSessionPersistence);
};

export const getFirebaseProjectId = () => {
  return getFirebaseConfigSource().config.projectId || "";
};
