"use client";

import { useEffect, useRef, useState } from "react";

type RevealOnScrollProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  offsetY?: number;
  once?: boolean;
};

export default function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
  offsetY = 22,
  once = true,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      style={
        {
          "--reveal-delay": `${delayMs}ms`,
          "--reveal-y": `${offsetY}px`,
        } as React.CSSProperties
      }
      className={`scroll-reveal ${isVisible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
