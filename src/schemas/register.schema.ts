import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Nama lengkap minimal terdiri dari 2 karakter.")
      .max(100, "Nama lengkap maksimal 100 karakter."),

    email: z
      .string()
      .email("Format alamat email tidak valid.")
      .max(100, "Alamat email terlalu panjang."),

    phoneNumber: z
      .string()
      .min(10, "Nomor HP minimal 10 digit.")
      .max(20, "Nomor HP terlalu panjang.")
      .regex(/^[0-9+\-\s]+$/, "Nomor HP hanya boleh berisi angka."),

    password: z
      .string()
      .min(8, "Kata sandi minimal terdiri dari 8 karakter.")
      .max(100),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak sesuai.",
    path: ["confirmPassword"],
  });
