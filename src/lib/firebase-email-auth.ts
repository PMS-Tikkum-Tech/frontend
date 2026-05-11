"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export type FirebaseEmailRegisterResult = {
  idToken: string;
  email: string;
};

export const registerWithFirebaseEmail = async (
  email: string,
  password: string
): Promise<FirebaseEmailRegisterResult> => {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  const idToken = await credential.user.getIdToken();
  // Sign out locally — user re-authenticates after verifying email
  await signOut(auth);
  return { idToken, email };
};

export const loginWithFirebaseEmail = async (
  email: string,
  password: string
): Promise<{ user: FirebaseUser; idToken: string; emailVerified: boolean }> => {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await credential.user.reload();
  const emailVerified = credential.user.emailVerified;
  // Force-refresh so token carries up-to-date email_verified claim
  const idToken = await credential.user.getIdToken(true);
  if (!emailVerified) {
    await signOut(auth);
  }
  return { user: credential.user, idToken, emailVerified };
};

export const resendFirebaseVerificationEmail = async (
  email: string,
  password: string
): Promise<void> => {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  await signOut(auth);
};

export const getFirebaseAuthErrorMessage = (error: unknown): string => {
  if (error !== null && typeof error === "object" && "code" in error) {
    switch ((error as { code: string }).code) {
      case "auth/email-already-in-use":
        return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
      case "auth/invalid-email":
        return "Format email tidak valid.";
      case "auth/weak-password":
        return "Kata sandi terlalu lemah. Minimal 6 karakter.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Email atau kata sandi salah.";
      case "auth/user-disabled":
        return "Akun ini telah dinonaktifkan.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Coba lagi nanti.";
      case "auth/network-request-failed":
        return "Koneksi gagal. Periksa koneksi internet Anda.";
      default:
        return "Terjadi kesalahan autentikasi. Silakan coba lagi.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan autentikasi.";
};
