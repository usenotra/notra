import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { ONBOARDING_SUGGESTION_SKELETON_ROWS } from "@/constants/onboarding";

export function BrandReviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <ul className="space-y-1.5">
          {ONBOARDING_SUGGESTION_SKELETON_ROWS.map((row) => (
            <li
              className="border-input flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
              key={row}
            >
              <span className="flex-1">
                <Skeleton className="h-4 w-full" />
              </span>
              <Skeleton className="size-6 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
