"use client";

import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";

import { TestimonialCarousel } from "@/components/auth/testimonial-carousel";

// Shader background: client-only and skipped entirely for reduced motion, so the
// WebGL bundle never reaches the auth forms' critical path.
const Dithering = dynamic(
  () =>
    import("@paper-design/shaders-react").then((module) => module.Dithering),
  { ssr: false }
);

const DITHERING_SCALE = 0.74;
const DITHERING_SIZE = 11;
const DITHERING_SPEED = 0.5;

export function AuthBrandPanel() {
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(200deg,#a78bfa_0%,#7c3aed_55%,#5b21b6_100%)] p-14">
      {shouldReduceMotion ? null : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Dithering
            className="absolute top-[56.875rem] left-[calc(100%-38.75rem)] h-[49.0625rem] w-[56.625rem] origin-top-left rotate-[270deg] opacity-30"
            colorBack="#00000000"
            colorFront="#ffffff3d"
            scale={DITHERING_SCALE}
            shape="wave"
            size={DITHERING_SIZE}
            speed={DITHERING_SPEED}
            type="4x4"
          />
        </div>
      )}
      <div className="relative">
        <TestimonialCarousel />
      </div>
    </div>
  );
}
