"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import dynamic from "next/dynamic";

/**
 * `@pierre/diffs` pulls in shiki and registers a custom element, so it stays
 * out of the server render and out of the initial bundle.
 */
export const LazySkillDiff = dynamic(
  () => import("./skill-diff").then((module) => module.SkillDiff),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  }
);
