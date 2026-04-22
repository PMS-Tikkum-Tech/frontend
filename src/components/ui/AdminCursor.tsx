"use client";

import { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, label, [role='button']";

export default function AdminCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!finePointer.matches || reducedMotion.matches) {
      return undefined;
    }

    const updateCursor = () => {
      const { x, y } = positionRef.current;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${x - 4}px, ${y - 4}px, 0)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${x - 18}px, ${
          y - 18
        }px, 0)`;
      }

      rafRef.current = null;
    };

    const scheduleUpdate = () => {
      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(updateCursor);
    };

    const handlePointerMove = (event: PointerEvent) => {
      positionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      setIsVisible(true);
      setIsInteractive(
        event.target instanceof Element &&
          Boolean(event.target.closest(INTERACTIVE_SELECTOR))
      );
      scheduleUpdate();
    };

    const handlePointerLeave = () => setIsVisible(false);
    const handlePointerDown = () => setIsPressed(true);
    const handlePointerUp = () => setIsPressed(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className={`pointer-events-none fixed left-0 top-0 z-[9999] hidden h-9 w-9 rounded-full border border-emerald-600/80 shadow-[0_0_20px_rgba(22,163,74,0.32)] transition-[opacity,transform,border-color,background-color] duration-150 ease-out md:block ${
          isVisible ? "opacity-100" : "opacity-0"
        } ${
          isInteractive
            ? "scale-125 border-emerald-600 bg-emerald-500/15"
            : "scale-100 bg-transparent"
        } ${isPressed ? "scale-90" : ""}`}
      />
      <div
        ref={dotRef}
        className={`pointer-events-none fixed left-0 top-0 z-[10000] hidden h-2 w-2 rounded-full bg-emerald-600 shadow-[0_0_10px_rgba(22,163,74,0.65)] transition-[opacity,transform] duration-100 ease-out md:block ${
          isVisible ? "opacity-100" : "opacity-0"
        } ${isInteractive ? "scale-75" : "scale-100"} ${
          isPressed ? "scale-125" : ""
        }`}
      />
    </>
  );
}
