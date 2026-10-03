"use client";

import dynamic from "next/dynamic";

/**
 * Confetti only plays after an action, so it loads on demand instead of
 * shipping in the shared dashboard bundle.
 */
export const Confetti = dynamic(
  () => import("@neoconfetti/react").then((module) => module.Confetti),
  { ssr: false }
);
