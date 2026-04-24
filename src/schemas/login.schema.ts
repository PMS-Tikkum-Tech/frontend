import { z } from "zod";
import { EMAIL_MAX_LENGTH } from "@/lib/form-validation";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .max(EMAIL_MAX_LENGTH, "Email terlalu panjang"),

  password: z
    .string()
    .min(1, "Kata sandi wajib diisi.")
    .max(100, "Kata sandi terlalu panjang."),
});
