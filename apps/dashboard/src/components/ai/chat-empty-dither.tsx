"use client";

import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  CHAT_EMPTY_DITHER_COLORS_DARK,
  CHAT_EMPTY_DITHER_COLORS_LIGHT,
  CHAT_EMPTY_DITHER_DEFER_MS,
  CHAT_EMPTY_DITHER_REVEAL_FALLBACK_MS,
  CHAT_EMPTY_DITHER_SCALE,
  CHAT_EMPTY_DITHER_SHAPE,
  CHAT_EMPTY_DITHER_SIZE,
  CHAT_EMPTY_DITHER_SPEED,
  CHAT_EMPTY_DITHER_TYPE,
} from "@/constants/chat-empty-dither";
import type { ChatEmptyDitherProps } from "@/types/components/chat-empty-dither";

const Dithering = dynamic(
  () =>
    import("@paper-design/shaders-react").then((module_) => module_.Dithering),
  { ssr: false }
);

export function ChatEmptyDither({ className }: ChatEmptyDitherProps) {
  const { resolvedTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const shaderRef = useRef<HTMLDivElement>(null);
  const [shaderReady, setShaderReady] = useState(false);
  const [shaderRevealed, setShaderRevealed] = useState(false);
  const instantReveal = shouldReduceMotion === true;
  const shaderVisible = instantReveal || shaderRevealed;
  const colors =
    resolvedTheme === "dark"
      ? CHAT_EMPTY_DITHER_COLORS_DARK
      : CHAT_EMPTY_DITHER_COLORS_LIGHT;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShaderReady(true);
    }, CHAT_EMPTY_DITHER_DEFER_MS);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!shaderReady || instantReveal) {
      return;
    }

    const root = shaderRef.current;
    if (!root) {
      return;
    }

    let frame = 0;
    const observer = new MutationObserver(() => {
      if (root.querySelector("canvas")) {
        observer.disconnect();
        frame = window.requestAnimationFrame(() => {
          setShaderRevealed(true);
        });
      }
    });
    const fallback = window.setTimeout(() => {
      observer.disconnect();
      setShaderRevealed(true);
    }, CHAT_EMPTY_DITHER_REVEAL_FALLBACK_MS);

    observer.observe(root, { childList: true, subtree: true });
    if (root.querySelector("canvas")) {
      observer.disconnect();
      window.clearTimeout(fallback);
      frame = window.requestAnimationFrame(() => {
        setShaderRevealed(true);
      });
    }

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
      window.cancelAnimationFrame(frame);
    };
  }, [instantReveal, shaderReady]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent_88%)] opacity-60",
        className
      )}
    >
      {shaderReady ? (
        <div
          className={cn(
            "size-full min-h-full min-w-full",
            !instantReveal &&
              "duration-slow ease-emphasized transition-opacity",
            instantReveal || shaderVisible ? "opacity-100" : "opacity-0"
          )}
          ref={shaderRef}
        >
          <Dithering
            className="size-full min-h-full min-w-full"
            colorBack={colors.colorBack}
            colorFront={colors.colorFront}
            scale={CHAT_EMPTY_DITHER_SCALE}
            shape={CHAT_EMPTY_DITHER_SHAPE}
            size={CHAT_EMPTY_DITHER_SIZE}
            speed={shouldReduceMotion ? 0 : CHAT_EMPTY_DITHER_SPEED}
            type={CHAT_EMPTY_DITHER_TYPE}
          />
        </div>
      ) : null}
    </div>
  );
}
