import { z } from "zod";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getEmailValidationMessage,
  getPhoneValidationMessage,
  isStrongPassword,
} from "@/lib/form-validation";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Nama lengkap minimal terdiri dari 2 karakter.")
      .max(100, "Nama lengkap maksimal 100 karakter."),

    email: z
      .string()
      .trim()
      .max(EMAIL_MAX_LENGTH, "Alamat email terlalu panjang.")
      .refine((value) => !getEmailValidationMessage(value), {
        message: "Masukkan alamat email yang valid.",
      }),

    phoneNumber: z
      .string()
      .trim()
      .refine(
        (value) => !getPhoneValidationMessage(value, { required: true }),
        {
          message:
            "Nomor HP harus berupa nomor ponsel Indonesia yang valid, misalnya 081234567890.",
        }
      ),

    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "Kata sandi minimal terdiri dari 8 karakter.")
      .max(PASSWORD_MAX_LENGTH)
      .refine(isStrongPassword, {
        message:
          "Kata sandi harus mengandung huruf besar, huruf kecil, dan angka.",
      }),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak sesuai.",
    path: ["confirmPassword"],
  });
