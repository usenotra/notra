"use client";

import {
  CODEX_BULLET_BLINK_MS,
  CODEX_COLORS,
  CODEX_ROW_CLASS,
  CODEX_SHIMMER_MS,
} from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexWorkingProps } from "@notra/ui/types/codex-skin";
import { useEffect, useRef } from "react";

const SHIMMER_GRADIENT = `linear-gradient(90deg, ${CODEX_COLORS.dim} 0%, ${CODEX_COLORS.dim} 35%, ${CODEX_COLORS.foreground} 50%, ${CODEX_COLORS.dim} 65%, ${CODEX_COLORS.dim} 100%)`;

export function CodexWorking({
  label = "Working",
  elapsed = "0s",
  className,
}: CodexWorkingProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const bulletRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const shimmer = labelRef.current?.animate(
      [{ backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0" }],
      { duration: CODEX_SHIMMER_MS, iterations: Number.POSITIVE_INFINITY }
    );
    const blink = bulletRef.current?.animate(
      [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }],
      { duration: CODEX_BULLET_BLINK_MS, iterations: Number.POSITIVE_INFINITY }
    );
    return () => {
      shimmer?.cancel();
      blink?.cancel();
    };
  }, []);

  return (
    <div
      className={cn(CODEX_ROW_CLASS, className)}
      role="status"
      style={{ color: CODEX_COLORS.dim }}
    >
      <span
        aria-hidden="true"
        ref={bulletRef}
        style={{ color: CODEX_COLORS.foreground }}
      >
        •
      </span>
      <p className="min-w-0 truncate">
        <span
          ref={labelRef}
          style={{
            backgroundClip: "text",
            backgroundImage: SHIMMER_GRADIENT,
            backgroundPosition: "100% 0",
            backgroundSize: "300% 100%",
            color: "transparent",
            WebkitBackgroundClip: "text",
          }}
        >
          {label}
        </span>{" "}
        ({elapsed} •{" "}
        <span className="font-bold" style={{ color: CODEX_COLORS.foreground }}>
          esc
        </span>{" "}
        to interrupt)
      </p>
    </div>
  );
}
