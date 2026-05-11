"use client";

import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

const EMAIL_FOR_SIGN_IN_KEY = "kikost.emailForSignIn";

export type FirebaseEmailSignInResult = {
  idToken: string;
  email: string;
};

export const sendEmailSignInLink = async (email: string): Promise<void> => {
  const auth = getFirebaseAuth();
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/auth/selesai-daftar`,
    handleCodeInApp: true,
  });
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
};

export const isEmailSignInLink = (href: string): boolean => {
  const auth = getFirebaseAuth();
  return isSignInWithEmailLink(auth, href);
};

export const completeEmailSignInLink = async (
  href: string
): Promise<FirebaseEmailSignInResult> => {
  const auth = getFirebaseAuth();
  const storedEmail = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  if (!storedEmail) {
    throw new Error(
      "Email tidak ditemukan. Coba daftar ulang dari perangkat yang sama."
    );
  }
  const credential = await signInWithEmailLink(auth, storedEmail, href);
  const idToken = await credential.user.getIdToken();
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  await signOut(auth);
  return { idToken, email: storedEmail };
};

export const loginWithFirebaseEmail = async (
  email: string,
  password: string
): Promise<{ user: FirebaseUser; idToken: string; emailVerified: boolean }> => {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await credential.user.reload();
  const emailVerified = credential.user.emailVerified;
  const idToken = await credential.user.getIdToken(true);
  if (!emailVerified) {
    await signOut(auth);
  }
  return { user: credential.user, idToken, emailVerified };
};

export const isFirebaseUserNotFoundError = (error: unknown): boolean => {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "auth/user-not-found" || code === "auth/invalid-credential";
  }
  return false;
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
      case "auth/operation-not-allowed":
        return "Metode masuk ini belum diaktifkan. Hubungi administrator.";
      case "auth/expired-action-code":
      case "auth/invalid-action-code":
        return "Tautan sudah kadaluarsa atau tidak valid. Minta tautan baru.";
      default:
        return "Terjadi kesalahan autentikasi. Silakan coba lagi.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan autentikasi.";
};
