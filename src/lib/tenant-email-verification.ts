"use client";

import { FirebaseError } from "firebase/app";
import {
  applyActionCode,
  checkActionCode,
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirebaseAuth,
  setFirebaseSessionPersistence,
} from "@/lib/firebase";

export type PendingTenantRegistration = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
};

type StoredPendingTenantRegistration = PendingTenantRegistration & {
  savedAt?: string;
};

export const PENDING_TENANT_REGISTRATION_STORAGE_KEY =
  "kyra.pending.tenant.registration";
export const PENDING_TENANT_REGISTRATION_SHARED_STORAGE_KEY =
  "kyra.pending.tenant.registration.shared";
export const TENANT_EMAIL_VERIFIED_MARKER_STORAGE_KEY =
  "kyra.pending.tenant.email_verified";

const PENDING_TENANT_REGISTRATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const firebaseAuth = getFirebaseAuth();

const getVerificationContinueUrl = (email: string) => {
  if (typeof window === "undefined") {
    return "http://localhost:3000/verifikasi-email";
  }

  const params = new URLSearchParams({
    email,
    source: "firebase",
  });

  return `${window.location.origin}/verifikasi-email?${params.toString()}`;
};

const verificationActionSettings = (email: string) => ({
  url: getVerificationContinueUrl(email),
  handleCodeInApp: false,
});

const withSessionPersistence = async () => {
  await setFirebaseSessionPersistence();
};

const signInPendingUser = async (
  email: string,
  password: string
): Promise<User> => {
  await withSessionPersistence();

  const currentUser = firebaseAuth.currentUser;
  if (currentUser?.email?.toLowerCase() === email.toLowerCase()) {
    return currentUser;
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user;
};

export const savePendingTenantRegistration = (
  data: PendingTenantRegistration
) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredPendingTenantRegistration = {
    ...data,
    savedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(payload);

  window.sessionStorage.setItem(
    PENDING_TENANT_REGISTRATION_STORAGE_KEY,
    serialized
  );
  window.localStorage.setItem(
    PENDING_TENANT_REGISTRATION_SHARED_STORAGE_KEY,
    serialized
  );
};

const parsePendingTenantRegistration = (
  raw: string | null
): PendingTenantRegistration | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredPendingTenantRegistration;

    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.password !== "string" ||
      typeof parsed.phoneNumber !== "string"
    ) {
      return null;
    }

    if (parsed.savedAt) {
      const savedAtTime = Date.parse(parsed.savedAt);

      if (
        Number.isNaN(savedAtTime) ||
        Date.now() - savedAtTime > PENDING_TENANT_REGISTRATION_MAX_AGE_MS
      ) {
        return null;
      }
    }

    return {
      fullName: parsed.fullName,
      email: parsed.email,
      password: parsed.password,
      phoneNumber: parsed.phoneNumber,
    };
  } catch {
    return null;
  }
};

export const loadPendingTenantRegistration = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionRaw = window.sessionStorage.getItem(
    PENDING_TENANT_REGISTRATION_STORAGE_KEY
  );
  const sessionRegistration = parsePendingTenantRegistration(sessionRaw);

  if (sessionRegistration) {
    return sessionRegistration;
  }

  if (sessionRaw) {
    window.sessionStorage.removeItem(PENDING_TENANT_REGISTRATION_STORAGE_KEY);
  }

  const sharedRaw = window.localStorage.getItem(
    PENDING_TENANT_REGISTRATION_SHARED_STORAGE_KEY
  );
  const sharedRegistration = parsePendingTenantRegistration(sharedRaw);

  if (!sharedRegistration) {
    if (sharedRaw) {
      window.localStorage.removeItem(
        PENDING_TENANT_REGISTRATION_SHARED_STORAGE_KEY
      );
    }

    return null;
  }

  window.sessionStorage.setItem(
    PENDING_TENANT_REGISTRATION_STORAGE_KEY,
    JSON.stringify({
      ...sharedRegistration,
      savedAt: new Date().toISOString(),
    })
  );

  return sharedRegistration;
};

export const clearPendingTenantRegistration = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_TENANT_REGISTRATION_STORAGE_KEY);
  window.localStorage.removeItem(PENDING_TENANT_REGISTRATION_SHARED_STORAGE_KEY);
};

export const markTenantEmailVerified = (email: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    TENANT_EMAIL_VERIFIED_MARKER_STORAGE_KEY,
    JSON.stringify({
      email: email.trim().toLowerCase(),
      verifiedAt: new Date().toISOString(),
    })
  );
};

export const consumeTenantEmailVerifiedMarker = (email?: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = window.localStorage.getItem(
    TENANT_EMAIL_VERIFIED_MARKER_STORAGE_KEY
  );

  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase();

    if (normalizedEmail && parsed.email !== normalizedEmail) {
      return false;
    }

    window.localStorage.removeItem(TENANT_EMAIL_VERIFIED_MARKER_STORAGE_KEY);
    return true;
  } catch {
    window.localStorage.removeItem(TENANT_EMAIL_VERIFIED_MARKER_STORAGE_KEY);
    return false;
  }
};

export const startTenantEmailVerification = async (
  email: string,
  password: string
) => {
  await withSessionPersistence();

  try {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );
    await sendEmailVerification(
      credential.user,
      verificationActionSettings(email)
    );
    return credential.user;
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === "auth/email-already-in-use"
    ) {
      const signInMethods = await fetchSignInMethodsForEmail(firebaseAuth, email);

      if (signInMethods.includes("password")) {
        const user = await signInPendingUser(email, password);

        if (!user.emailVerified) {
          await sendEmailVerification(user, verificationActionSettings(email));
        }

        return user;
      }
    }

    throw error;
  }
};

export const resendTenantEmailVerification = async (
  email: string,
  password: string
) => {
  const user = await signInPendingUser(email, password);
  await sendEmailVerification(user, verificationActionSettings(email));
};

export const checkTenantEmailVerification = async (
  email: string,
  password: string
) => {
  const user = await signInPendingUser(email, password);
  await reload(user);
  return user.emailVerified;
};

export const completeTenantEmailAction = async (oobCode: string) => {
  const actionInfo = await checkActionCode(firebaseAuth, oobCode);
  const email = actionInfo.data.email?.trim().toLowerCase() || "";

  await applyActionCode(firebaseAuth, oobCode);

  if (email) {
    markTenantEmailVerified(email);
  }

  return email;
};

export const clearTenantEmailVerificationSession = async (
  email?: string,
  password?: string
) => {
  let currentUser = firebaseAuth.currentUser;

  if (!currentUser && email && password) {
    try {
      currentUser = await signInPendingUser(email, password);
    } catch {
      return;
    }
  }

  if (!currentUser) {
    return;
  }

  try {
    await deleteUser(currentUser);
    return;
  } catch {
    await signOut(firebaseAuth);
  }
};

export const getTenantEmailVerificationErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (!(error instanceof FirebaseError)) {
    return fallback;
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "Email ini sudah dipakai pada proses verifikasi lain. Silakan gunakan email lain atau lanjutkan verifikasi yang sebelumnya.";
    case "auth/invalid-email":
      return "Alamat email tidak valid.";
    case "auth/invalid-continue-uri":
      return "Tautan lanjutan verifikasi email tidak valid. Periksa pengaturan URL verifikasi di Firebase.";
    case "auth/unauthorized-continue-uri":
      return "Domain website ini belum diizinkan di Firebase Authentication. Tambahkan domain website ke daftar Authorized domains.";
    case "auth/unauthorized-domain":
      return "Domain website ini belum diizinkan untuk memakai Firebase Authentication.";
    case "auth/operation-not-allowed":
      return "Metode masuk Email/Password belum diaktifkan di Firebase Authentication.";
    case "auth/app-not-authorized":
      return "Aplikasi ini belum diizinkan memakai konfigurasi Firebase yang sedang dipakai.";
    case "auth/invalid-api-key":
      return "API key Firebase tidak valid. Periksa konfigurasi Firebase pada deployment.";
    case "auth/weak-password":
      return "Kata sandi terlalu lemah untuk proses verifikasi email.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    case "auth/network-request-failed":
      return "Gagal terhubung ke Firebase. Periksa koneksi internet lalu coba lagi.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Sesi verifikasi email tidak ditemukan. Silakan daftar ulang.";
    default:
      return fallback;
  }
};
