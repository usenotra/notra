"use client";

import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import {
  INTEGRATION_CARD_DITHER_FADE_OUT_DURATION,
  INTEGRATION_CARD_DITHER_HEX_COLOR_PATTERN,
} from "@/lib/integrations/constants";
import type {
  IntegrationCardDitherInteraction,
  IntegrationCardDitherProps,
} from "@/types/integrations";
import dynamic from "@/utils/lazy-component";

const Dithering = dynamic(
  () =>
    import("@paper-design/shaders-react").then((module_) => module_.Dithering),
  { ssr: false }
);

export function useIntegrationCardDither(
  enabled = true
): IntegrationCardDitherInteraction {
  const [pointerActive, setPointerActive] = useState(false);
  const [focusActive, setFocusActive] = useState(false);

  return {
    active: enabled && (pointerActive || focusActive),
    interactionProps: {
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusActive(false);
        }
      },
      onFocus: () => setFocusActive(true),
      onPointerEnter: () => setPointerActive(true),
      onPointerLeave: () => setPointerActive(false),
    },
  };
}

export function IntegrationCardDither({
  active,
  color,
}: IntegrationCardDitherProps) {
  const shouldReduceMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(active);
  const colorFront = INTEGRATION_CARD_DITHER_HEX_COLOR_PATTERN.test(color)
    ? `${color}26`
    : color;

  useEffect(() => {
    if (active) {
      setShouldRender(true);
      return;
    }

    const timeout = setTimeout(
      () => setShouldRender(false),
      INTEGRATION_CARD_DITHER_FADE_OUT_DURATION
    );
    return () => clearTimeout(timeout);
  }, [active]);

  return (
    <div
      className={cn(
        "duration-slow h-full w-full opacity-0 transition-opacity",
        active && "opacity-100"
      )}
    >
      {shouldRender ? (
        <Dithering
          className="absolute top-0 left-0 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2"
          colorBack="#00000000"
          colorFront={colorFront}
          scale={0.74}
          shape="wave"
          size={4}
          speed={shouldReduceMotion ? 0 : 0.5}
          type="4x4"
        />
      ) : null}
    </div>
  );
}
