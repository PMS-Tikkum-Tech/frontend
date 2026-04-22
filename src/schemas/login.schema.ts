import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Format email tidak valid")
    .max(100, "Email terlalu panjang"),

  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});
