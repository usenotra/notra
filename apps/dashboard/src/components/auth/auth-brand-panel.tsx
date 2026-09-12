"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { TestimonialCarousel } from "@/components/auth/testimonial-carousel";
import { AUTH_SPLIT_PANEL_MIN_WIDTH } from "@/constants/auth-split-panel";

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
  const [canMountDithering, setCanMountDithering] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${AUTH_SPLIT_PANEL_MIN_WIDTH})`
    );
    const onChange = () => {
      setCanMountDithering(mediaQuery.matches);
    };
    onChange();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(200deg,#a78bfa_0%,#7c3aed_55%,#5b21b6_100%)] p-14">
      {shouldReduceMotion || !canMountDithering ? null : (
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
