"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import dynamic from "next/dynamic";

export const LazyContentActivityCard = dynamic(
  () =>
    import("@/components/dashboard/content-activity-card").then(
      (module) => module.ContentActivityCard
    ),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-lg" />,
    ssr: false,
  }
);
