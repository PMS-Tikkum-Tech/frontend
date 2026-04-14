"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* OVERLAY */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ duration: 0.35 }}
            className="relative bg-white w-full max-w-4xl h-[560px] rounded-2xl overflow-hidden shadow-2xl flex"
          >
            {/* LEFT IMAGE */}
            <div className="hidden md:block w-1/2 relative">
              <Image
                src="/bg.jpg"
                alt="Auth"
                fill
                className="object-cover"
                priority
              />

              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-center px-8">
                {mode === "login" ? (
                  <>
                    <h2 className="text-2xl font-semibold mb-4">
                      Belum punya akun?
                    </h2>

                    <button
                      onClick={() => setMode("register")}
                      className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:scale-105 transition"
                    >
                      Daftar
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold mb-4">
                      Sudah punya akun?
                    </h2>

                    <button
                      onClick={() => setMode("login")}
                      className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:scale-105 transition"
                    >
                      Masuk
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT FORM */}
            <div className="w-full md:w-1/2 flex items-center justify-center relative">
              {/* CLOSE BUTTON */}
              <button
                onClick={onClose}
                className="absolute top-5 right-6 text-gray-400 hover:text-black text-xl"
              >
                ✕
              </button>

              <div className="w-full max-w-sm px-6">
                {/* LOGO */}
                <div className="flex justify-center mb-8">
                  <Image
                    src="/logo-kikost.jpeg"
                    alt="KiKost"
                    width={160}
                    height={40}
                    className="h-11 w-auto rounded-sm object-contain"
                  />
                </div>

                <AnimatePresence mode="wait">
                  {mode === "login" ? (
                    <motion.div
                      key="login"
                      initial={{ x: 60, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -60, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <LoginForm />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ x: -60, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 60, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <RegisterForm />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
