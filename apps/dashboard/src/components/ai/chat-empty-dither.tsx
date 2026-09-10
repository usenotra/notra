"use client";

import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

import {
  CHAT_EMPTY_DITHER_COLORS_DARK,
  CHAT_EMPTY_DITHER_COLORS_LIGHT,
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
  const colors =
    resolvedTheme === "dark"
      ? CHAT_EMPTY_DITHER_COLORS_DARK
      : CHAT_EMPTY_DITHER_COLORS_LIGHT;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent_88%)]",
        className
      )}
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
  );
}
