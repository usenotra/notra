"use client";

import dynamic from "next/dynamic";

import { GeoPromptAnswerSkeleton } from "@/components/geo/geo-prompt-answer-skeleton";

// Markdown renderer (~138 kB gz) stays off the dashboard shell until a prompt
// answer sheet actually opens.
export const LazyGeoPromptAnswerThread = dynamic(
  () =>
    import("@/components/geo/geo-prompt-answer-thread").then(
      (module) => module.GeoPromptAnswerThread
    ),
  {
    ssr: false,
    loading: () => <GeoPromptAnswerSkeleton view="raw" />,
  }
);
