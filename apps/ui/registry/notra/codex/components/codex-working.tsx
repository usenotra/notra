"use client";

import { cn } from "cn";
import { useEffect, useRef } from "react";

import {
  CODEX_BULLET_BLINK_MS,
  CODEX_ROW_CLASS,
  CODEX_SHIMMER_MS,
} from "../constants/codex";
import type { CodexWorkingProps } from "../types/codex";

export const CodexWorking = ({
  className,
  elapsed = "0s",
  label = "Working",
  ...props
}: CodexWorkingProps) => {
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
      className={cn(CODEX_ROW_CLASS, "text-codex-dim", className)}
      data-slot="codex-working"
      role="status"
      {...props}
    >
      <span aria-hidden="true" className="text-codex-fg" ref={bulletRef}>
        •
      </span>
      <p className="min-w-0 truncate">
        <span
          className="bg-[linear-gradient(90deg,var(--codex-dim)_35%,var(--codex-fg)_50%,var(--codex-dim)_65%)] bg-size-[300%_100%] bg-clip-text bg-position-[100%_0] text-transparent"
          ref={labelRef}
        >
          {label}
        </span>{" "}
        ({elapsed} • <span className="text-codex-fg font-bold">esc</span> to
        interrupt)
      </p>
    </div>
  );
};
