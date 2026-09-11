"use client";

import { Confetti } from "@neoconfetti/react";

export function ContactFormSuccess() {
  return (
    <div
      aria-live="polite"
      className="relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-[#ECECEC] bg-white px-6 py-16 text-center shadow-[0_0.0625rem_0.1875rem_#28282814] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none"
    >
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2">
        <Confetti
          colors={[
            "var(--primary)",
            "#FFC700",
            "#FF6B6B",
            "#41BBC7",
            "#A78BFA",
            "#34D399",
          ]}
          duration={3000}
          force={0.5}
          particleCount={120}
          particleShape="mix"
          particleSize={8}
          stageHeight={500}
          stageWidth={800}
        />
      </div>
      <h3 className="font-display relative text-2xl font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
        Message sent
      </h3>
      <p className="relative max-w-md font-sans text-[0.9375rem] leading-6 text-pretty text-[#1E1E1EBF] dark:text-white/70">
        Thanks for reaching out. A real human will write back, usually within
        one business day.
      </p>
    </div>
  );
}
