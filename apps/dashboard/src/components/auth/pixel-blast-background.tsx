"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Matches the auth layout `hidden lg:flex` column so Three never mounts in a
// `display: none` ancestor (phones and tablets below the lg breakpoint).
const AUTH_PIXEL_BLAST_MIN_WIDTH_PX = 1024;

// three.js + postprocessing (~128 kB gz) for a decorative background: client-only
// and never on the critical path of the auth forms.
const PixelBlast = dynamic(() => import("@/components/PixelBlast"), {
  ssr: false,
});

const PATTERN_DENSITY = 1.5;
const PATTERN_SPEED = 0.5;

export function PixelBlastBackground() {
  const shouldReduceMotion = useReducedMotion();
  const [isDesktopLg, setIsDesktopLg] = useState<boolean | undefined>(
    undefined
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${AUTH_PIXEL_BLAST_MIN_WIDTH_PX}px)`
    );
    const onChange = () => {
      setIsDesktopLg(mediaQuery.matches);
    };
    onChange();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  if (shouldReduceMotion || isDesktopLg !== true) {
    return null;
  }

  return (
    <PixelBlast
      color="#8b5cf6"
      edgeFade={0}
      patternDensity={PATTERN_DENSITY}
      patternScale={1}
      speed={PATTERN_SPEED}
    />
  );
}
