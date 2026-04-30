import { z } from "zod";
import {
  EMAIL_MAX_LENGTH,
  getEmailValidationMessage,
} from "@/lib/form-validation";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX_LENGTH, "Email terlalu panjang")
    .refine((value) => !getEmailValidationMessage(value), {
      message: "Masukkan alamat email yang valid.",
    }),

  password: z
    .string()
    .min(1, "Kata sandi wajib diisi.")
    .max(100, "Kata sandi terlalu panjang."),
});
